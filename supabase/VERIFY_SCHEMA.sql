-- ============================================
-- QUICK SCHEMA VERIFICATION SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to check what's missing

-- Check tenants table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'tenants'
) as "tenants_exists";

-- Check profiles table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'profiles'
) as "profiles_exists";

-- Check user_tenant_roles table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user_tenant_roles'
) as "user_tenant_roles_exists";

-- Check service_orders table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'service_orders'
) as "service_orders_exists";

-- List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled on key tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as "rls_enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tenants', 'profiles', 'user_tenant_roles', 'service_orders')
ORDER BY tablename;
