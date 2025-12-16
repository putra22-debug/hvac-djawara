-- ============================================
-- ASSIGN TECHNICIAN ROLES TO EXISTING USERS
-- Gunakan SQL ini untuk memberikan role technician ke user yang sudah ada
-- ============================================

-- STEP 1: Cek tenant_id yang aktif
-- Jalankan ini dulu untuk mendapatkan tenant_id
SELECT id, name, created_at 
FROM tenants 
ORDER BY created_at DESC 
LIMIT 5;

-- STEP 2: Assign role technician ke user
-- Auto-detect tenant_id dari user owner yang sudah ada

-- Assign delta.sc58@gmail.com sebagai technician
INSERT INTO user_tenant_roles (user_id, tenant_id, role, is_active)
SELECT 
    '0f41a38b-7e0f-4b38-8971-7c31b8056d3e', -- delta.sc58@gmail.com
    tenant_id,
    'technician',
    true
FROM user_tenant_roles
WHERE user_id = '4d836a64-0295-4b03-90c7-b282ee6fac7b' -- owner user
AND role = 'owner'
AND NOT EXISTS (
    SELECT 1 FROM user_tenant_roles 
    WHERE user_id = '0f41a38b-7e0f-4b38-8971-7c31b8056d3e'
)
LIMIT 1;

-- Assign putra.soedirboy@gmail.com sebagai technician
INSERT INTO user_tenant_roles (user_id, tenant_id, role, is_active)
SELECT 
    'b9421c07-ec8c-484d-9159-3a81914ce17e', -- putra.soedirboy@gmail.com
    tenant_id,
    'technician',
    true
FROM user_tenant_roles
WHERE user_id = '4d836a64-0295-4b03-90c7-b282ee6fac7b' -- owner user
AND role = 'owner'
AND NOT EXISTS (
    SELECT 1 FROM user_tenant_roles 
    WHERE user_id = 'b9421c07-ec8c-484d-9159-3a81914ce17e'
)
LIMIT 1;

-- STEP 3: Verify assignment
SELECT 
    p.id,
    p.full_name,
    utr.role,
    utr.is_active,
    utr.tenant_id
FROM profiles p
JOIN user_tenant_roles utr ON p.id = utr.user_id
WHERE utr.role IN ('technician', 'tech_head')
AND utr.is_active = true
ORDER BY utr.role, p.full_name;

-- STEP 4 (Optional): Update full_name untuk user yang masih pakai email
-- Ini akan membuat nama lebih mudah dibaca di dropdown
UPDATE profiles 
SET full_name = 'Delta - Technician'
WHERE id = '0f41a38b-7e0f-4b38-8971-7c31b8056d3e';

UPDATE profiles 
SET full_name = 'Putra - Technician'
WHERE id = 'b9421c07-ec8c-484d-9159-3a81914ce17e';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Technician roles assigned successfully!';
    RAISE NOTICE '📋 Refresh the New Order page to see technicians in dropdown';
END $$;
