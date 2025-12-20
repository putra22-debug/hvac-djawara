-- Fix foreign key constraints to allow CASCADE DELETE for service_orders
-- This allows deleting service orders even when referenced by client_documents

-- Drop and recreate client_documents foreign key with CASCADE
ALTER TABLE client_documents
  DROP CONSTRAINT IF EXISTS client_documents_related_order_id_fkey;

ALTER TABLE client_documents
  ADD CONSTRAINT client_documents_related_order_id_fkey
  FOREIGN KEY (related_order_id)
  REFERENCES service_orders(id)
  ON DELETE CASCADE;

-- Also check and fix other tables that might reference service_orders
-- Fix technician_work_logs foreign key
ALTER TABLE technician_work_logs
  DROP CONSTRAINT IF EXISTS technician_work_logs_service_order_id_fkey;

ALTER TABLE technician_work_logs
  ADD CONSTRAINT technician_work_logs_service_order_id_fkey
  FOREIGN KEY (service_order_id)
  REFERENCES service_orders(id)
  ON DELETE CASCADE;

-- Fix technician_assignments foreign key
ALTER TABLE technician_assignments
  DROP CONSTRAINT IF EXISTS technician_assignments_order_id_fkey;

ALTER TABLE technician_assignments
  ADD CONSTRAINT technician_assignments_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES service_orders(id)
  ON DELETE CASCADE;

-- Fix work_order_spareparts foreign key (via work_log_id)
-- This should cascade from technician_work_logs
ALTER TABLE work_order_spareparts
  DROP CONSTRAINT IF EXISTS work_order_spareparts_work_log_id_fkey;

ALTER TABLE work_order_spareparts
  ADD CONSTRAINT work_order_spareparts_work_log_id_fkey
  FOREIGN KEY (work_log_id)
  REFERENCES technician_work_logs(id)
  ON DELETE CASCADE;

-- Verify constraints
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  confdeltype AS on_delete_action
FROM pg_constraint
WHERE confrelid = 'service_orders'::regclass
  AND contype = 'f'
ORDER BY conname;

COMMENT ON CONSTRAINT client_documents_related_order_id_fkey ON client_documents IS 'CASCADE delete client documents when service order is deleted';
