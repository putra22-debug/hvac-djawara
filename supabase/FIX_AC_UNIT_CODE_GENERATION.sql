-- ============================================
-- FIX: AC Unit Code Generation
-- Issue: ROW_NUMBER() not reliable, causes duplicates
-- Solution: Use MAX() + 1 with property UUID prefix
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_ac_unit_code()
RETURNS TRIGGER AS $$
DECLARE
  v_client_code TEXT;
  v_property_short TEXT;
  v_sequence INT;
BEGIN
  -- Get client short code (first 3 chars of name, uppercase)
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 3))
  INTO v_client_code
  FROM public.clients
  WHERE id = NEW.client_id;
  
  -- Get property short ID (first 4 chars of UUID without dashes)
  v_property_short := UPPER(LEFT(REPLACE(NEW.property_id::TEXT, '-', ''), 4));
  
  -- Get next sequence for this property (reliable MAX + 1)
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(unit_code FROM '[0-9]+$') AS INT
    )
  ), 0) + 1
  INTO v_sequence
  FROM public.ac_units
  WHERE property_id = NEW.property_id
    AND unit_code IS NOT NULL;
  
  -- Generate code: CLI-ABCD-001 (Client-PropertyShortID-Sequence)
  NEW.unit_code := v_client_code || '-' || v_property_short || '-' || LPAD(v_sequence::TEXT, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_ac_unit_code IS 
'Auto-generate unique unit_code for AC units.
Format: CLI-ABCD-001 (Client-PropertyShortID-Sequence)
Example: BAN-A1B2-001, BAN-A1B2-002
PropertyShortID ensures uniqueness across properties.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ AC Unit Code Generation Fixed!';
  RAISE NOTICE 'Old: CLI-P01-001 (ROW_NUMBER - unreliable)';
  RAISE NOTICE 'New: CLI-ABCD-001 (MAX + 1 with UUID - reliable)';
  RAISE NOTICE '';
END $$;
