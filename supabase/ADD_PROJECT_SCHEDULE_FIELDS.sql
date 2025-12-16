-- ============================================
-- ADD PROJECT SCHEDULE FIELDS TO SERVICE ORDERS
-- Add estimated end date/time for project-based scheduling
-- ============================================

-- Add estimated_end_date and estimated_end_time columns
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS estimated_end_date DATE,
ADD COLUMN IF NOT EXISTS estimated_end_time TIME;

-- Add comment for documentation
COMMENT ON COLUMN service_orders.estimated_end_date IS 'Estimated project completion date';
COMMENT ON COLUMN service_orders.estimated_end_time IS 'Estimated project completion time (24H format)';

-- Verify columns added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'service_orders'
AND column_name IN ('estimated_end_date', 'estimated_end_time', 'scheduled_date', 'scheduled_time')
ORDER BY ordinal_position;

-- Show sample data structure
SELECT 
    order_number,
    service_title,
    scheduled_date,
    scheduled_time,
    estimated_end_date,
    estimated_end_time,
    status
FROM service_orders
LIMIT 5;
