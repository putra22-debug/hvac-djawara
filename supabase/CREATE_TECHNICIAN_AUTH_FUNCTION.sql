-- ============================================
-- CREATE TECHNICIAN AUTH ACCOUNT FUNCTION
-- Creates Supabase auth account for technician with email auto-confirmed
-- ============================================

-- Enable pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_technician_auth_account(
  p_email TEXT,
  p_password TEXT,
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_technician_id UUID;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Verify token is still valid
  IF NOT EXISTS (
    SELECT 1 FROM technicians
    WHERE email = p_email
    AND verification_token = p_token
    AND token_expires_at > NOW()
    AND user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Token tidak valid atau sudah expired';
  END IF;

  -- Get technician ID
  SELECT id INTO v_technician_id
  FROM technicians
  WHERE email = p_email
  AND verification_token = p_token;

  -- Create auth user with auto-confirmed email
  -- Note: This requires the function to have SECURITY DEFINER
  -- and proper permissions on auth schema
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), -- Email confirmed immediately
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('role', 'technician', 'is_technician', true),
    false,
    NULL
  )
  RETURNING id INTO v_user_id;

  -- Create identity for the user
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Update technician record
  UPDATE technicians
  SET 
    user_id = v_user_id,
    is_verified = true,
    verification_token = NULL,
    token_expires_at = NULL,
    updated_at = NOW()
  WHERE id = v_technician_id;

  -- Return success
  v_result := json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'message', 'Akun berhasil dibuat'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Gagal membuat akun: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_technician_auth_account(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_technician_auth_account(TEXT, TEXT, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION create_technician_auth_account IS 'Creates Supabase auth account for technician with auto-confirmed email';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FUNCTION CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Function: create_technician_auth_account';
  RAISE NOTICE '   - Creates auth account with confirmed email';
  RAISE NOTICE '   - Links to technician record';
  RAISE NOTICE '   - Invalidates verification token';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT:';
  RAISE NOTICE '   This function requires SECURITY DEFINER';
  RAISE NOTICE '   to access auth schema tables';
  RAISE NOTICE '';
END $$;
