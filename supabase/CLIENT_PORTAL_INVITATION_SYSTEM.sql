-- ============================================
-- CLIENT PORTAL - INVITATION SYSTEM
-- Staff generate invitation, client self-activate
-- ============================================

-- ================================================
-- EXTEND CLIENTS TABLE - Add Invitation Fields
-- ================================================

ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS portal_invitation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_invitation_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_invitation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_invitation_sent_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS portal_activated_at TIMESTAMPTZ;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_clients_invitation_token 
  ON public.clients(portal_invitation_token) 
  WHERE portal_invitation_token IS NOT NULL;

COMMENT ON COLUMN public.clients.portal_invitation_token IS 
'One-time token untuk client activation. 
Generated oleh staff, digunakan untuk set password pertama kali.
Format: 32 char random string. Expires dalam 7 hari.';

COMMENT ON COLUMN public.clients.portal_activated_at IS 
'Timestamp ketika client pertama kali activate portal via invitation link.';

-- ================================================
-- FUNCTION: Generate Portal Invitation
-- ================================================

CREATE OR REPLACE FUNCTION public.generate_portal_invitation(
  p_client_id UUID,
  p_generated_by UUID,
  p_validity_days INT DEFAULT 7
)
RETURNS TABLE (
  token TEXT,
  invitation_link TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_token TEXT;
  v_expires TIMESTAMPTZ;
  v_base_url TEXT := 'https://hvac-djawara.vercel.app'; -- Update with your domain
BEGIN
  -- Generate random token (32 chars)
  v_token := encode(gen_random_bytes(24), 'hex');
  
  -- Set expiry
  v_expires := NOW() + (p_validity_days || ' days')::INTERVAL;
  
  -- Update client record
  UPDATE public.clients
  SET 
    portal_invitation_token = v_token,
    portal_invitation_expires = v_expires,
    portal_invitation_sent_at = NOW(),
    portal_invitation_sent_by = p_generated_by,
    portal_enabled = false -- Will be enabled after activation
  WHERE id = p_client_id;
  
  -- Return invitation details
  RETURN QUERY
  SELECT 
    v_token,
    v_base_url || '/invite/' || v_token,
    v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_portal_invitation IS 
'Generate portal invitation untuk client.
Called by staff dari dashboard.
Returns: token, full invitation link, expiry timestamp.
Example: SELECT * FROM generate_portal_invitation(client_id, staff_id, 7);';

-- ================================================
-- FUNCTION: Validate & Consume Invitation Token
-- ================================================

CREATE OR REPLACE FUNCTION public.validate_invitation_token(
  p_token TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT
) AS $$
DECLARE
  v_client RECORD;
BEGIN
  -- Find client by token
  SELECT 
    id,
    name,
    email,
    portal_invitation_expires,
    portal_enabled,
    portal_activated_at
  INTO v_client
  FROM public.clients
  WHERE portal_invitation_token = p_token;
  
  -- Check if token exists
  IF v_client.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, 'Invalid invitation token';
    RETURN;
  END IF;
  
  -- Check if already activated
  IF v_client.portal_activated_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, 'Invitation already used';
    RETURN;
  END IF;
  
  -- Check if expired
  IF v_client.portal_invitation_expires < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, 'Invitation expired';
    RETURN;
  END IF;
  
  -- Valid token
  RETURN QUERY SELECT 
    true,
    v_client.id,
    v_client.name,
    v_client.email,
    v_client.portal_invitation_expires,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_invitation_token IS 
'Validate invitation token sebelum client set password.
Returns client info if valid, error message if invalid.';

-- ================================================
-- FUNCTION: Activate Portal After Password Set
-- ================================================

CREATE OR REPLACE FUNCTION public.activate_client_portal(
  p_client_id UUID,
  p_portal_email TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Activate portal & clear invitation token
  UPDATE public.clients
  SET 
    portal_email = p_portal_email,
    portal_enabled = true,
    portal_activated_at = NOW(),
    portal_invitation_token = NULL,  -- Clear token (one-time use)
    portal_invitation_expires = NULL
  WHERE id = p_client_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.activate_client_portal IS 
'Activate client portal setelah password di-set.
Called setelah create auth.user berhasil.
Clears invitation token (one-time use only).';

-- ================================================
-- VIEW: Active Invitations (for staff dashboard)
-- ================================================

CREATE OR REPLACE VIEW public.v_portal_invitations AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  c.portal_invitation_token,
  c.portal_invitation_expires,
  c.portal_invitation_sent_at,
  c.portal_enabled,
  c.portal_activated_at,
  p.full_name as sent_by_name,
  CASE 
    WHEN c.portal_activated_at IS NOT NULL THEN 'activated'
    WHEN c.portal_invitation_expires < NOW() THEN 'expired'
    WHEN c.portal_invitation_token IS NOT NULL THEN 'pending'
    ELSE 'not_invited'
  END as invitation_status
FROM public.clients c
LEFT JOIN public.profiles p ON p.id = c.portal_invitation_sent_by
WHERE c.portal_invitation_token IS NOT NULL
   OR c.portal_activated_at IS NOT NULL
ORDER BY c.portal_invitation_sent_at DESC;

COMMENT ON VIEW public.v_portal_invitations IS 
'View untuk staff dashboard - monitoring portal invitations.
Shows: pending, expired, activated invitations.';

-- ================================================
-- TEST INVITATION FLOW
-- ================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_client_id UUID;
  v_staff_id UUID;
  v_invitation RECORD;
BEGIN
  -- Get tenant and create test staff
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'hvac-djawara' LIMIT 1;
  SELECT id INTO v_staff_id FROM public.profiles LIMIT 1;
  
  IF v_tenant_id IS NOT NULL THEN
    -- Create test client (without portal access)
    INSERT INTO public.clients (
      tenant_id,
      name,
      phone,
      email,
      address,
      client_type
    ) VALUES (
      v_tenant_id,
      'Test Client Invitation',
      '+6281234567891',
      'test.invitation@example.com',
      'Jl. Test Invitation No. 456, Jakarta',
      'residential'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_client_id;
    
    IF v_client_id IS NOT NULL THEN
      -- Generate invitation
      SELECT * INTO v_invitation
      FROM public.generate_portal_invitation(v_client_id, v_staff_id, 7);
      
      RAISE NOTICE '✓ Test invitation generated!';
      RAISE NOTICE '📧 Client: Test Client Invitation';
      RAISE NOTICE '🔗 Invitation Link: %', v_invitation.invitation_link;
      RAISE NOTICE '🎫 Token: %', v_invitation.token;
      RAISE NOTICE '⏰ Expires: %', v_invitation.expires_at;
      RAISE NOTICE '';
      RAISE NOTICE '📱 Share this link via WhatsApp or Email to client';
      RAISE NOTICE '🔐 Client will set their own password when they visit the link';
    ELSE
      RAISE NOTICE '⚠ Test client already exists (invitation may already be sent)';
    END IF;
  END IF;
END $$;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

SELECT '✅ PORTAL INVITATION SYSTEM READY!' as status;
SELECT 'Staff can now generate invitation links for clients' as info;
SELECT 'Clients will receive link → Set password → Auto-activated' as flow;
