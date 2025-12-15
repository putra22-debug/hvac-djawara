-- ============================================
-- FIX RLS POLICIES FOR v_upcoming_maintenance VIEW
-- View tidak bisa diakses dari API karena RLS
-- ============================================

-- Problem: Views inherit RLS from base tables
-- v_upcoming_maintenance joins property_maintenance_schedules + clients + client_properties
-- Each table has its own RLS policies

-- ================================================
-- STEP 1: Check current RLS status
-- ================================================

-- Check if RLS is enabled on base tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN (
  'property_maintenance_schedules',
  'clients', 
  'client_properties',
  'service_orders'
)
ORDER BY tablename;

-- ================================================
-- STEP 2: Check existing policies
-- ================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN (
  'property_maintenance_schedules',
  'clients',
  'client_properties'
)
ORDER BY tablename, policyname;

-- ================================================
-- STEP 3: Add SELECT policy for property_maintenance_schedules
-- ================================================

-- Drop old policy if exists
DROP POLICY IF EXISTS "Users can view maintenance schedules in their tenant" 
  ON property_maintenance_schedules;

-- Create new policy with proper tenant filtering
CREATE POLICY "Users can view maintenance schedules in their tenant"
ON property_maintenance_schedules
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM user_tenant_roles 
    WHERE user_id = auth.uid()
  )
);

-- ================================================
-- STEP 4: Verify policy for clients table
-- ================================================

-- This should already exist, but let's make sure
DROP POLICY IF EXISTS "Users can view clients in their tenant" ON clients;

CREATE POLICY "Users can view clients in their tenant"
ON clients
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM user_tenant_roles 
    WHERE user_id = auth.uid()
  )
);

-- ================================================
-- STEP 5: Verify policy for client_properties table
-- ================================================

DROP POLICY IF EXISTS "Users can view properties in their tenant" ON client_properties;

CREATE POLICY "Users can view properties in their tenant"
ON client_properties
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM user_tenant_roles 
    WHERE user_id = auth.uid()
  )
);

-- ================================================
-- STEP 6: Test view as authenticated user
-- ================================================

-- This will show what the API sees
SELECT 
  schedule_id,
  client_name,
  property_name,
  next_scheduled_date,
  days_until,
  is_active,
  order_exists
FROM v_upcoming_maintenance
ORDER BY days_until ASC
LIMIT 10;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Policies Updated for Maintenance View!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Policies Created:';
  RAISE NOTICE '   - property_maintenance_schedules: SELECT by tenant';
  RAISE NOTICE '   - clients: SELECT by tenant';
  RAISE NOTICE '   - client_properties: SELECT by tenant';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next Steps:';
  RAISE NOTICE '   1. Refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '   2. Check Maintenance Schedule tab';
  RAISE NOTICE '   3. Data Bank Permata should appear';
  RAISE NOTICE '';
END $$;
