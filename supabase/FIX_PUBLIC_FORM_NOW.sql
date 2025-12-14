-- ============================================
-- FIX PUBLIC FORM - RUN THIS NOW!
-- Copy seluruh file ini ke Supabase SQL Editor
-- ============================================

-- Step 1: Check if hvac-djawara tenant exists
DO $$
DECLARE
  tenant_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║  FIXING PUBLIC FORM SUBMISSION             ║';
  RAISE NOTICE '╚════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  SELECT id INTO tenant_id FROM public.tenants WHERE slug = 'hvac-djawara';
  
  IF tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant hvac-djawara not found! Run DEPLOY_MASTER.sql first.';
  END IF;
  
  RAISE NOTICE '✓ Found tenant hvac-djawara: %', tenant_id;
END $$;

-- Step 2: Drop ALL existing policies for service_orders
DO $$
BEGIN
  DROP POLICY IF EXISTS users_view_tenant_orders ON public.service_orders;
  DROP POLICY IF EXISTS users_insert_orders ON public.service_orders;
  DROP POLICY IF EXISTS users_update_orders ON public.service_orders;
  DROP POLICY IF EXISTS anon_insert_service_orders_hvac ON public.service_orders;
  
  RAISE NOTICE '✓ Dropped old service_orders policies';
END $$;

-- Step 3: Create NEW policies for service_orders
-- Anonymous can INSERT for hvac-djawara
CREATE POLICY anon_insert_service_orders_hvac
ON public.service_orders
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
);

-- Authenticated users can SELECT their tenant's orders
CREATE POLICY users_view_tenant_orders
ON public.service_orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
);

-- Authenticated users with proper roles can INSERT orders
CREATE POLICY users_insert_orders
ON public.service_orders
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner', 'tech_head'])
);

-- Authenticated users can UPDATE orders in their tenant
CREATE POLICY users_update_orders
ON public.service_orders
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
);

DO $$
BEGIN
  RAISE NOTICE '✓ Created new service_orders policies';
END $$;

-- Step 4: Fix clients policies
DO $$
BEGIN
  DROP POLICY IF EXISTS anon_select_clients_hvac ON public.clients;
  DROP POLICY IF EXISTS anon_insert_clients_hvac ON public.clients;
  DROP POLICY IF EXISTS anon_update_clients_hvac ON public.clients;
END $$;

CREATE POLICY anon_select_clients_hvac
ON public.clients
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
);

CREATE POLICY anon_insert_clients_hvac
ON public.clients
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
);

CREATE POLICY anon_update_clients_hvac
ON public.clients
AS PERMISSIVE
FOR UPDATE
TO anon, authenticated
USING (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
)
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
);

DO $$
BEGIN
  RAISE NOTICE '✓ Fixed clients policies';
END $$;

-- Step 5: Fix tenants policy
DO $$
BEGIN
  DROP POLICY IF EXISTS anon_select_hvac_tenant ON public.tenants;
END $$;

CREATE POLICY anon_select_hvac_tenant
ON public.tenants
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (slug = 'hvac-djawara');

DO $$
BEGIN
  RAISE NOTICE '✓ Fixed tenants policy';
END $$;

-- Verification
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'service_orders'
  AND policyname LIKE '%anon%';
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ PUBLIC FORM FIX COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Anonymous policies for service_orders: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Now test the form at:';
  RAISE NOTICE '   https://hvac-djawara.vercel.app';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Press Ctrl+Shift+R to hard refresh the page';
  RAISE NOTICE '';
END $$;
