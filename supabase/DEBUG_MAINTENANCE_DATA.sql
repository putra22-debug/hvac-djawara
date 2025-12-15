-- ============================================
-- DEBUG MAINTENANCE SCHEDULE DATA
-- Cek kenapa widget tidak menampilkan data Bank Permata
-- ============================================

-- ================================================
-- STEP 1: Check if property_maintenance_schedules table has data
-- ================================================

SELECT 
  'Total Maintenance Schedules' as check_type,
  COUNT(*) as count
FROM property_maintenance_schedules;

-- ================================================
-- STEP 2: Check Bank Permata maintenance schedules
-- ================================================

SELECT 
  pms.id,
  pms.tenant_id,
  c.name as client_name,
  cp.property_name,
  pms.frequency,
  pms.maintenance_type,
  pms.start_date,
  pms.next_scheduled_date,
  pms.last_generated_date,
  pms.is_active,
  pms.auto_generate_orders,
  pms.days_before_reminder,
  -- Calculate days
  (pms.next_scheduled_date - CURRENT_DATE) as days_until,
  CASE 
    WHEN pms.next_scheduled_date < CURRENT_DATE THEN 'OVERDUE'
    WHEN pms.next_scheduled_date <= CURRENT_DATE + 7 THEN 'URGENT'
    WHEN pms.next_scheduled_date <= CURRENT_DATE + 30 THEN 'UPCOMING'
    ELSE 'FUTURE'
  END as urgency
FROM property_maintenance_schedules pms
LEFT JOIN clients c ON c.id = pms.client_id
LEFT JOIN client_properties cp ON cp.id = pms.property_id
WHERE c.name ILIKE '%permata%'
ORDER BY pms.next_scheduled_date ASC;

-- ================================================
-- STEP 3: Check all active maintenance schedules
-- ================================================

SELECT 
  pms.id,
  c.name as client_name,
  cp.property_name,
  pms.next_scheduled_date,
  pms.is_active,
  pms.auto_generate_orders,
  (pms.next_scheduled_date - CURRENT_DATE) as days_until
FROM property_maintenance_schedules pms
LEFT JOIN clients c ON c.id = pms.client_id
LEFT JOIN client_properties cp ON cp.id = pms.property_id
WHERE pms.is_active = TRUE
ORDER BY pms.next_scheduled_date ASC;

-- ================================================
-- STEP 4: Check v_upcoming_maintenance view
-- ================================================

SELECT 
  schedule_id,
  client_name,
  property_name,
  next_scheduled_date,
  days_until,
  is_active,
  order_exists,
  unit_count
FROM v_upcoming_maintenance
ORDER BY days_until ASC;

-- ================================================
-- STEP 5: Check if next_scheduled_date is NULL
-- ================================================

SELECT 
  'Schedules with NULL next_scheduled_date' as check_type,
  COUNT(*) as count
FROM property_maintenance_schedules
WHERE is_active = TRUE 
  AND next_scheduled_date IS NULL;

-- ================================================
-- STEP 6: Check if there are schedules but filtered out
-- ================================================

SELECT 
  'Total Active Schedules' as metric,
  COUNT(*) as count
FROM property_maintenance_schedules
WHERE is_active = TRUE;

SELECT 
  'Schedules with next_date in past 90 days' as metric,
  COUNT(*) as count
FROM property_maintenance_schedules
WHERE is_active = TRUE
  AND next_scheduled_date >= CURRENT_DATE - 90;

SELECT 
  'Schedules with next_date in next 30 days' as metric,
  COUNT(*) as count
FROM property_maintenance_schedules
WHERE is_active = TRUE
  AND next_scheduled_date <= CURRENT_DATE + 30;

-- ================================================
-- STEP 7: Show current date for reference
-- ================================================

SELECT 
  CURRENT_DATE as today,
  CURRENT_DATE - 30 as thirty_days_ago,
  CURRENT_DATE + 30 as thirty_days_ahead;

-- ================================================
-- STEP 8: Fix NULL next_scheduled_date if found
-- ================================================

-- This will update any schedules that have NULL next_scheduled_date
UPDATE property_maintenance_schedules
SET next_scheduled_date = calculate_next_maintenance_date(
  COALESCE(last_generated_date, start_date, CURRENT_DATE),
  frequency,
  custom_interval_days
)
WHERE next_scheduled_date IS NULL
  AND is_active = TRUE
RETURNING 
  id, 
  (SELECT name FROM clients WHERE id = client_id) as client_name,
  start_date,
  next_scheduled_date as new_next_date;
