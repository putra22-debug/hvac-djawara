-- ============================================
-- COMPREHENSIVE TECHNICAL REPORT SCHEMA UPDATE
-- Supports both SPK Kerja (internal) and BAST (client) formats
-- ============================================

-- 1. Create sparepart usage table
CREATE TABLE IF NOT EXISTS work_order_spareparts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_log_id UUID NOT NULL REFERENCES technician_work_logs(id) ON DELETE CASCADE,
  sparepart_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_spareparts_work_log ON work_order_spareparts(work_log_id);

-- 2. Add fields to technician_work_logs for BAST format
ALTER TABLE technician_work_logs
-- Core foreign key (in case not exists)
ADD COLUMN IF NOT EXISTS service_order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,

-- Time tracking (before/after)
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,

-- Photo captions (array matching documentation_photos)
ADD COLUMN IF NOT EXISTS photo_captions TEXT[],

-- Digital signatures (base64 or URL)
ADD COLUMN IF NOT EXISTS signature_technician TEXT,
ADD COLUMN IF NOT EXISTS signature_client TEXT,
ADD COLUMN IF NOT EXISTS signature_technician_name TEXT,
ADD COLUMN IF NOT EXISTS signature_client_name TEXT,
ADD COLUMN IF NOT EXISTS signature_date TIMESTAMPTZ,

-- BAST specific fields
ADD COLUMN IF NOT EXISTS nama_personal TEXT,
ADD COLUMN IF NOT EXISTS nama_instansi TEXT,
ADD COLUMN IF NOT EXISTS no_telephone TEXT,
ADD COLUMN IF NOT EXISTS alamat_lokasi TEXT,
ADD COLUMN IF NOT EXISTS jenis_pekerjaan TEXT,
ADD COLUMN IF NOT EXISTS rincian_pekerjaan TEXT,
ADD COLUMN IF NOT EXISTS rincian_kerusakan TEXT,
ADD COLUMN IF NOT EXISTS catatan_rekomendasi TEXT,

-- Metadata
ADD COLUMN IF NOT EXISTS report_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS report_type TEXT; -- 'spk' or 'bast'

-- Add comments for documentation
COMMENT ON TABLE work_order_spareparts IS 'Tracks spareparts and materials used in work orders';
COMMENT ON COLUMN technician_work_logs.start_time IS 'Waktu mulai pengerjaan (Sebelum)';
COMMENT ON COLUMN technician_work_logs.end_time IS 'Waktu selesai pengerjaan (Sesudah)';
COMMENT ON COLUMN technician_work_logs.photo_captions IS 'Array of captions for each photo in documentation_photos';
COMMENT ON COLUMN technician_work_logs.signature_technician IS 'Base64 encoded signature of technician';
COMMENT ON COLUMN technician_work_logs.signature_client IS 'Base64 encoded signature of client/PIC';
COMMENT ON COLUMN technician_work_logs.report_type IS 'Type of report: spk (detailed) or bast (summary)';

-- Enable RLS on spareparts table
ALTER TABLE work_order_spareparts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spareparts (using technicians table for tenant check)
CREATE POLICY "Users can view spareparts in their tenant"
  ON work_order_spareparts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM technician_work_logs wl
      JOIN technicians t ON wl.technician_id = t.id
      WHERE wl.id = work_order_spareparts.work_log_id
      AND t.tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Technicians can insert spareparts"
  ON work_order_spareparts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM technician_work_logs wl
      JOIN technicians t ON wl.technician_id = t.id
      WHERE wl.id = work_order_spareparts.work_log_id
      AND t.tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Technicians can update spareparts"
  ON work_order_spareparts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM technician_work_logs wl
      JOIN technicians t ON wl.technician_id = t.id
      WHERE wl.id = work_order_spareparts.work_log_id
      AND t.tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Technicians can delete spareparts"
  ON work_order_spareparts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM technician_work_logs wl
      JOIN technicians t ON wl.technician_id = t.id
      WHERE wl.id = work_order_spareparts.work_log_id
      AND t.tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Create view for complete work report
CREATE OR REPLACE VIEW complete_work_reports AS
SELECT 
  wl.*,
  so.order_number,
  so.service_title,
  so.service_description,
  so.location_address,
  c.name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  c.address as client_address,
  t.full_name as technician_name,
  t.employee_id as technician_employee_id,
  COALESCE(
    json_agg(
      json_build_object(
        'name', sp.sparepart_name,
        'quantity', sp.quantity,
        'unit', sp.unit,
        'notes', sp.notes
      ) ORDER BY sp.created_at
    ) FILTER (WHERE sp.id IS NOT NULL),
    '[]'::json
  ) as spareparts
FROM technician_work_logs wl
LEFT JOIN service_orders so ON wl.service_order_id = so.id
LEFT JOIN clients c ON so.client_id = c.id
LEFT JOIN technicians t ON wl.technician_id = t.id
LEFT JOIN work_order_spareparts sp ON sp.work_log_id = wl.id
GROUP BY wl.id, so.order_number, so.service_title, so.service_description, 
         so.location_address, c.name, c.email, c.phone, c.address,
         t.full_name, t.employee_id;

COMMENT ON VIEW complete_work_reports IS 'Complete work report data for PDF generation (SPK & BAST)';
