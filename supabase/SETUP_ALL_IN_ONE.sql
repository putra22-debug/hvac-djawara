-- ============================================
-- ALL-IN-ONE SETUP SCRIPT
-- Company Settings + Quotations + Fix Duplicates
-- ============================================

-- ================================================
-- PART 1: SETUP COMPANY SETTINGS
-- ================================================

-- Add company columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_legal_name VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_trade_name VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_phone VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_email VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_website VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quotation_prefix VARCHAR(20) DEFAULT 'DTG-QT';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quotation_validity_days INT DEFAULT 30;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quotation_counter INT DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS npwp VARCHAR(30);

-- Update existing tenant with company data
UPDATE tenants SET
  company_legal_name = 'PT. Djawara Tiga Gunung',
  company_trade_name = 'HVAC Djawara',
  company_address = 'Jakarta, Indonesia',
  company_phone = '082242638999',
  company_email = 'pt.djawara3g@gmail.com',
  company_logo_url = 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/client-avatars/Logo%201.png',
  quotation_prefix = 'DTG-QT',
  quotation_validity_days = 30,
  quotation_counter = 0,
  bank_name = 'BNI',
  bank_account_number = '1540615648',
  bank_account_holder = 'PT. Djawara Tiga Gunung',
  npwp = '61.355.563.0-529.000',
  updated_at = NOW()
WHERE name = 'HVAC Djawara';

-- Create function to generate quotation number (DTG-QT/XII/001)
CREATE OR REPLACE FUNCTION generate_quotation_number(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  month_roman TEXT;
  counter INT;
  formatted_number TEXT;
  current_month INT;
  roman_months TEXT[] := ARRAY['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
BEGIN
  SELECT quotation_prefix, quotation_counter + 1
  INTO prefix, counter
  FROM tenants
  WHERE id = tenant_uuid;
  
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  month_roman := roman_months[current_month];
  formatted_number := prefix || '/' || month_roman || '/' || LPAD(counter::TEXT, 3, '0');
  
  UPDATE tenants SET quotation_counter = counter, updated_at = NOW() WHERE id = tenant_uuid;
  
  RETURN formatted_number;
END;
$$;

-- ================================================
-- PART 2: CREATE QUOTATIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_request_id UUID REFERENCES contract_requests(id) ON DELETE SET NULL,
  quotation_number VARCHAR(50) NOT NULL UNIQUE,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  client_company_name VARCHAR(200) NOT NULL,
  client_contact_person VARCHAR(100),
  client_phone VARCHAR(20),
  client_email VARCHAR(100),
  client_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 11,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  payment_terms TEXT,
  notes TEXT,
  terms_and_conditions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_contract_request ON quotations(contract_request_id);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(quotation_date DESC);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view quotations" ON quotations;
CREATE POLICY "Admins can view quotations" ON quotations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_tenant_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.tenant_id = quotations.tenant_id
    AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head', 'sales_partner')
  )
);

DROP POLICY IF EXISTS "Admins can create quotations" ON quotations;
CREATE POLICY "Admins can create quotations" ON quotations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_tenant_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.tenant_id = quotations.tenant_id
    AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head', 'sales_partner')
  )
);

DROP POLICY IF EXISTS "Admins can update quotations" ON quotations;
CREATE POLICY "Admins can update quotations" ON quotations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_tenant_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.tenant_id = quotations.tenant_id
    AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head', 'sales_partner')
  )
);

DROP POLICY IF EXISTS "Admins can delete quotations" ON quotations;
CREATE POLICY "Admins can delete quotations" ON quotations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_tenant_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.tenant_id = quotations.tenant_id
    AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head', 'sales_partner')
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_quotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quotations_updated_at ON quotations;
CREATE TRIGGER trigger_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_quotations_updated_at();

-- Helper function: Calculate totals
CREATE OR REPLACE FUNCTION calculate_quotation_totals(
  p_subtotal DECIMAL,
  p_discount_percent DECIMAL DEFAULT 0,
  p_tax_percent DECIMAL DEFAULT 11
)
RETURNS TABLE (discount_amount DECIMAL, tax_amount DECIMAL, total DECIMAL)
LANGUAGE plpgsql AS $$
DECLARE
  v_discount DECIMAL;
  v_after_discount DECIMAL;
  v_tax DECIMAL;
  v_total DECIMAL;
BEGIN
  v_discount := p_subtotal * (p_discount_percent / 100);
  v_after_discount := p_subtotal - v_discount;
  v_tax := v_after_discount * (p_tax_percent / 100);
  v_total := v_after_discount + v_tax;
  RETURN QUERY SELECT v_discount, v_tax, v_total;
END;
$$;

-- Helper function: Create quotation from request
CREATE OR REPLACE FUNCTION create_quotation_from_request(
  p_tenant_id UUID,
  p_contract_request_id UUID,
  p_items JSONB,
  p_subtotal DECIMAL,
  p_discount_percent DECIMAL DEFAULT 0,
  p_payment_terms TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_quotation_id UUID;
  v_quotation_number TEXT;
  v_valid_until DATE;
  v_discount_amount DECIMAL;
  v_tax_amount DECIMAL;
  v_total DECIMAL;
  v_request RECORD;
  v_validity_days INT;
BEGIN
  SELECT quotation_validity_days INTO v_validity_days FROM tenants WHERE id = p_tenant_id;
  v_quotation_number := generate_quotation_number(p_tenant_id);
  v_valid_until := CURRENT_DATE + (COALESCE(v_validity_days, 30) || ' days')::INTERVAL;
  SELECT * INTO v_discount_amount, v_tax_amount, v_total FROM calculate_quotation_totals(p_subtotal, p_discount_percent);
  SELECT * INTO v_request FROM contract_requests WHERE id = p_contract_request_id;
  
  INSERT INTO quotations (
    tenant_id, contract_request_id, quotation_number, quotation_date, valid_until,
    client_company_name, client_contact_person, client_phone, client_email, client_address,
    items, subtotal, discount_percent, discount_amount, tax_amount, total,
    payment_terms, notes, status, created_by
  ) VALUES (
    p_tenant_id, p_contract_request_id, v_quotation_number, CURRENT_DATE, v_valid_until,
    v_request.company_name, v_request.contact_person, v_request.phone, v_request.email, v_request.city,
    p_items, p_subtotal, p_discount_percent, v_discount_amount, v_tax_amount, v_total,
    p_payment_terms, p_notes, 'draft', auth.uid()
  ) RETURNING id INTO v_quotation_id;
  
  RETURN v_quotation_id;
END;
$$;

-- ================================================
-- PART 3: FIX DUPLICATE CONTRACT REQUESTS
-- ================================================

-- Delete all existing sample data
DELETE FROM contract_requests 
WHERE company_name IN ('PT Maju Jaya Elektronik', 'Hotel Grand Permata', 'RS Sehat Sentosa', 'Warung Kopi Modern');

-- Re-insert clean data (1 record per company)
INSERT INTO contract_requests (
  company_name, contact_person, phone, email, city,
  unit_count, location_count, preferred_frequency, notes, status
) VALUES
('PT Maju Jaya Elektronik', 'Budi Santoso', '081234567890', 'budi@majujaya.com', 'Jakarta Selatan',
 25, 3, 'monthly', 'Butuh perawatan rutin untuk 3 cabang', 'pending'),

('Hotel Grand Permata', 'Siti Aminah', '081234567891', 'siti@grandpermata.com', 'Jakarta Pusat',
 50, 1, 'quarterly', 'Hotel bintang 5 dengan 50 unit AC', 'pending'),

('RS Sehat Sentosa', 'Dr. Ahmad', '081234567892', 'ahmad@rssehat.com', 'Tangerang',
 100, 1, 'monthly', 'Rumah sakit membutuhkan perawatan intensif', 'pending'),

('Warung Kopi Modern', 'Rina Wijaya', '081234567893', 'rina@warkopmodern.com', 'Depok',
 5, 2, 'semi_annual', '2 cabang warung kopi', 'pending')
ON CONFLICT DO NOTHING;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ All-in-One Setup Completed Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Company Settings:';
  RAISE NOTICE '   Legal Name: PT. Djawara Tiga Gunung';
  RAISE NOTICE '   Phone: 082242638999';
  RAISE NOTICE '   Bank: BNI - 1540615648';
  RAISE NOTICE '   Quotation Format: DTG-QT/XII/NNN';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Quotations Table: Created';
  RAISE NOTICE '🔐 RLS Policies: Enabled';
  RAISE NOTICE '🔧 Functions: 3 created';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Contract Requests: 4 clean records';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Ready to create quotations!';
  RAISE NOTICE '';
END $$;
