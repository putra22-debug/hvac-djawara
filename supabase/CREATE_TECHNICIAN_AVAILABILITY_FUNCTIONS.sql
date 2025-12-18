-- ============================================
-- TECHNICIAN AVAILABILITY & CONFLICT DETECTION
-- Prevent double-booking and check technician schedule
-- ============================================

-- Function: Check if technician is available in date range
CREATE OR REPLACE FUNCTION check_technician_availability(
  p_technician_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_order_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_available BOOLEAN,
  conflicting_orders JSONB
) AS $$
DECLARE
  v_conflicts JSONB;
  v_is_available BOOLEAN;
BEGIN
  -- Find all overlapping orders for this technician
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'order_id', so.id,
        'order_number', so.order_number,
        'service_title', so.service_title,
        'scheduled_date', so.scheduled_date,
        'estimated_end_date', COALESCE(so.estimated_end_date, so.scheduled_date),
        'client_name', c.name,
        'status', so.status
      )
    )
  INTO v_conflicts
  FROM service_orders so
  JOIN work_order_assignments woa ON woa.service_order_id = so.id
  LEFT JOIN clients c ON c.id = so.client_id
  WHERE woa.technician_id = p_technician_id
    AND so.status NOT IN ('completed', 'cancelled')
    AND (p_exclude_order_id IS NULL OR so.id != p_exclude_order_id)
    AND (
      -- Check date range overlap
      (so.scheduled_date, COALESCE(so.estimated_end_date, so.scheduled_date)) 
      OVERLAPS 
      (p_start_date, p_end_date)
    );

  -- Determine availability
  v_is_available := (v_conflicts IS NULL OR jsonb_array_length(v_conflicts) = 0);

  RETURN QUERY SELECT v_is_available, COALESCE(v_conflicts, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function: Get technician workload for date range
CREATE OR REPLACE FUNCTION get_technician_workload(
  p_start_date DATE,
  p_end_date DATE,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  technician_id UUID,
  technician_name TEXT,
  total_orders INT,
  total_days INT,
  available_days INT,
  utilization_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT (p_end_date - p_start_date + 1)::INT AS total_days_in_range
  ),
  tech_workload AS (
    SELECT 
      t.id,
      t.full_name,
      COUNT(DISTINCT so.id) AS order_count,
      SUM(
        GREATEST(
          LEAST(COALESCE(so.estimated_end_date, so.scheduled_date), p_end_date) - 
          GREATEST(so.scheduled_date, p_start_date) + 1,
          0
        )
      )::INT AS days_occupied
    FROM technicians t
    LEFT JOIN work_order_assignments woa ON woa.technician_id = t.id
    LEFT JOIN service_orders so ON so.id = woa.service_order_id
      AND so.scheduled_date IS NOT NULL
      AND so.status NOT IN ('completed', 'cancelled')
      AND (so.scheduled_date, COALESCE(so.estimated_end_date, so.scheduled_date)) 
          OVERLAPS (p_start_date, p_end_date)
    WHERE t.status = 'active'
      AND (p_tenant_id IS NULL OR t.tenant_id = p_tenant_id)
    GROUP BY t.id, t.full_name
  )
  SELECT 
    tw.id,
    tw.full_name,
    COALESCE(tw.order_count, 0)::INT,
    dr.total_days_in_range,
    (dr.total_days_in_range - COALESCE(tw.days_occupied, 0))::INT,
    CASE 
      WHEN dr.total_days_in_range > 0 
      THEN ROUND((COALESCE(tw.days_occupied, 0)::NUMERIC / dr.total_days_in_range) * 100, 2)
      ELSE 0
    END
  FROM tech_workload tw
  CROSS JOIN date_range dr
  ORDER BY tw.full_name;
END;
$$ LANGUAGE plpgsql;

-- Function: Find available technicians for date range
CREATE OR REPLACE FUNCTION find_available_technicians(
  p_start_date DATE,
  p_end_date DATE,
  p_tenant_id UUID,
  p_max_concurrent_jobs INT DEFAULT 2
)
RETURNS TABLE (
  technician_id UUID,
  technician_name TEXT,
  email TEXT,
  phone TEXT,
  current_jobs INT,
  can_take_more BOOLEAN,
  specializations TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.full_name,
    t.email,
    t.phone,
    COUNT(DISTINCT woa.service_order_id)::INT AS current_jobs,
    (COUNT(DISTINCT woa.service_order_id) < p_max_concurrent_jobs) AS can_take_more,
    t.specializations
  FROM technicians t
  LEFT JOIN work_order_assignments woa ON woa.technician_id = t.id
  LEFT JOIN service_orders so ON so.id = woa.service_order_id
    AND so.status NOT IN ('completed', 'cancelled')
    AND (so.scheduled_date, COALESCE(so.estimated_end_date, so.scheduled_date)) 
        OVERLAPS (p_start_date, p_end_date)
  WHERE t.tenant_id = p_tenant_id
    AND t.status = 'active'
    AND t.availability_status IN ('available', 'busy')
  GROUP BY t.id, t.full_name, t.email, t.phone, t.specializations
  HAVING COUNT(DISTINCT woa.service_order_id) < p_max_concurrent_jobs
  ORDER BY current_jobs ASC, t.full_name;
END;
$$ LANGUAGE plpgsql;

-- Test query examples:
/*
-- Check if technician is available
SELECT * FROM check_technician_availability(
  'technician-uuid-here',
  '2025-12-20'::DATE,
  '2025-12-22'::DATE
);

-- Get workload for all technicians in December
SELECT * FROM get_technician_workload(
  '2025-12-01'::DATE,
  '2025-12-31'::DATE,
  'tenant-uuid-here'
);

-- Find available technicians for a date range
SELECT * FROM find_available_technicians(
  '2025-12-20'::DATE,
  '2025-12-25'::DATE,
  'tenant-uuid-here',
  2  -- max 2 concurrent jobs
);
*/

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_orders_date_range 
  ON service_orders(scheduled_date, estimated_end_date) 
  WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_work_order_assignments_tech_order 
  ON work_order_assignments(technician_id, service_order_id);

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Technician availability functions created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '  ✓ check_technician_availability() - Check if tech is free';
  RAISE NOTICE '  ✓ get_technician_workload() - Get workload statistics';
  RAISE NOTICE '  ✓ find_available_technicians() - Find free technicians';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Remember to run ADD_PROJECT_SCHEDULE_FIELDS.sql first!';
END $$;
