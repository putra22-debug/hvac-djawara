-- ============================================
-- FIX TECHNICIAN RLS ACCESS
-- Enable technicians to view their assigned orders
-- ============================================

-- 1. Add policy for technicians to view their own record
DROP POLICY IF EXISTS "technicians_view_own_profile" ON technicians;
CREATE POLICY "technicians_view_own_profile"
  ON technicians FOR SELECT
  USING (user_id = auth.uid());

-- 2. Add policy for technicians to view assigned service orders
DROP POLICY IF EXISTS "technicians_view_assigned_orders" ON service_orders;
CREATE POLICY "technicians_view_assigned_orders"
  ON service_orders FOR SELECT
  USING (
    -- Check if technician is assigned to this order
    EXISTS (
      SELECT 1 FROM work_order_assignments woa
      JOIN technicians t ON t.id = woa.technician_id
      WHERE woa.service_order_id = service_orders.id
        AND t.user_id = auth.uid()
    )
  );

-- 3. Add policy for technicians to update assigned orders (status changes)
DROP POLICY IF EXISTS "technicians_update_assigned_orders" ON service_orders;
CREATE POLICY "technicians_update_assigned_orders"
  ON service_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM work_order_assignments woa
      JOIN technicians t ON t.id = woa.technician_id
      WHERE woa.service_order_id = service_orders.id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_order_assignments woa
      JOIN technicians t ON t.id = woa.technician_id
      WHERE woa.service_order_id = service_orders.id
        AND t.user_id = auth.uid()
    )
  );

-- 4. Fix work_order_assignments column name if needed
-- The dashboard code expects 'order_id' but table has 'service_order_id'
-- Let's keep service_order_id but ensure assignments policy works

DROP POLICY IF EXISTS "technicians_view_own_assignments" ON work_order_assignments;
CREATE POLICY "technicians_view_own_assignments"
  ON work_order_assignments FOR SELECT
  USING (
    technician_id IN (
      SELECT id FROM technicians WHERE user_id = auth.uid()
    )
  );

-- 5. Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('technicians', 'work_order_assignments', 'service_orders')
  AND policyname LIKE '%technician%'
ORDER BY tablename, policyname;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Technician RLS policies updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Technicians can now:';
  RAISE NOTICE '  ✓ View their own profile';
  RAISE NOTICE '  ✓ View their assigned orders';
  RAISE NOTICE '  ✓ Update order status (for assigned orders)';
  RAISE NOTICE '  ✓ View their work order assignments';
END $$;
