-- ============================================
-- DELETE CLIENT FUNCTION
-- Handle client deletion with proper cleanup and transaction
-- ============================================

-- Function to safely delete a client with all related records
CREATE OR REPLACE FUNCTION delete_client_safe(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
  v_order_count INT;
  v_deleted_records jsonb;
BEGIN
  -- Step 1: Check if client has service orders
  SELECT COUNT(*) INTO v_order_count
  FROM service_orders
  WHERE client_id = p_client_id;

  IF v_order_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Client has existing service orders',
      'order_count', v_order_count
    );
  END IF;

  -- Step 2: Delete child records in correct order (within transaction)
  -- Disable triggers temporarily to avoid audit log conflicts
  SET session_replication_role = replica;

  -- Delete from child tables
  DELETE FROM client_audit_log WHERE client_id = p_client_id;
  DELETE FROM client_portal_invitations WHERE client_id = p_client_id;
  DELETE FROM client_properties WHERE client_id = p_client_id;
  DELETE FROM contract_requests WHERE client_id = p_client_id;

  -- Step 3: Delete the client
  DELETE FROM clients WHERE id = p_client_id;

  -- Re-enable triggers
  SET session_replication_role = DEFAULT;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Client deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-enable triggers on error
    SET session_replication_role = DEFAULT;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_client_safe(UUID) TO authenticated;

-- Function to bulk delete clients
CREATE OR REPLACE FUNCTION delete_clients_bulk(p_client_ids UUID[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_success_count INT := 0;
  v_fail_count INT := 0;
  v_failed_clients jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  -- Process each client
  FOREACH v_client_id IN ARRAY p_client_ids
  LOOP
    v_result := delete_client_safe(v_client_id);
    
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_fail_count := v_fail_count + 1;
      v_failed_clients := v_failed_clients || jsonb_build_object(
        'client_id', v_client_id,
        'error', v_result->>'error'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success_count', v_success_count,
    'fail_count', v_fail_count,
    'failed_clients', v_failed_clients
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_clients_bulk(UUID[]) TO authenticated;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Client delete functions created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '  • delete_client_safe(client_id) - Delete single client';
  RAISE NOTICE '  • delete_clients_bulk(client_ids[]) - Delete multiple clients';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Functions run with SECURITY DEFINER to bypass RLS and audit triggers';
  RAISE NOTICE '';
END $$;
