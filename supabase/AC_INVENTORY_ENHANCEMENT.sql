-- ============================================
-- AC INVENTORY ENHANCEMENT
-- Add room name, barcode, photo documentation, and history tracking
-- ============================================

-- ================================================
-- PART 1: Enhance AC Units Table
-- ================================================

-- Add new columns to ac_units
ALTER TABLE public.ac_units ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE public.ac_units ADD COLUMN IF NOT EXISTS barcode_number TEXT UNIQUE;
ALTER TABLE public.ac_units ADD COLUMN IF NOT EXISTS unit_photo_url TEXT;
ALTER TABLE public.ac_units ADD COLUMN IF NOT EXISTS model_photo_url TEXT;
ALTER TABLE public.ac_units ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ac_units_barcode ON public.ac_units(barcode_number);
CREATE INDEX IF NOT EXISTS idx_ac_units_room ON public.ac_units(room_name);

COMMENT ON COLUMN public.ac_units.room_name IS 'Nama ruangan tempat AC dipasang (e.g., Ruang Meeting 1, Lobby, Kantor Manager)';
COMMENT ON COLUMN public.ac_units.barcode_number IS 'Nomor barcode unik untuk AC (auto-generated atau manual)';
COMMENT ON COLUMN public.ac_units.unit_photo_url IS 'URL foto unit AC aktual di lapangan';
COMMENT ON COLUMN public.ac_units.model_photo_url IS 'URL foto model/nameplate AC';
COMMENT ON COLUMN public.ac_units.qr_code_data IS 'Data untuk generate QR code (JSON format)';

-- ================================================
-- PART 2: Create AC History Table
-- ================================================

CREATE TABLE IF NOT EXISTS public.ac_unit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ac_unit_id UUID NOT NULL REFERENCES public.ac_units(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.client_properties(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Change Info
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created',           -- AC unit pertama kali ditambahkan
    'updated',           -- Update data AC
    'photo_updated',     -- Update foto
    'replaced',          -- AC diganti dengan unit baru
    'relocated',         -- AC dipindah ke ruang lain
    'maintenance',       -- Service/maintenance
    'removed'            -- AC dilepas/dihapus
  )),
  
  -- Old vs New Data (JSONB for flexibility)
  old_data JSONB,
  new_data JSONB,
  changes_summary TEXT,
  
  -- Documentation
  photos TEXT[],        -- Array of photo URLs
  notes TEXT,
  
  -- Who & When
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Related to service order (optional)
  related_order_id UUID REFERENCES public.service_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_ac_history_unit ON public.ac_unit_history(ac_unit_id);
CREATE INDEX IF NOT EXISTS idx_ac_history_property ON public.ac_unit_history(property_id);
CREATE INDEX IF NOT EXISTS idx_ac_history_date ON public.ac_unit_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ac_history_type ON public.ac_unit_history(change_type);

ALTER TABLE public.ac_unit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy for history
CREATE POLICY "Users can view AC history in their tenant"
ON public.ac_unit_history
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

COMMENT ON TABLE public.ac_unit_history IS 
'History tracking untuk semua perubahan AC unit.
Tracks: penggantian, update foto, relokasi, maintenance, dll.';

-- ================================================
-- PART 3: Create Trigger for Auto History
-- ================================================

CREATE OR REPLACE FUNCTION public.track_ac_unit_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_summary TEXT;
  changes_detected BOOLEAN := false;
BEGIN
  -- Skip if no authenticated user (system operations)
  IF auth.uid() IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Build change summary
  IF TG_OP = 'UPDATE' THEN
    change_summary := 'Updated: ';
    
    IF OLD.brand IS DISTINCT FROM NEW.brand THEN
      change_summary := change_summary || 'brand, ';
      changes_detected := true;
    END IF;
    
    IF OLD.model IS DISTINCT FROM NEW.model THEN
      change_summary := change_summary || 'model, ';
      changes_detected := true;
    END IF;
    
    IF OLD.room_name IS DISTINCT FROM NEW.room_name THEN
      change_summary := change_summary || 'room, ';
      changes_detected := true;
    END IF;
    
    IF OLD.unit_photo_url IS DISTINCT FROM NEW.unit_photo_url THEN
      change_summary := change_summary || 'unit_photo, ';
      changes_detected := true;
    END IF;
    
    IF OLD.model_photo_url IS DISTINCT FROM NEW.model_photo_url THEN
      change_summary := change_summary || 'model_photo, ';
      changes_detected := true;
    END IF;
    
    IF OLD.condition_status IS DISTINCT FROM NEW.condition_status THEN
      change_summary := change_summary || 'condition, ';
      changes_detected := true;
    END IF;
    
    change_summary := rtrim(change_summary, ', ');
    
    -- Only log if there are actual changes
    IF NOT changes_detected THEN
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'INSERT' THEN
    change_summary := 'AC unit created';
  ELSIF TG_OP = 'DELETE' THEN
    change_summary := 'AC unit removed';
  END IF;

  -- Insert history record
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.ac_unit_history (
      ac_unit_id, property_id, tenant_id, change_type,
      old_data, changes_summary, changed_by, changed_at
    ) VALUES (
      OLD.id,
      OLD.property_id,
      (SELECT tenant_id FROM public.client_properties WHERE id = OLD.property_id),
      'removed',
      to_jsonb(OLD),
      change_summary,
      auth.uid(),
      NOW()
    );
    RETURN OLD;
  ELSE
    INSERT INTO public.ac_unit_history (
      ac_unit_id, property_id, tenant_id, change_type,
      old_data, new_data, changes_summary, changed_by, changed_at
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      NEW.property_id,
      (SELECT tenant_id FROM public.client_properties WHERE id = NEW.property_id),
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'created'
        WHEN OLD.unit_photo_url IS DISTINCT FROM NEW.unit_photo_url 
          OR OLD.model_photo_url IS DISTINCT FROM NEW.model_photo_url THEN 'photo_updated'
        WHEN OLD.room_name IS DISTINCT FROM NEW.room_name THEN 'relocated'
        ELSE 'updated'
      END,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW),
      change_summary,
      auth.uid(),
      NOW()
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_track_ac_unit_changes ON public.ac_units;
CREATE TRIGGER trigger_track_ac_unit_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.ac_units
  FOR EACH ROW
  EXECUTE FUNCTION public.track_ac_unit_changes();

-- ================================================
-- PART 4: Function to Generate Barcode Number
-- ================================================

CREATE OR REPLACE FUNCTION public.generate_ac_barcode(
  p_client_id UUID,
  p_property_id UUID
)
RETURNS TEXT AS $$
DECLARE
  client_code TEXT;
  property_code TEXT;
  sequence_num INT;
  barcode TEXT;
BEGIN
  -- Get client code (first 3 letters of name, uppercase)
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 3))
  INTO client_code
  FROM public.clients WHERE id = p_client_id;
  
  -- Get property code (first 3 letters, uppercase)
  SELECT UPPER(LEFT(REGEXP_REPLACE(property_name, '[^a-zA-Z]', '', 'g'), 3))
  INTO property_code
  FROM public.client_properties WHERE id = p_property_id;
  
  -- Get next sequence number for this property
  SELECT COALESCE(MAX(CAST(SUBSTRING(barcode_number FROM '[0-9]+$') AS INT)), 0) + 1
  INTO sequence_num
  FROM public.ac_units
  WHERE property_id = p_property_id AND barcode_number IS NOT NULL;
  
  -- Generate barcode: CLT-PRO-0001
  barcode := client_code || '-' || property_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN barcode;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_ac_barcode IS 
'Generate unique barcode untuk AC unit.
Format: CLT-PRO-0001 (Client-Property-Sequence)';

-- ================================================
-- PART 5: View for AC Inventory with History
-- ================================================

CREATE OR REPLACE VIEW public.v_ac_inventory_with_history AS
SELECT 
  ac.id,
  ac.property_id,
  cp.property_name,
  cp.client_id,
  c.name AS client_name,
  ac.room_name,
  ac.barcode_number,
  ac.ac_type,
  ac.brand,
  ac.model,
  ac.capacity_pk,
  ac.capacity_btu,
  ac.condition_status,
  ac.install_date,
  ac.warranty_expires_at,
  ac.last_service_date,
  ac.next_service_due,
  ac.unit_photo_url,
  ac.model_photo_url,
  ac.notes,
  ac.created_at,
  -- History summary
  (SELECT COUNT(*) FROM public.ac_unit_history WHERE ac_unit_id = ac.id) AS history_count,
  (SELECT MAX(changed_at) FROM public.ac_unit_history WHERE ac_unit_id = ac.id) AS last_change_date,
  (SELECT change_type FROM public.ac_unit_history WHERE ac_unit_id = ac.id ORDER BY changed_at DESC LIMIT 1) AS last_change_type
FROM public.ac_units ac
JOIN public.client_properties cp ON ac.property_id = cp.id
JOIN public.clients c ON cp.client_id = c.id
ORDER BY ac.created_at DESC;

-- ================================================
-- FINAL: Verification
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ AC INVENTORY ENHANCEMENT COMPLETED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 New Features:';
  RAISE NOTICE '  1. Room name field added';
  RAISE NOTICE '  2. Barcode generation system';
  RAISE NOTICE '  3. Photo documentation (unit & model)';
  RAISE NOTICE '  4. Complete history tracking';
  RAISE NOTICE '  5. Auto-logging for all changes';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Next Steps:';
  RAISE NOTICE '  1. Create storage bucket: ac-photos';
  RAISE NOTICE '  2. Update UI components';
  RAISE NOTICE '  3. Add QR code generation';
  RAISE NOTICE '  4. Test photo upload';
  RAISE NOTICE '';
END $$;
