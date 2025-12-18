-- ============================================
-- MINIMAL DELETE - Just delete, let DB handle errors
-- ============================================

-- Simple delete function - no child table assumptions
CREATE OR REPLACE FUNCTION delete_client_safe(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if client has service orders (business rule: don't delete if has orders)
  IF EXISTS (SELECT 1 FROM service_orders WHERE client_id = p_client_id LIMIT 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client has existing service orders');
  END IF;

  -- Just delete the client - if there are FK constraints, the error will be caught
  DELETE FROM clients WHERE id = p_client_id;

  RETURN jsonb_build_object('success', true, 'message', 'Client deleted successfully');
EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete: client has related records');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION delete_clients_bulk(p_client_ids UUID[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_success INT := 0;
  v_fail INT := 0;
  v_result jsonb;
BEGIN
  FOREACH v_id IN ARRAY p_client_ids LOOP
    v_result := delete_client_safe(v_id);
    IF (v_result->>'success')::boolean THEN
      v_success := v_success + 1;
    ELSE
      v_fail := v_fail + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success_count', v_success, 'fail_count', v_fail);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_client_safe TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_clients_bulk TO authenticated, anon, service_role;

-- Success! Now refresh browser and test deletion
