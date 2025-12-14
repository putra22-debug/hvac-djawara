-- ============================================
-- FIX: has_role function type casting
-- Issue: user_role enum compared with text[] array
-- ============================================

-- Drop and recreate has_role function with proper type casting
CREATE OR REPLACE FUNCTION public.has_role(check_roles text[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_tenant_roles
    WHERE user_id = auth.uid()
      AND tenant_id = public.get_active_tenant_id()
      AND role::text = ANY(check_roles)  -- Cast enum to text
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.has_role IS 
'Check if current user has any of the specified roles in their active tenant.
Fixed: Cast role enum to text for comparison with text array.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ has_role function fixed!';
  RAISE NOTICE 'Issue: user_role enum cannot be compared directly with text[]';
  RAISE NOTICE 'Solution: Cast role::text for comparison';
  RAISE NOTICE '';
END $$;
