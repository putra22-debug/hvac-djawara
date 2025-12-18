-- ============================================
-- Service Reports Table
-- Store technician work reports and client ratings
-- ============================================

CREATE TABLE IF NOT EXISTS service_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Work timestamps
  work_started_at TIMESTAMPTZ NOT NULL,
  work_completed_at TIMESTAMPTZ NOT NULL,
  
  -- Work details
  work_description TEXT NOT NULL,
  findings TEXT,
  recommendations TEXT,
  parts_used JSONB DEFAULT '[]'::jsonb,
  
  -- Photos
  before_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  
  -- Signatures
  client_signature TEXT,
  technician_signature TEXT,
  
  -- Client rating (Premium feature)
  technician_rating INTEGER CHECK (technician_rating >= 1 AND technician_rating <= 5),
  client_feedback TEXT,
  rated_at TIMESTAMPTZ,
  
  -- Metadata
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(service_order_id)  -- One report per order
);

-- Indexes
CREATE INDEX idx_service_reports_order ON service_reports(service_order_id);
CREATE INDEX idx_service_reports_technician ON service_reports(technician_id);
CREATE INDEX idx_service_reports_tenant ON service_reports(tenant_id);
CREATE INDEX idx_service_reports_rating ON service_reports(technician_rating) WHERE technician_rating IS NOT NULL;

-- RLS Policies
ALTER TABLE service_reports ENABLE ROW LEVEL SECURITY;

-- Technicians can insert their own reports
CREATE POLICY "Technicians can create reports"
  ON service_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = technician_id
    AND tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Technicians can update their own reports (before rating)
CREATE POLICY "Technicians can update own reports"
  ON service_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = technician_id
    AND technician_rating IS NULL  -- Cannot edit after client rated
  )
  WITH CHECK (
    auth.uid() = technician_id
    AND technician_rating IS NULL
  );

-- Staff can view all reports in their tenant
CREATE POLICY "Staff can view reports"
  ON service_reports FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT active_tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Clients can view reports for their orders
CREATE POLICY "Clients can view their reports"
  ON service_reports FOR SELECT
  TO authenticated
  USING (
    service_order_id IN (
      SELECT id FROM service_orders 
      WHERE client_id = (SELECT id FROM clients WHERE user_id = auth.uid())
    )
  );

-- Clients can update rating only (Premium feature)
CREATE POLICY "Clients can rate reports"
  ON service_reports FOR UPDATE
  TO authenticated
  USING (
    service_order_id IN (
      SELECT id FROM service_orders 
      WHERE client_id = (SELECT id FROM clients WHERE user_id = auth.uid())
    )
    AND technician_rating IS NULL  -- Only if not rated yet
  )
  WITH CHECK (
    service_order_id IN (
      SELECT id FROM service_orders 
      WHERE client_id = (SELECT id FROM clients WHERE user_id = auth.uid())
    )
  );

-- Updated timestamp trigger
CREATE TRIGGER update_service_reports_updated_at
  BEFORE UPDATE ON service_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ service_reports table created successfully';
  RAISE NOTICE '📊 Technicians can create and update reports';
  RAISE NOTICE '⭐ Clients can view reports and add ratings (Premium)';
END $$;
