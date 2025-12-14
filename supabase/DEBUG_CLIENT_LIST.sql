-- ============================================
-- DEBUG: Why Client List is Empty
-- Check data Bank Permata dan tenant_id mismatch
-- ============================================

-- Step 1: Check if clients data still exists (bypass RLS)
-- Run this as service_role or with RLS disabled temporarily
SELECT 
  id,
  name,
  email,
  phone,
  tenant_id,
  created_at
FROM clients
ORDER BY created_at DESC;

-- Step 2: Check current user's tenant_id
SELECT 
  id,
  email,
  raw_user_meta_data->>'active_tenant_id' as active_tenant_id,
  raw_user_meta_data->>'tenant_id' as tenant_id,
  raw_user_meta_data
FROM auth.users
WHERE id = auth.uid();

-- Step 3: Compare user tenant_id vs clients tenant_id
SELECT 
  'User Tenant ID' as source,
  (SELECT raw_user_meta_data->>'active_tenant_id' FROM auth.users WHERE id = auth.uid()) as tenant_id
UNION ALL
SELECT 
  'Client: ' || name as source,
  tenant_id::text as tenant_id
FROM clients
ORDER BY source;

-- Step 4: Check if Bank Permata data exists
SELECT 
  id,
  name,
  email,
  tenant_id,
  created_at
FROM clients
WHERE name ILIKE '%permata%' OR name ILIKE '%bank%'
ORDER BY created_at DESC;

-- Step 5: Check maintenance schedules for Bank Permata
SELECT 
  pms.id,
  pms.tenant_id as schedule_tenant_id,
  cp.property_name,
  c.name as client_name,
  c.tenant_id as client_tenant_id,
  pms.next_scheduled_date,
  pms.frequency
FROM property_maintenance_schedules pms
JOIN client_properties cp ON cp.id = pms.property_id
JOIN clients c ON c.id = pms.client_id
WHERE c.name ILIKE '%permata%' OR cp.property_name ILIKE '%permata%'
ORDER BY pms.created_at DESC;

-- ============================================
-- SOLUTION: Fix tenant_id mismatch
-- ============================================

-- Option 1: Update ALL clients to match current user's tenant_id
-- ONLY RUN THIS IF Step 3 shows MISMATCH

/*
UPDATE clients
SET tenant_id = (
  SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
  FROM auth.users
  WHERE id = auth.uid()
)
WHERE tenant_id IS NOT NULL;
*/

-- Option 2: If user doesn't have active_tenant_id, set it from existing client
-- ONLY RUN THIS IF Step 2 shows active_tenant_id is NULL

/*
-- First, get tenant_id from any existing client
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM clients
  LIMIT 1;
  
  -- Update user's metadata with this tenant_id
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('active_tenant_id', v_tenant_id::text)
  WHERE id = auth.uid();
  
  RAISE NOTICE 'Set active_tenant_id to: %', v_tenant_id;
END $$;
*/

-- Option 3: Make RLS policy more flexible (allow NULL or any tenant for single-tenant systems)
-- This is useful if you're running single tenant

/*
DROP POLICY IF EXISTS "Users can view clients in their tenant" ON clients;

CREATE POLICY "Users can view clients in their tenant"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if tenant_id matches OR if user has no active_tenant_id (single tenant mode)
    tenant_id = (
      SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
      FROM auth.users 
      WHERE id = auth.uid()
    )
    OR
    (
      SELECT raw_user_meta_data->>'active_tenant_id'
      FROM auth.users 
      WHERE id = auth.uid()
    ) IS NULL
  );
*/

-- Step 6: Verify fix worked - This should now show clients
SELECT 
  id,
  name,
  email,
  tenant_id,
  created_at
FROM clients
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- RECOMMENDED SOLUTION (Choose One)
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔍 DEBUG RESULTS:';
  RAISE NOTICE '1. Check Step 1 - Are clients still in database?';
  RAISE NOTICE '2. Check Step 2 - Does user have active_tenant_id?';
  RAISE NOTICE '3. Check Step 3 - Do tenant_ids match?';
  RAISE NOTICE '4. Check Step 4 - Is Bank Permata data there?';
  RAISE NOTICE '';
  RAISE NOTICE '💡 SOLUTIONS:';
  RAISE NOTICE '- If MISMATCH in Step 3 → Uncomment Option 1 (update clients tenant_id)';
  RAISE NOTICE '- If NULL in Step 2 → Uncomment Option 2 (set user active_tenant_id)';
  RAISE NOTICE '- If single tenant → Uncomment Option 3 (flexible RLS)';
END $$;
