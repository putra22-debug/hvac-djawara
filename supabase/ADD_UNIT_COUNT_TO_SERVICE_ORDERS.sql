-- ============================================
-- ADD UNIT COUNT TO SERVICE_ORDERS
-- Purpose: Support "Jumlah Unit" field on service orders
-- Notes:
--  - unit_category already exists in ADD_SERVICE_DETAIL_FIELDS.sql (optional)
--  - This script is safe to run multiple times (IF NOT EXISTS)
-- ============================================

ALTER TABLE public.service_orders
ADD COLUMN IF NOT EXISTS unit_count INTEGER;

COMMENT ON COLUMN public.service_orders.unit_count IS
'Jumlah unit AC / equipment count for this service order.';

-- Optional: quick verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_orders'
  AND column_name IN ('unit_count', 'unit_category');
