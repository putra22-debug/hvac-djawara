-- ============================================
-- CEK POLICIES YANG ADA SEKARANG
-- Jalankan ini untuk melihat policy apa saja yang aktif
-- ============================================

-- Lihat semua policies untuk service_orders
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'service_orders'
ORDER BY policyname;

-- Lihat policies untuk clients
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY policyname;

-- Lihat policies untuk tenants
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;
