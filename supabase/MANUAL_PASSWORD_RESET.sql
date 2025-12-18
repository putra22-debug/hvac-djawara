-- ============================================
-- Manual Password Reset for Client
-- For admin to reset client password manually
-- ============================================

-- Option 1: Get user ID for manual reset via Supabase Dashboard
SELECT 
  u.id as user_id,
  u.email,
  c.name as client_name
FROM auth.users u
LEFT JOIN clients c ON c.user_id = u.id
WHERE u.email = 'yennita.anggraeniputri@gmail.com';

-- Copy user_id, lalu:
-- 1. Buka Supabase Dashboard
-- 2. Go to Authentication → Users
-- 3. Cari user by email: yennita.anggraeniputri@gmail.com
-- 4. Klik user → Reset Password
-- 5. Kirim reset link ke email client

-- Option 2: Send reset password email via SQL (recommended)
-- Note: Ini akan trigger Supabase auth email
-- Client akan dapat email dengan link reset password

-- Untuk testing, bisa set password baru langsung (HANYA UNTUK DEVELOPMENT!)
-- JANGAN GUNAKAN DI PRODUCTION!
-- UPDATE auth.users 
-- SET encrypted_password = crypt('password-baru-123', gen_salt('bf'))
-- WHERE email = 'yennita.anggraeniputri@gmail.com';

-- ============================================
-- Alternative: Invite client to re-register
-- ============================================

-- Jika email reset tidak work, bisa unlink user dan kirim invitation baru

-- 1. Unlink user_id dari client
UPDATE clients
SET user_id = NULL
WHERE email = 'yennita.anggraeniputri@gmail.com';

-- 2. Delete user dari auth.users (optional, jika mau fresh start)
-- DELETE FROM auth.users WHERE email = 'yennita.anggraeniputri@gmail.com';

-- 3. Get new registration link
SELECT 
  name,
  email,
  'https://hvac-djawara.vercel.app/client/register?token=' || public_token as registration_link
FROM clients
WHERE email = 'yennita.anggraeniputri@gmail.com';

-- Kirim registration_link ke client untuk registrasi ulang
