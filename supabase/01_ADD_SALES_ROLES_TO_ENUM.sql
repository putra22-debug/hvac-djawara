-- ============================================
-- STEP 1: ADD ENUM VALUES FOR SALES ROLES
-- Run this first and let it commit before running step 2
-- ============================================

-- Add new role values to enum
DO $$ 
BEGIN
    -- Add sales role
    BEGIN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Role "sales" already exists';
    END;
    
    -- Add marketing role  
    BEGIN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'marketing';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Role "marketing" already exists';
    END;
    
    -- Add business_dev role
    BEGIN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'business_dev';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Role "business_dev" already exists';
    END;
END $$;

-- Verify enum values added
SELECT unnest(enum_range(NULL::user_role))::text as available_roles
ORDER BY available_roles;
