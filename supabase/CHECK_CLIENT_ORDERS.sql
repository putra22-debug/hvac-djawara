-- ============================================
-- Check Client Orders Data
-- Run this to verify client has orders
-- ============================================

-- Step 1: Find client "Putra" 
SELECT 
  id,
  name,
  phone,
  email,
  created_at
FROM clients
WHERE name ILIKE '%putra%'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check orders for this client (replace CLIENT_ID with result from step 1)
-- SELECT 
--   id,
--   order_number,
--   service_title,
--   job_type,
--   status,
--   scheduled_date,
--   client_id,
--   created_at
-- FROM service_orders
-- WHERE client_id = 'YOUR_CLIENT_ID_HERE'
-- ORDER BY created_at DESC;

-- Step 3: Check if there are ANY orders in the system
SELECT 
  COUNT(*) as total_orders,
  COUNT(DISTINCT client_id) as unique_clients
FROM service_orders;

-- Step 4: Show sample orders with client names
SELECT 
  so.id,
  so.order_number,
  so.service_title,
  so.job_type,
  so.status,
  so.scheduled_date,
  c.name as client_name,
  so.created_at
FROM service_orders so
LEFT JOIN clients c ON c.id = so.client_id
ORDER BY so.created_at DESC
LIMIT 10;
