-- ============================================
-- AUTO UPDATE ORDER STATUS BASED ON DATE
-- Automatically move past orders to history/completed
-- ============================================

-- Function: Auto-update status for past scheduled orders
CREATE OR REPLACE FUNCTION auto_update_past_orders()
RETURNS void AS $$
BEGIN
  -- Update orders that are scheduled in the past but still pending/listing
  UPDATE service_orders
  SET status = 'completed'
  WHERE status IN ('listing', 'pending', 'scheduled')
    AND scheduled_date < CURRENT_DATE
    AND scheduled_date IS NOT NULL;

  -- Log the update
  RAISE NOTICE '✅ Updated past orders to completed status';
END;
$$ LANGUAGE plpgsql;

-- Function: Get order status based on date (for display logic)
CREATE OR REPLACE FUNCTION get_order_category(
  p_scheduled_date DATE,
  p_status TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- If already completed or cancelled, return as is
  IF p_status IN ('completed', 'cancelled') THEN
    RETURN 'history';
  END IF;

  -- If no scheduled date, it's in backlog
  IF p_scheduled_date IS NULL THEN
    RETURN 'backlog';
  END IF;

  -- If scheduled date is in the past, it should be history
  IF p_scheduled_date < CURRENT_DATE THEN
    RETURN 'history';
  END IF;

  -- If scheduled date is today, it's current
  IF p_scheduled_date = CURRENT_DATE THEN
    RETURN 'current';
  END IF;

  -- If scheduled date is in the future, it's upcoming
  RETURN 'upcoming';
END;
$$ LANGUAGE plpgsql;

-- Create a view for orders with proper categorization
CREATE OR REPLACE VIEW orders_with_category AS
SELECT 
  so.*,
  get_order_category(so.scheduled_date, so.status) AS order_category
FROM service_orders so;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Auto-update order status functions created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage:';
  RAISE NOTICE '  • SELECT auto_update_past_orders(); -- Run manually or via cron';
  RAISE NOTICE '  • SELECT * FROM orders_with_category; -- View with categories';
  RAISE NOTICE '';
  RAISE NOTICE 'Categories:';
  RAISE NOTICE '  📋 backlog - No scheduled date yet';
  RAISE NOTICE '  📅 upcoming - Scheduled for future';
  RAISE NOTICE '  ⏰ current - Scheduled for today';
  RAISE NOTICE '  ✅ history - Past date or completed';
END $$;

-- Run initial update
SELECT auto_update_past_orders();
