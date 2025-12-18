-- ============================================
-- SIMPLE CLIENT DELETE - Direct Approach
-- Just delete the client, let database handle cascade
-- ============================================

-- Create simple delete function
CREATE OR REPLACE FUNCTION delete_client_safe(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_count INT;
BEGIN
  -- Check for service orders
  SELECT COUNT(*) INTO v_order_count
  FROM service_orders
  WHERE client_id = p_client_id;

  IF v_order_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Client has existing service orders'
    );
  END IF;

  -- Just delete the client - let CASCADE or FK errors happen naturally
  DELETE FROM clients WHERE id = p_client_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Client deleted successfully'
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    -- If FK error, try to be more helpful
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete client: has related records',
      'detail', SQLERRM
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_client_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_client_safe(UUID) TO anon;

-- Create bulk delete function
CREATE OR REPLACE FUNCTION delete_clients_bulk(p_client_ids UUID[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_success_count INT := 0;
  v_fail_count INT := 0;
  v_failed jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  FOREACH v_client_id IN ARRAY p_client_ids
  LOOP
    -- Use the single delete function
    v_result := delete_client_safe(v_client_id);
    
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_fail_count := v_fail_count + 1;
      v_failed := v_failed || jsonb_build_object(
        'client_id', v_client_id,
        'error', v_result->>'error'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success_count', v_success_count,
    'fail_count', v_fail_count,
    'failed_clients', v_failed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_clients_bulk(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_clients_bulk(UUID[]) TO anon;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Simple client delete functions created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 This version:';
  RAISE NOTICE '  • Checks for service orders first';
  RAISE NOTICE '  • Attempts direct DELETE on clients table';
  RAISE NOTICE '  • Lets database CASCADE handle child records';
  RAISE NOTICE '  • Returns helpful errors if deletion fails';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test: Try deleting a client now';
  RAISE NOTICE '';
END $$;
