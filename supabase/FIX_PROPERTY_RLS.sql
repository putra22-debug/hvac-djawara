-- ============================================
-- FIX PROPERTY RLS POLICIES
-- Add missing RLS policies for client_properties
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.client_properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view properties in their tenant" ON public.client_properties;
DROP POLICY IF EXISTS "Users can insert properties in their tenant" ON public.client_properties;
DROP POLICY IF EXISTS "Users can update properties in their tenant" ON public.client_properties;
DROP POLICY IF EXISTS "Users can delete properties in their tenant" ON public.client_properties;

-- Policy: View properties
CREATE POLICY "Users can view properties in their tenant"
ON public.client_properties
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Policy: Insert properties
CREATE POLICY "Users can insert properties in their tenant"
ON public.client_properties
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    AND is_active = true
  )
);

-- Policy: Update properties
CREATE POLICY "Users can update properties in their tenant"
ON public.client_properties
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    AND is_active = true
  )
);

-- Policy: Delete properties
CREATE POLICY "Users can delete properties in their tenant"
ON public.client_properties
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    AND is_active = true
  )
);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies for client_properties fixed!';
  RAISE NOTICE '✅ Users can now insert, update, and delete properties';
END $$;
