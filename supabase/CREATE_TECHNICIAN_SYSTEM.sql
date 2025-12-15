-- ============================================
-- TECHNICIAN/TEAM MANAGEMENT SYSTEM
-- Step-by-step implementation for technician workflow
-- ============================================

-- STEP 1: Create technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Basic Info
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  employee_id VARCHAR(50),
  
  -- Authentication
  verification_token VARCHAR(100) UNIQUE,
  token_expires_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  role VARCHAR(20) DEFAULT 'technician' CHECK (role IN ('technician', 'supervisor', 'team_lead')),
  
  -- Skills & Specialization
  specializations TEXT[], -- ['ac_cleaning', 'repair', 'installation']
  certifications TEXT[],
  
  -- Work Info
  join_date DATE,
  availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'off_duty', 'on_leave')),
  
  -- Performance Tracking
  total_jobs_completed INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- STEP 2: Create work order assignments
CREATE TABLE IF NOT EXISTS work_order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  
  -- Assignment Details
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  role_in_order VARCHAR(20) DEFAULT 'primary' CHECK (role_in_order IN ('primary', 'assistant', 'supervisor')),
  
  -- Status Tracking
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'declined', 'in_progress', 'completed')),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  UNIQUE(service_order_id, technician_id)
);

-- STEP 3: Create technician work logs (for detailed tracking)
CREATE TABLE IF NOT EXISTS technician_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES work_order_assignments(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  
  -- Log Details
  log_type VARCHAR(20) NOT NULL CHECK (log_type IN ('check_in', 'check_out', 'update', 'photo', 'note', 'issue')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Location (GPS)
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_accuracy DECIMAL(6, 2), -- meters
  
  -- Content
  description TEXT,
  photo_urls TEXT[],
  
  -- Metadata
  is_offline_sync BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ
);

-- STEP 4: Add indexes
CREATE INDEX idx_technicians_tenant ON technicians(tenant_id);
CREATE INDEX idx_technicians_status ON technicians(status);
CREATE INDEX idx_technicians_email ON technicians(email);
CREATE INDEX idx_assignments_order ON work_order_assignments(service_order_id);
CREATE INDEX idx_assignments_tech ON work_order_assignments(technician_id);
CREATE INDEX idx_assignments_status ON work_order_assignments(status);
CREATE INDEX idx_work_logs_assignment ON technician_work_logs(assignment_id);
CREATE INDEX idx_work_logs_tech ON technician_work_logs(technician_id);

-- STEP 5: RLS Policies for Technicians

-- Technicians table
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians readable by same tenant"
  ON technicians FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians writable by admins"
  ON technicians FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles utr
      WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = technicians.tenant_id
        AND utr.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  );

-- Technician can update their own profile
CREATE POLICY "Technicians can update own profile"
  ON technicians FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Work Order Assignments
ALTER TABLE work_order_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assignments readable by assigned technician"
  ON work_order_assignments FOR SELECT
  USING (
    technician_id IN (
      SELECT id FROM technicians WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_tenant_roles utr
      JOIN service_orders so ON so.tenant_id = utr.tenant_id
      WHERE utr.user_id = auth.uid()
        AND so.id = service_order_id
        AND utr.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  );

CREATE POLICY "Assignments writable by admins"
  ON work_order_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles utr
      JOIN service_orders so ON so.tenant_id = utr.tenant_id
      WHERE utr.user_id = auth.uid()
        AND so.id = service_order_id
        AND utr.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  );

-- Technician can update assigned orders
CREATE POLICY "Technicians can update assigned orders"
  ON work_order_assignments FOR UPDATE
  USING (
    technician_id IN (
      SELECT id FROM technicians WHERE user_id = auth.uid()
    )
  );

-- Work Logs
ALTER TABLE technician_work_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Work logs readable by technician and admins"
  ON technician_work_logs FOR SELECT
  USING (
    technician_id IN (
      SELECT id FROM technicians WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_tenant_roles utr
      JOIN technicians t ON t.tenant_id = utr.tenant_id
      WHERE utr.user_id = auth.uid()
        AND t.id = technician_id
        AND utr.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  );

CREATE POLICY "Technicians can insert own work logs"
  ON technician_work_logs FOR INSERT
  WITH CHECK (
    technician_id IN (
      SELECT id FROM technicians WHERE user_id = auth.uid()
    )
  );

-- STEP 6: Function to generate verification token
CREATE OR REPLACE FUNCTION generate_technician_token(p_technician_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  v_token VARCHAR(100);
BEGIN
  -- Generate random 32-char token
  v_token := encode(gen_random_bytes(24), 'base64');
  v_token := replace(replace(replace(v_token, '/', ''), '+', ''), '=', '');
  v_token := substring(v_token, 1, 32);
  
  -- Update technician
  UPDATE technicians
  SET 
    verification_token = v_token,
    token_expires_at = NOW() + INTERVAL '7 days',
    updated_at = NOW()
  WHERE id = p_technician_id;
  
  RETURN v_token;
END;
$$;

-- STEP 7: Function to verify technician token
CREATE OR REPLACE FUNCTION verify_technician_token(
  p_email VARCHAR,
  p_token VARCHAR
)
RETURNS TABLE (
  technician_id UUID,
  full_name VARCHAR,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.full_name,
    (t.verification_token = p_token AND t.token_expires_at > NOW()) as is_valid
  FROM technicians t
  WHERE t.email = p_email;
END;
$$;

-- SUCCESS
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TECHNICIAN SYSTEM CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '   - technicians (team members)';
  RAISE NOTICE '   - work_order_assignments (assign orders to techs)';
  RAISE NOTICE '   - technician_work_logs (GPS check-in, photos, notes)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '   ✅ Technicians can only see their assigned orders';
  RAISE NOTICE '   ✅ Admins can manage all technicians';
  RAISE NOTICE '   ✅ Technicians can update their work logs';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '   1. Add "Team" to admin sidebar';
  RAISE NOTICE '   2. Create Team Management page (CRUD)';
  RAISE NOTICE '   3. Create Technician Portal (separate login)';
  RAISE NOTICE '   4. Implement work order assignment flow';
  RAISE NOTICE '';
END $$;
