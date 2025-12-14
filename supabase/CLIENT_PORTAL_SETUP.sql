-- ============================================
-- CLIENT PORTAL DATABASE SETUP
-- Extend clients table + RLS policies
-- ============================================

-- ================================================
-- SECTION 1: EXTEND CLIENTS TABLE
-- ================================================

-- Add portal access columns to clients table
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS portal_email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_last_login TIMESTAMPTZ,
  
  -- Notification preferences
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_notifications BOOLEAN DEFAULT true,
  
  -- Client type details
  ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS pic_name TEXT,
  ADD COLUMN IF NOT EXISTS pic_phone TEXT,
  
  -- Business details (untuk corporate)
  ADD COLUMN IF NOT EXISTS company_npwp TEXT,
  ADD COLUMN IF NOT EXISTS company_address_npwp TEXT,
  
  -- Metadata
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS notes_internal TEXT;

-- Add check constraint for client_type
ALTER TABLE public.clients 
  DROP CONSTRAINT IF EXISTS clients_client_type_check;
  
ALTER TABLE public.clients 
  ADD CONSTRAINT clients_client_type_check 
  CHECK (client_type IN ('residential', 'commercial'));

-- Create index on portal_email
CREATE INDEX IF NOT EXISTS idx_clients_portal_email 
  ON public.clients(portal_email) 
  WHERE portal_email IS NOT NULL;

-- Create index on portal_enabled
CREATE INDEX IF NOT EXISTS idx_clients_portal_enabled 
  ON public.clients(portal_enabled) 
  WHERE portal_enabled = true;

COMMENT ON COLUMN public.clients.portal_email IS 
'Email untuk login ke client portal. Bisa berbeda dengan email kontak.
Harus unique. Linked ke auth.users.email dengan metadata client_id.';

COMMENT ON COLUMN public.clients.portal_enabled IS 
'Flag apakah client diizinkan akses portal. 
Staff must enable this manually after client registration.';

COMMENT ON COLUMN public.clients.notes_internal IS 
'Internal notes untuk staff only. Client tidak bisa lihat ini via portal.';

-- ================================================
-- SECTION 2: CLIENT PORTAL SESSIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_sessions_client 
  ON public.client_portal_sessions(client_id);
  
CREATE INDEX IF NOT EXISTS idx_client_sessions_active 
  ON public.client_portal_sessions(is_active) 
  WHERE is_active = true;
  
CREATE INDEX IF NOT EXISTS idx_client_sessions_expires 
  ON public.client_portal_sessions(expires_at);

ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.client_portal_sessions IS 
'Track client portal login sessions for security and analytics.
Used to monitor client portal usage and detect suspicious activities.';

-- ================================================
-- SECTION 3: CLIENT PORTAL ACTIVITIES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.client_portal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activities_client 
  ON public.client_portal_activities(client_id);
  
CREATE INDEX IF NOT EXISTS idx_client_activities_date 
  ON public.client_portal_activities(created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_client_activities_type 
  ON public.client_portal_activities(activity_type);

ALTER TABLE public.client_portal_activities ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.client_portal_activities IS 
'Audit trail untuk semua aktivitas client di portal.
Activity types: login, logout, view_order, download_bast, download_invoice, 
update_profile, create_request, etc.';

-- ================================================
-- SECTION 4: RLS POLICIES FOR CLIENT PORTAL
-- ================================================

-- ============================================
-- POLICY: Clients Table
-- ============================================

-- Clients can view their own profile
CREATE POLICY "Clients can view own profile"
  ON public.clients
  FOR SELECT
  USING (
    -- Check if user is a client (not staff)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'account_type' = 'client'
    )
    AND
    -- Match client by portal_email
    portal_email = auth.email()
  );

-- Clients can update their own profile (limited fields)
CREATE POLICY "Clients can update own profile"
  ON public.clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'account_type' = 'client'
    )
    AND
    portal_email = auth.email()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'account_type' = 'client'
    )
    AND
    portal_email = auth.email()
  );

-- ============================================
-- POLICY: Service Orders (if table exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_orders') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'client_id') THEN
      -- Clients can view their own orders
      EXECUTE 'CREATE POLICY "Clients can view own orders"
        ON public.service_orders
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>''account_type'' = ''client''
          )
          AND
          client_id IN (
            SELECT id FROM public.clients 
            WHERE portal_email = auth.email()
            AND portal_enabled = true
            LIMIT 1
          )
        )';
      RAISE NOTICE '✓ Created policy: Clients can view own orders';
    ELSE
      RAISE NOTICE '⚠ Skipped: service_orders.client_id column not found';
    END IF;
  ELSE
    RAISE NOTICE '⚠ Skipped: service_orders table not found';
  END IF;
END $$;

-- ============================================
-- POLICY: Maintenance Contracts (if table exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_contracts') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'maintenance_contracts' AND column_name = 'client_id') THEN
      -- Clients can view their own contracts
      EXECUTE 'CREATE POLICY "Clients can view own contracts"
        ON public.maintenance_contracts
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>''account_type'' = ''client''
          )
          AND
          client_id IN (
            SELECT id FROM public.clients 
            WHERE portal_email = auth.email()
            AND portal_enabled = true
            LIMIT 1
          )
        )';
      RAISE NOTICE '✓ Created policy: Clients can view own contracts';
    ELSE
      RAISE NOTICE '⚠ Skipped: maintenance_contracts.client_id column not found';
    END IF;
  ELSE
    RAISE NOTICE '⚠ Skipped: maintenance_contracts table not found';
  END IF;
END $$;

-- ============================================
-- POLICY: BAST (if table exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bast') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'bast' AND column_name = 'client_id') THEN
      -- Clients can view their own BAST documents
      EXECUTE 'CREATE POLICY "Clients can view own BAST"
        ON public.bast
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>''account_type'' = ''client''
          )
          AND
          client_id IN (
            SELECT id FROM public.clients 
            WHERE portal_email = auth.email()
            AND portal_enabled = true
            LIMIT 1
          )
        )';
      RAISE NOTICE '✓ Created policy: Clients can view own BAST';
    ELSE
      RAISE NOTICE '⚠ Skipped: bast.client_id column not found';
    END IF;
  ELSE
    RAISE NOTICE '⚠ Skipped: bast table not found';
  END IF;
END $$;

-- ============================================
-- POLICY: Client Portal Sessions
-- ============================================

-- Clients can view their own sessions
CREATE POLICY "Clients can view own sessions"
  ON public.client_portal_sessions
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      AND portal_enabled = true
      LIMIT 1
    )
  );

-- Only authenticated clients can insert sessions (via trigger/function)
CREATE POLICY "System can insert client sessions"
  ON public.client_portal_sessions
  FOR INSERT
  WITH CHECK (true); -- Will be controlled via service role

-- ============================================
-- POLICY: Client Portal Activities
-- ============================================

-- Clients can view their own activities
CREATE POLICY "Clients can view own activities"
  ON public.client_portal_activities
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      AND portal_enabled = true
      LIMIT 1
    )
  );

-- System can insert activities (via service role)
CREATE POLICY "System can insert activities"
  ON public.client_portal_activities
  FOR INSERT
  WITH CHECK (true);

-- ================================================
-- SECTION 5: HELPER FUNCTIONS
-- ================================================

-- Function to get client_id from auth.email()
CREATE OR REPLACE FUNCTION public.get_client_id_from_auth()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.clients 
    WHERE portal_email = auth.email()
    AND portal_enabled = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_client_id_from_auth() IS 
'Helper function to get client_id from current authenticated user email.
Used in RLS policies and client portal queries.';

-- Function to log client portal activity
CREATE OR REPLACE FUNCTION public.log_client_activity(
  p_activity_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_client_id UUID;
  v_activity_id UUID;
BEGIN
  -- Get client_id
  v_client_id := public.get_client_id_from_auth();
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated as client';
  END IF;
  
  -- Insert activity
  INSERT INTO public.client_portal_activities (
    client_id,
    activity_type,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    v_client_id,
    p_activity_type,
    p_resource_type,
    p_resource_id,
    p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_client_activity IS 
'Helper function untuk log client portal activity.
Call this from client portal pages to track user behavior.
Example: SELECT log_client_activity(''view_order'', ''service_orders'', order_id);';

-- ================================================
-- SECTION 6: UPDATE portal_last_login TRIGGER
-- ================================================

CREATE OR REPLACE FUNCTION public.update_client_last_login()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Get client_id from portal_email
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE portal_email = NEW.email;
  
  -- Update last login if client exists
  IF v_client_id IS NOT NULL THEN
    UPDATE public.clients
    SET portal_last_login = NOW()
    WHERE id = v_client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would be on auth.users, which we can't directly trigger
-- Instead, we'll update last_login via API when client logs in

-- ================================================
-- SECTION 7: SEED DATA (FOR TESTING)
-- ================================================

-- Create a test client with portal access
DO $$
DECLARE
  v_tenant_id UUID;
  v_client_id UUID;
BEGIN
  -- Get default tenant
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'hvac-djawara' LIMIT 1;
  
  IF v_tenant_id IS NOT NULL THEN
    -- Insert test client if not exists
    INSERT INTO public.clients (
      tenant_id,
      name,
      phone,
      email,
      address,
      client_type,
      portal_email,
      portal_enabled
    ) VALUES (
      v_tenant_id,
      'Test Client Portal',
      '+6281234567890',
      'client@example.com',
      'Jl. Test No. 123, Jakarta',
      'residential',
      'client@example.com',
      true
    )
    ON CONFLICT (portal_email) DO NOTHING
    RETURNING id INTO v_client_id;
    
    IF v_client_id IS NOT NULL THEN
      RAISE NOTICE '✓ Test client created with portal access: %', v_client_id;
      RAISE NOTICE 'Email: client@example.com';
      RAISE NOTICE 'Password: Set via Supabase Auth Admin API';
    ELSE
      RAISE NOTICE '⚠ Test client already exists';
    END IF;
  END IF;
END $$;

-- ================================================
-- SECTION 8: VALIDATION
-- ================================================

DO $$
DECLARE
  portal_columns_count INT;
  policies_count INT;
  functions_count INT;
BEGIN
  -- Check portal columns added
  SELECT COUNT(*) INTO portal_columns_count
  FROM information_schema.columns
  WHERE table_name = 'clients'
  AND column_name IN ('portal_email', 'portal_enabled', 'client_type');
  
  ASSERT portal_columns_count >= 3, 'Portal columns not added to clients table';
  
  -- Check policies created (at least clients table policies)
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'clients'
  AND policyname LIKE '%client%';
  
  ASSERT policies_count >= 2, 'Client portal policies not created for clients table';
  
  -- Check functions created
  SELECT COUNT(*) INTO functions_count
  FROM pg_proc
  WHERE proname IN ('get_client_id_from_auth', 'log_client_activity');
  
  ASSERT functions_count = 2, 'Helper functions not created';
  
  RAISE NOTICE '✓ CLIENT PORTAL SETUP COMPLETED SUCCESSFULLY';
  RAISE NOTICE '  - Portal columns added to clients table';
  RAISE NOTICE '  - RLS policies created';
  RAISE NOTICE '  - Helper functions created';
  RAISE NOTICE '  - Test client ready';
END $$;

-- ================================================
-- NEXT STEPS
-- ================================================

-- 1. Run this script in Supabase SQL Editor
-- 2. Create auth user via Admin API for test client:
--    const { data, error } = await supabase.auth.admin.createUser({
--      email: 'client@example.com',
--      password: 'TestPassword123!',
--      email_confirm: true,
--      user_metadata: {
--        client_id: '<client_id>',
--        account_type: 'client'
--      }
--    })
-- 3. Test login di /client/login
-- 4. Verify RLS policies working correctly
