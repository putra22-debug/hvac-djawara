-- ============================================
-- UPDATE ORDER STATUS WORKFLOW
-- Add 'listing' and 'pending' status
-- Run this in Supabase SQL Editor
-- ============================================

-- IMPORTANT: Run each step separately (one at a time)
-- After running Step 1, wait 2 seconds, then run Step 2

-- ============================================
-- STEP 1: Add new enum values
-- ============================================
DO $$
BEGIN
  -- Add 'listing' status (for all new requests/proposals)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'listing' AND enumtypid = 'order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'listing' BEFORE 'pending';
    RAISE NOTICE '✓ Added listing status';
  ELSE
    RAISE NOTICE '  listing status already exists';
  END IF;

  -- Add 'pending' status (for work on hold)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'pending' AFTER 'in_progress';
    RAISE NOTICE '✓ Added pending status';
  ELSE
    RAISE NOTICE '  pending status already exists';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✓ STEP 1 COMPLETE - Wait 2 seconds then run STEP 2';
END $$;

-- ============================================
-- STEP 2: Update existing data (run after Step 1)
-- ============================================
-- DO $$
-- DECLARE
--   updated_count INT;
-- BEGIN
--   UPDATE public.service_orders
--   SET status = 'listing'
--   WHERE status = 'pending';
--   
--   GET DIAGNOSTICS updated_count = ROW_COUNT;
--   
--   RAISE NOTICE '✓ Updated % orders from pending to listing', updated_count;
-- END $$;

-- Step 3: Verify new status enum values
SELECT 
  enumlabel as status_value,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'order_status'::regtype
ORDER BY enumsortorder;

-- Step 4: Show updated order counts by status
SELECT 
  status,
  COUNT(*) as count
FROM public.service_orders
WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'listing' THEN 1
    WHEN 'scheduled' THEN 2
    WHEN 'in_progress' THEN 3
    WHEN 'pending' THEN 4
    WHEN 'completed' THEN 5
    WHEN 'cancelled' THEN 6
  END;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ ORDER STATUS WORKFLOW UPDATED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'New workflow:';
  RAISE NOTICE '  1. listing     - New requests/proposals';
  RAISE NOTICE '  2. scheduled   - Approved and scheduled';
  RAISE NOTICE '  3. in_progress - Survey/action/checking';
  RAISE NOTICE '  4. pending     - On hold (spareparts/reschedule)';
  RAISE NOTICE '  5. completed   - Finished and clear';
  RAISE NOTICE '  6. cancelled   - Cancelled work/proposal';
  RAISE NOTICE '';
END $$;
