-- ============================================
-- ENABLE RLS KEMBALI DENGAN POLICY YANG BENAR
-- Jalankan ini setelah form bekerja
-- ============================================

-- 1. Enable RLS kembali
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2. Drop policy lama jika ada
DROP POLICY IF EXISTS anon_insert_service_orders_hvac ON public.service_orders;
DROP POLICY IF EXISTS users_view_tenant_orders ON public.service_orders;
DROP POLICY IF EXISTS users_insert_orders ON public.service_orders;
DROP POLICY IF EXISTS users_update_orders ON public.service_orders;

-- 3. Buat policy baru yang benar
-- Anonymous bisa INSERT untuk hvac-djawara
CREATE POLICY anon_insert_service_orders_hvac
ON public.service_orders
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
);

-- Authenticated users bisa SELECT orders di tenant mereka
CREATE POLICY users_view_tenant_orders
ON public.service_orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
);

-- Authenticated users dengan role tertentu bisa INSERT
CREATE POLICY users_insert_orders
ON public.service_orders
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner', 'tech_head'])
);

-- Authenticated users bisa UPDATE orders di tenant mereka
CREATE POLICY users_update_orders
ON public.service_orders
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
);

-- 4. Verify
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('service_orders', 'clients');

SELECT 
  policyname,
  tablename,
  roles,
  cmd as operation
FROM pg_policies
WHERE tablename = 'service_orders'
ORDER BY policyname;
