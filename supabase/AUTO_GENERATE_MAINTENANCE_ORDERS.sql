-- ============================================
-- AUTO-GENERATE SERVICE ORDERS FROM MAINTENANCE SCHEDULE
-- Sistem otomatis untuk follow-up jadwal maintenance
-- ============================================

-- ================================================
-- PART 1: Add tracking columns
-- ================================================

-- Add columns to track auto-generation
ALTER TABLE property_maintenance_schedules 
  ADD COLUMN IF NOT EXISTS auto_generate_orders BOOLEAN DEFAULT TRUE;

ALTER TABLE property_maintenance_schedules 
  ADD COLUMN IF NOT EXISTS days_before_reminder INT DEFAULT 7;

ALTER TABLE property_maintenance_schedules
  ADD COLUMN IF NOT EXISTS last_order_generated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN property_maintenance_schedules.auto_generate_orders IS 
'TRUE = automatically create service orders based on schedule';

COMMENT ON COLUMN property_maintenance_schedules.days_before_reminder IS 
'Number of days before next_scheduled_date to create order. Default: 7 days';

-- ================================================
-- PART 2: Function to calculate next scheduled date
-- ================================================

CREATE OR REPLACE FUNCTION calculate_next_maintenance_date(
  p_last_date DATE,
  p_frequency TEXT,
  p_custom_interval_days INT DEFAULT NULL
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_date DATE;
BEGIN
  CASE p_frequency
    WHEN 'monthly' THEN
      v_next_date := p_last_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      v_next_date := p_last_date + INTERVAL '3 months';
    WHEN 'semi_annual' THEN
      v_next_date := p_last_date + INTERVAL '6 months';
    WHEN 'annual' THEN
      v_next_date := p_last_date + INTERVAL '1 year';
    WHEN 'custom' THEN
      v_next_date := p_last_date + (COALESCE(p_custom_interval_days, 30) || ' days')::INTERVAL;
    ELSE
      v_next_date := p_last_date + INTERVAL '1 month';
  END CASE;
  
  RETURN v_next_date;
END;
$$;

-- ================================================
-- PART 3: Function to auto-generate service order
-- ================================================

CREATE OR REPLACE FUNCTION auto_generate_maintenance_order(
  p_schedule_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule RECORD;
  v_order_id UUID;
  v_unit_ids UUID[];
  v_unit_count INT;
BEGIN
  -- Get schedule details
  SELECT * INTO v_schedule
  FROM property_maintenance_schedules
  WHERE id = p_schedule_id
    AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found or inactive';
  END IF;
  
  -- Determine which units to include
  IF v_schedule.apply_to_all_units THEN
    SELECT array_agg(id) INTO v_unit_ids
    FROM ac_units
    WHERE property_id = v_schedule.property_id;
  ELSE
    v_unit_ids := v_schedule.selected_unit_ids;
  END IF;
  
  v_unit_count := array_length(v_unit_ids, 1);
  
  -- Create service order
  INSERT INTO service_orders (
    tenant_id,
    client_id,
    order_type,
    status,
    scheduled_date,
    title,
    description,
    property_id,
    priority,
    estimated_duration_hours,
    created_from_schedule,
    maintenance_schedule_id
  ) VALUES (
    v_schedule.tenant_id,
    v_schedule.client_id,
    'perawatan',
    'pending',
    v_schedule.next_scheduled_date,
    'Scheduled Maintenance - ' || (SELECT property_name FROM client_properties WHERE id = v_schedule.property_id),
    'Auto-generated from maintenance schedule. ' || 
    COALESCE(v_schedule.special_instructions, '') || E'\n\n' ||
    'Frequency: ' || v_schedule.frequency || E'\n' ||
    'Units: ' || COALESCE(v_unit_count::TEXT, '0') || ' AC units',
    v_schedule.property_id,
    'medium',
    CASE 
      WHEN v_unit_count <= 5 THEN 2
      WHEN v_unit_count <= 10 THEN 4
      WHEN v_unit_count <= 20 THEN 6
      ELSE 8
    END,
    TRUE,
    p_schedule_id
  ) RETURNING id INTO v_order_id;
  
  -- Link AC units to order
  IF v_unit_ids IS NOT NULL THEN
    INSERT INTO service_order_units (service_order_id, ac_unit_id)
    SELECT v_order_id, unnest(v_unit_ids);
  END IF;
  
  -- Update schedule tracking
  UPDATE property_maintenance_schedules
  SET 
    last_order_generated_at = NOW(),
    last_generated_date = v_schedule.next_scheduled_date,
    next_scheduled_date = calculate_next_maintenance_date(
      v_schedule.next_scheduled_date,
      v_schedule.frequency,
      v_schedule.custom_interval_days
    ),
    updated_at = NOW()
  WHERE id = p_schedule_id;
  
  RETURN v_order_id;
END;
$$;

-- ================================================
-- PART 4: Function to check and generate orders
-- ================================================

CREATE OR REPLACE FUNCTION check_and_generate_maintenance_orders()
RETURNS TABLE (
  schedule_id UUID,
  order_id UUID,
  client_name TEXT,
  property_name TEXT,
  scheduled_date DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule RECORD;
  v_order_id UUID;
BEGIN
  -- Find schedules that need order generation
  FOR v_schedule IN
    SELECT 
      pms.*,
      c.name as client_name,
      cp.property_name
    FROM property_maintenance_schedules pms
    JOIN clients c ON c.id = pms.client_id
    JOIN client_properties cp ON cp.id = pms.property_id
    WHERE pms.is_active = TRUE
      AND pms.auto_generate_orders = TRUE
      AND pms.next_scheduled_date IS NOT NULL
      AND pms.next_scheduled_date <= CURRENT_DATE + (pms.days_before_reminder || ' days')::INTERVAL
      AND (
        pms.last_order_generated_at IS NULL 
        OR pms.last_generated_date < pms.next_scheduled_date
      )
  LOOP
    BEGIN
      -- Generate order
      v_order_id := auto_generate_maintenance_order(v_schedule.id);
      
      -- Return result
      schedule_id := v_schedule.id;
      order_id := v_order_id;
      client_name := v_schedule.client_name;
      property_name := v_schedule.property_name;
      scheduled_date := v_schedule.next_scheduled_date;
      RETURN NEXT;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to generate order for schedule %: %', v_schedule.id, SQLERRM;
        CONTINUE;
    END;
  END LOOP;
END;
$$;

-- ================================================
-- PART 5: Add columns to service_orders
-- ================================================

-- Track if order was created from schedule
ALTER TABLE service_orders 
  ADD COLUMN IF NOT EXISTS created_from_schedule BOOLEAN DEFAULT FALSE;

ALTER TABLE service_orders 
  ADD COLUMN IF NOT EXISTS maintenance_schedule_id UUID 
  REFERENCES property_maintenance_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_schedule 
  ON service_orders(maintenance_schedule_id) 
  WHERE maintenance_schedule_id IS NOT NULL;

-- ================================================
-- PART 6: Reschedule function
-- ================================================

CREATE OR REPLACE FUNCTION reschedule_maintenance_order(
  p_order_id UUID,
  p_new_date DATE,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule_id UUID;
BEGIN
  -- Get schedule ID from order
  SELECT maintenance_schedule_id INTO v_schedule_id
  FROM service_orders
  WHERE id = p_order_id;
  
  -- Update order
  UPDATE service_orders
  SET 
    scheduled_date = p_new_date,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Update schedule if linked
  IF v_schedule_id IS NOT NULL THEN
    UPDATE property_maintenance_schedules
    SET 
      next_scheduled_date = p_new_date,
      notes = COALESCE(notes, '') || E'\n' || 
              '[' || NOW()::DATE || '] Rescheduled: ' || COALESCE(p_reason, 'No reason provided'),
      updated_at = NOW()
    WHERE id = v_schedule_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- ================================================
-- PART 7: View for upcoming maintenance
-- ================================================

CREATE OR REPLACE VIEW v_upcoming_maintenance AS
SELECT 
  pms.id as schedule_id,
  pms.tenant_id,
  pms.client_id,
  c.name as client_name,
  pms.property_id,
  cp.property_name,
  cp.address as property_address,
  pms.frequency,
  pms.next_scheduled_date,
  pms.maintenance_type,
  pms.days_before_reminder,
  pms.is_active,
  -- Calculate days until maintenance
  (pms.next_scheduled_date - CURRENT_DATE) as days_until,
  -- Check if order already generated
  EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.maintenance_schedule_id = pms.id
      AND so.scheduled_date = pms.next_scheduled_date
      AND so.status NOT IN ('cancelled', 'completed')
  ) as order_exists,
  -- Get latest order if exists
  (
    SELECT so.id 
    FROM service_orders so
    WHERE so.maintenance_schedule_id = pms.id
      AND so.scheduled_date = pms.next_scheduled_date
    ORDER BY so.created_at DESC
    LIMIT 1
  ) as latest_order_id,
  -- Unit count
  CASE 
    WHEN pms.apply_to_all_units THEN 
      (SELECT COUNT(*) FROM ac_units WHERE property_id = pms.property_id)
    ELSE 
      array_length(pms.selected_unit_ids, 1)
  END as unit_count
FROM property_maintenance_schedules pms
JOIN clients c ON c.id = pms.client_id
JOIN client_properties cp ON cp.id = pms.property_id
WHERE pms.is_active = TRUE
  AND pms.next_scheduled_date IS NOT NULL
ORDER BY pms.next_scheduled_date ASC;

COMMENT ON VIEW v_upcoming_maintenance IS 
'View untuk melihat jadwal maintenance yang akan datang dengan status order';

-- ================================================
-- PART 8: Initialize next_scheduled_date for existing records
-- ================================================

UPDATE property_maintenance_schedules
SET next_scheduled_date = calculate_next_maintenance_date(
  COALESCE(last_generated_date, start_date, CURRENT_DATE),
  frequency,
  custom_interval_days
)
WHERE next_scheduled_date IS NULL
  AND is_active = TRUE;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Maintenance Auto-Generation System Created!';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Functions Created:';
  RAISE NOTICE '   - calculate_next_maintenance_date()';
  RAISE NOTICE '   - auto_generate_maintenance_order()';
  RAISE NOTICE '   - check_and_generate_maintenance_orders()';
  RAISE NOTICE '   - reschedule_maintenance_order()';
  RAISE NOTICE '';
  RAISE NOTICE '📊 View Created:';
  RAISE NOTICE '   - v_upcoming_maintenance';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Usage:';
  RAISE NOTICE '   -- Generate orders for schedules due within 7 days:';
  RAISE NOTICE '   SELECT * FROM check_and_generate_maintenance_orders();';
  RAISE NOTICE '';
  RAISE NOTICE '   -- View upcoming maintenance:';
  RAISE NOTICE '   SELECT * FROM v_upcoming_maintenance WHERE days_until <= 14;';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Reschedule order:';
  RAISE NOTICE '   SELECT reschedule_maintenance_order(order_uuid, ''2025-12-20'', ''Customer request'');';
  RAISE NOTICE '';
END $$;
