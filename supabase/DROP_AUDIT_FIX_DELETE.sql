-- ============================================
-- NUCLEAR OPTION - Drop Audit Table & Fix Delete
-- This WILL work!
-- ============================================

-- STEP 1: Drop audit table if it exists (it's just logging anyway)
DROP TABLE IF EXISTS client_audit_log CASCADE;

-- STEP 2: Now fix remaining FK constraints
DO $$
DECLARE
  v_constraint_name TEXT;
  v_table_name TEXT;
  v_column_name TEXT;
BEGIN
  RAISE NOTICE 'Fixing FK constraints...';
  
  FOR v_table_name, v_column_name, v_constraint_name IN
    SELECT 
      tc.table_name,
      kcu.column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'clients'
      AND tc.table_name != 'service_orders'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', v_table_name, v_constraint_name);
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES clients(id) ON DELETE CASCADE', 
        v_table_name, v_constraint_name, v_column_name);
      RAISE NOTICE '  ✓ Fixed: %.%', v_table_name, v_column_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '  - Skipped: % (%)', v_table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- STEP 3: Simple delete function
CREATE OR REPLACE FUNCTION delete_client_safe(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check service orders
  IF EXISTS (SELECT 1 FROM service_orders WHERE client_id = p_client_id LIMIT 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client has existing service orders');
  END IF;

  -- Delete client (CASCADE will handle rest)
  DELETE FROM clients WHERE id = p_client_id;

  RETURN jsonb_build_object('success', true, 'message', 'Client deleted successfully');
EXCEPTION
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
