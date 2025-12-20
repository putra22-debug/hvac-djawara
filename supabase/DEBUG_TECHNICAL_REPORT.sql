-- DEBUG: Check saved technical report data
-- Run this to see what data was actually saved

-- 1. Check work log data
SELECT 
  id,
  service_order_id,
  technician_id,
  log_type,
  problem,
  tindakan,
  signature_client,
  signature_technician,
  completed_at,
  created_at
FROM technician_work_logs
WHERE service_order_id = 'YOUR_ORDER_ID_HERE'  -- Replace with actual order ID
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check if client_documents entry was created
SELECT 
  id,
  document_name,
  document_type,
  related_order_id,
  client_id,
  tenant_id,
  status,
  uploaded_at
FROM client_documents
WHERE related_order_id = 'YOUR_ORDER_ID_HERE'  -- Replace with actual order ID
ORDER BY uploaded_at DESC;

-- 3. Check service order status
SELECT 
  id,
  order_number,
  status,
  client_id
FROM service_orders
WHERE id = 'YOUR_ORDER_ID_HERE';  -- Replace with actual order ID
