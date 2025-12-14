-- ============================================
-- ADD SERVICE DETAIL FIELDS
-- Add job_type, job_category, unit_category to service_orders
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create enum types for service details
CREATE TYPE job_type_enum AS ENUM (
  'checking',
  'survey',
  'maintenance',
  'installation',
  'troubleshooting'
);

CREATE TYPE job_category_enum AS ENUM (
  'residential',
  'commercial',
  'industrial'
);

CREATE TYPE unit_category_enum AS ENUM (
  'split',
  'cassette',
  'standing_floor',
  'split_duct',
  'vrf_vrv',
  'cold_storage',
  'refrigerator',
  'other'
);

-- Step 2: Add new columns to service_orders table
ALTER TABLE public.service_orders
ADD COLUMN job_type job_type_enum,
ADD COLUMN job_category job_category_enum,
ADD COLUMN unit_category unit_category_enum;

-- Step 3: Verify columns were added
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'service_orders'
AND column_name IN ('job_type', 'job_category', 'unit_category');

-- Step 4: Show sample data structure
SELECT 
  order_number,
  service_title,
  job_type,
  job_category,
  unit_category,
  status
FROM public.service_orders
LIMIT 5;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ SERVICE DETAIL FIELDS ADDED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'New fields added to service_orders:';
  RAISE NOTICE '  • job_type: checking, survey, maintenance, installation, troubleshooting';
  RAISE NOTICE '  • job_category: residential, commercial, industrial';
  RAISE NOTICE '  • unit_category: split, cassette, standing_floor, split_duct, vrf_vrv, cold_storage, refrigerator, other';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Refresh your TypeScript types after this migration';
  RAISE NOTICE '';
END $$;
