-- ============================================
-- CLIENT DATA MANAGEMENT & AC INVENTORY SYSTEM
-- Edit client data, audit trail, multi-property AC tracking
-- ============================================

-- ================================================
-- TABLE: Client Audit Log (History Tracking)
-- ================================================

CREATE TABLE IF NOT EXISTS public.client_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  change_type TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_client ON public.client_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON public.client_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.client_audit_log(changed_by);

ALTER TABLE public.client_audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.client_audit_log IS 
'Audit trail untuk semua perubahan data client.
Tracks: create, update, delete operations.
Stores: old_values, new_values dalam JSONB untuk comparison.';

-- ================================================
-- TABLE: Client Properties (Multi-Location)
-- ================================================

CREATE TABLE IF NOT EXISTS public.client_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Property Details
  property_name TEXT NOT NULL,
  property_type TEXT NOT NULL, -- 'residential', 'office', 'warehouse', 'factory', 'mall'
  address TEXT NOT NULL,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  
  -- Contact at Location
  pic_name TEXT,
  pic_phone TEXT,
  
  -- Property Specs
  building_size DECIMAL(10,2), -- m²
  floor_count INT,
  room_count INT,
  
  -- Status
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_properties_client ON public.client_properties(client_id);
CREATE INDEX IF NOT EXISTS idx_properties_tenant ON public.client_properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.client_properties(property_type);

ALTER TABLE public.client_properties ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.client_properties IS 
'Multi-location properties untuk client.
1 client bisa punya banyak properti (rumah, kantor, pabrik, dll).
Tiap properti tracked dengan detail lengkap.';

-- ================================================
-- TABLE: AC Units Inventory
-- ================================================

CREATE TABLE IF NOT EXISTS public.ac_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.client_properties(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Unit Identification
  unit_code TEXT UNIQUE, -- Auto-generated: CLI-PROP-001
  unit_name TEXT, -- "AC Ruang Tamu", "AC Meeting Room 1"
  location_detail TEXT, -- "Lantai 1, Ruang Tamu", "Lantai 2, Kamar Tidur Utama"
  
  -- AC Specifications
  brand TEXT NOT NULL, -- Daikin, Panasonic, LG, Samsung, Mitsubishi, Sharp, dll
  model TEXT,
  ac_type TEXT NOT NULL, -- 'split', 'window', 'cassette', 'ducted', 'vrv', 'chiller'
  capacity_pk DECIMAL(3,1) NOT NULL, -- 0.5, 1, 1.5, 2, 2.5, 3, 5, dll (PK)
  capacity_btu INT, -- Auto-calculate from PK: 1 PK = 9000 BTU
  
  -- Installation Details
  install_date DATE,
  purchase_price DECIMAL(12,2),
  warranty_months INT,
  warranty_expires_at DATE,
  
  -- Usage & Condition
  usage_hours_per_day DECIMAL(4,1), -- 8, 12, 24 jam/hari
  usage_pattern TEXT, -- 'daily', 'weekly', 'occasional'
  last_service_date DATE,
  next_service_due DATE,
  condition_status TEXT DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor', 'broken'
  
  -- Technical Details
  refrigerant_type TEXT, -- R32, R410A, R22, dll
  power_consumption_watt INT,
  voltage TEXT, -- '220V', '380V'
  phase TEXT, -- 'single', 'three'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_under_contract BOOLEAN DEFAULT false,
  contract_id UUID, -- FK to maintenance_contracts
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_ac_units_property ON public.ac_units(property_id);
CREATE INDEX IF NOT EXISTS idx_ac_units_client ON public.ac_units(client_id);
CREATE INDEX IF NOT EXISTS idx_ac_units_tenant ON public.ac_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ac_units_code ON public.ac_units(unit_code);
CREATE INDEX IF NOT EXISTS idx_ac_units_brand ON public.ac_units(brand);
CREATE INDEX IF NOT EXISTS idx_ac_units_type ON public.ac_units(ac_type);
CREATE INDEX IF NOT EXISTS idx_ac_units_contract ON public.ac_units(contract_id) WHERE contract_id IS NOT NULL;

ALTER TABLE public.ac_units ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ac_units IS 
'Inventory AC units per property.
Tiap unit tracked dengan detail lengkap: specs, history, condition.
Linked to maintenance contracts dan service orders.';

-- ================================================
-- FUNCTION: Auto-generate AC Unit Code
-- ================================================

CREATE OR REPLACE FUNCTION public.generate_ac_unit_code()
RETURNS TRIGGER AS $$
DECLARE
  v_client_code TEXT;
  v_property_code TEXT;
  v_sequence INT;
BEGIN
  -- Get client short code (first 3 chars of name)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO v_client_code
  FROM public.clients
  WHERE id = NEW.client_id;
  
  -- Get property sequence number
  SELECT LPAD((ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at))::TEXT, 2, '0')
  INTO v_property_code
  FROM public.client_properties
  WHERE id = NEW.property_id;
  
  -- Get AC unit sequence within property
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM public.ac_units
  WHERE property_id = NEW.property_id;
  
  -- Generate code: CLI-P01-001
  NEW.unit_code := v_client_code || '-P' || v_property_code || '-' || LPAD(v_sequence::TEXT, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ac_unit_code
  BEFORE INSERT ON public.ac_units
  FOR EACH ROW
  WHEN (NEW.unit_code IS NULL)
  EXECUTE FUNCTION public.generate_ac_unit_code();

-- ================================================
-- FUNCTION: Auto-calculate BTU from PK
-- ================================================

CREATE OR REPLACE FUNCTION public.calculate_btu_from_pk()
RETURNS TRIGGER AS $$
BEGIN
  -- 1 PK = 9000 BTU
  NEW.capacity_btu := (NEW.capacity_pk * 9000)::INT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_btu
  BEFORE INSERT OR UPDATE OF capacity_pk ON public.ac_units
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_btu_from_pk();

-- ================================================
-- FUNCTION: Update updated_at timestamp
-- ================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_properties_updated_at
  BEFORE UPDATE ON public.client_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_ac_units_updated_at
  BEFORE UPDATE ON public.ac_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ================================================
-- VIEW: Client AC Summary
-- ================================================

CREATE OR REPLACE VIEW public.v_client_ac_summary AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  COUNT(DISTINCT cp.id) as total_properties,
  COUNT(DISTINCT ac.id) as total_ac_units,
  SUM(CASE WHEN ac.is_active THEN 1 ELSE 0 END) as active_units,
  SUM(CASE WHEN ac.is_under_contract THEN 1 ELSE 0 END) as contracted_units,
  SUM(ac.capacity_pk) as total_capacity_pk,
  array_agg(DISTINCT ac.brand) FILTER (WHERE ac.brand IS NOT NULL) as brands_owned,
  MAX(ac.last_service_date) as last_service_date,
  MIN(ac.next_service_due) FILTER (WHERE ac.next_service_due >= CURRENT_DATE) as next_service_due
FROM public.clients c
LEFT JOIN public.client_properties cp ON cp.client_id = c.id AND cp.is_active = true
LEFT JOIN public.ac_units ac ON ac.client_id = c.id AND ac.is_active = true
GROUP BY c.id, c.name;

COMMENT ON VIEW public.v_client_ac_summary IS 
'Summary view: total properties, AC units, capacity, brands per client.
Useful untuk dashboard dan reporting.';

-- ================================================
-- RLS POLICIES
-- ================================================

-- Staff can view/manage all
CREATE POLICY "Staff can view all properties"
  ON public.client_properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.active_tenant_id = client_properties.tenant_id
    )
  );

CREATE POLICY "Staff can manage all AC units"
  ON public.ac_units FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.active_tenant_id = ac_units.tenant_id
    )
  );

-- Clients can view own properties
CREATE POLICY "Clients can view own properties"
  ON public.client_properties FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      AND portal_enabled = true
    )
  );

-- Clients can view own AC units
CREATE POLICY "Clients can view own AC units"
  ON public.ac_units FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      AND portal_enabled = true
    )
  );

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ CLIENT DATA MANAGEMENT & AC INVENTORY SYSTEM READY!';
  RAISE NOTICE '  ';
  RAISE NOTICE '📊 Tables Created:';
  RAISE NOTICE '  • client_audit_log - History tracking';
  RAISE NOTICE '  • client_properties - Multi-location support';
  RAISE NOTICE '  • ac_units - Complete AC inventory';
  RAISE NOTICE '  ';
  RAISE NOTICE '🔧 Features:';
  RAISE NOTICE '  • Auto-generate AC unit codes';
  RAISE NOTICE '  • Auto-calculate BTU from PK';
  RAISE NOTICE '  • Track warranty, service dates';
  RAISE NOTICE '  • Link to maintenance contracts';
  RAISE NOTICE '  • Complete audit trail';
END $$;
