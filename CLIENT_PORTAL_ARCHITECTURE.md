# 🌉 CLIENT PORTAL ARCHITECTURE
**Jembatan Data: Perusahaan ↔ Pelanggan**

## 📋 OVERVIEW

Client Portal adalah **dual-access platform** yang memungkinkan:
1. **Internal Staff** → Manage data client dan service history dari dashboard internal
2. **External Clients** → Login dan akses data mereka sendiri melalui portal khusus

**Filosofi:** Data yang sama, akses yang berbeda, security yang ketat.

---

## 🎯 VISI & TUJUAN

### Visi
Platform HVAC Djawara menjadi **single source of truth** untuk semua transaksi service, di mana:
- Perusahaan punya full control & visibility
- Client punya transparency & self-service access
- Data mengalir real-time tanpa duplikasi

### Tujuan Bisnis
✅ Transparansi penuh untuk client
✅ Mengurangi telepon/WA "update status order gimana?"
✅ Meningkatkan trust & customer satisfaction
✅ Professional image (tidak semua HVAC company punya portal)
✅ Client bisa download BAST/invoice sendiri
✅ Mengurangi beban admin CS

---

## 🏗️ ARSITEKTUR DUAL-PLATFORM

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                           │
│  (Single Source of Truth - RLS untuk Multi-Access)              │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│   INTERNAL   │   │    CLIENT    │
│  DASHBOARD   │   │    PORTAL    │
├──────────────┤   ├──────────────┤
│ /dashboard/* │   │ /client/*    │
│              │   │              │
│ Staff Login  │   │ Client Login │
│ Full Access  │   │ Own Data     │
│ Multi-Tenant │   │ Single-Tenant│
└──────────────┘   └──────────────┘
```

### URL Structure
```
https://hvac-djawara.vercel.app/
├── /                          → Landing Page (public)
├── /request-contract          → Public Form (anonymous)
├── /login                     → Staff Login
├── /dashboard/*               → Internal Dashboard (staff only)
│   ├── /clients               → Staff manage semua client
│   ├── /orders                → Staff manage semua order
│   ├── /contracts             → Staff manage semua kontrak
│   └── ...
│
└── /client/*                  → Client Portal (client login only)
    ├── /login                 → Client Login (separate dari staff)
    ├── /profile               → Client edit profil sendiri
    ├── /orders                → Client lihat order mereka sendiri
    ├── /contracts             → Client lihat kontrak mereka
    ├── /assets                → Client lihat aset/unit AC mereka
    ├── /maintenance-schedule  → Client lihat jadwal maintenance
    ├── /documents             → Client download BAST, invoice, quotation
    └── /payments              → Client lihat riwayat pembayaran
```

---

## 🗄️ DATABASE SCHEMA UPDATE

### 1. Extend `clients` table
```sql
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS 
  -- Client Portal Access
  portal_email TEXT UNIQUE,           -- Email untuk login portal (bisa beda dengan email kontak)
  portal_password_hash TEXT,          -- Password hash (via Supabase Auth)
  portal_enabled BOOLEAN DEFAULT false, -- Apakah client diizinkan akses portal
  portal_last_login TIMESTAMPTZ,      -- Track last login
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  whatsapp_notifications BOOLEAN DEFAULT true,
  
  -- Client Type Details
  client_type client_type NOT NULL DEFAULT 'residential', -- residential/commercial
  pic_name TEXT,                      -- PIC untuk corporate client
  pic_phone TEXT,                     -- Phone PIC
  
  -- Business Details (untuk corporate)
  company_npwp TEXT,                  -- NPWP perusahaan
  company_address_npwp TEXT,          -- Alamat sesuai NPWP
  
  -- Metadata
  source TEXT,                        -- Dari mana client datang (landing_page, referral, etc)
  notes_internal TEXT;                -- Notes internal staff (client tidak bisa lihat)
```

### 2. Create `client_portal_sessions` table (optional)
Track portal sessions secara terpisah dari staff sessions
```sql
CREATE TABLE public.client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_sessions_client ON public.client_portal_sessions(client_id);
CREATE INDEX idx_client_sessions_active ON public.client_portal_sessions(is_active) WHERE is_active = true;
```

### 3. Create `client_portal_activities` table
Audit trail untuk aktivitas client di portal
```sql
CREATE TABLE public.client_portal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- login, view_order, download_bast, etc
  resource_type TEXT,           -- order, contract, document, etc
  resource_id UUID,             -- ID dari resource yang diakses
  metadata JSONB,               -- Data tambahan
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_activities_client ON public.client_portal_activities(client_id);
CREATE INDEX idx_client_activities_date ON public.client_portal_activities(created_at);
```

---

## 🔐 AUTHENTICATION STRATEGY

### Two Separate Auth Flows

#### Flow 1: Staff Login (existing)
```typescript
// /login → Staff dashboard
// Uses: Supabase Auth with profiles table
// Role: checked via user_tenant_roles table
```

#### Flow 2: Client Login (new)
```typescript
// /client/login → Client portal
// Uses: Supabase Auth + clients table
// Role: always 'client' (no role table needed)
```

### Implementation Options

#### **Option A: Separate Supabase Auth Users** ⭐ RECOMMENDED
- Client portal menggunakan **Supabase Auth** penuh
- Buat user di `auth.users` saat activate portal
- Link via email: `clients.portal_email` → `auth.users.email`
- Metadata: `auth.users.user_metadata.client_id`

**Pros:**
- Full Supabase security features
- Password reset flows built-in
- Email verification ready
- MFA support if needed
- Session management by Supabase

**Cons:**
- Client ada di 2 tables (clients + auth.users)
- Need careful sync

**Implementation:**
```typescript
// When staff enables portal access for client
async function enableClientPortal(clientId: string, email: string) {
  const supabase = createServiceRoleClient()
  
  // 1. Create auth user
  const { data: authUser, error } = await supabase.auth.admin.createUser({
    email: email,
    email_confirm: false, // Require email confirmation
    user_metadata: {
      client_id: clientId,
      account_type: 'client', // Distinguish from staff
    }
  })
  
  // 2. Update clients table
  await supabase
    .from('clients')
    .update({
      portal_email: email,
      portal_enabled: true,
    })
    .eq('id', clientId)
  
  // 3. Send welcome email with set password link
  // ... email logic
}
```

#### **Option B: Custom JWT + clients table**
- Manual password hash di `clients.portal_password_hash`
- Manual JWT generation
- No Supabase Auth features

**Not Recommended** - terlalu banyak security concerns.

---

## 🛡️ ROW LEVEL SECURITY (RLS)

### Client Portal RLS Policies

```sql
-- ============================================
-- RLS untuk Client Portal Access
-- ============================================

-- Policy: Client hanya bisa lihat data mereka sendiri
CREATE POLICY "Clients can view own orders"
  ON public.service_orders
  FOR SELECT
  USING (
    -- Check if user is a client portal user
    auth.jwt() ->> 'account_type' = 'client'
    AND
    -- Check if order belongs to this client
    client_id = (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      LIMIT 1
    )
  );

CREATE POLICY "Clients can view own contracts"
  ON public.maintenance_contracts
  FOR SELECT
  USING (
    auth.jwt() ->> 'account_type' = 'client'
    AND
    client_id = (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      LIMIT 1
    )
  );

CREATE POLICY "Clients can view own profile"
  ON public.clients
  FOR SELECT
  USING (
    auth.jwt() ->> 'account_type' = 'client'
    AND
    portal_email = auth.email()
  );

CREATE POLICY "Clients can update own profile"
  ON public.clients
  FOR UPDATE
  USING (
    auth.jwt() ->> 'account_type' = 'client'
    AND
    portal_email = auth.email()
  )
  WITH CHECK (
    auth.jwt() ->> 'account_type' = 'client'
    AND
    portal_email = auth.email()
  );

-- Policy: Clients can view own BAST documents
CREATE POLICY "Clients can view own BAST"
  ON public.bast
  FOR SELECT
  USING (
    auth.jwt() ->> 'account_type' = 'client'
    AND
    client_id = (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      LIMIT 1
    )
  );

-- Policy: Clients can view own invoices
CREATE POLICY "Clients can view own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    auth.jwt() ->> 'account_type' = 'client'
    AND
    client_id = (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      LIMIT 1
    )
  );
```

---

## 🎨 CLIENT PORTAL FEATURES

### Feature 1: Dashboard Overview
**Path:** `/client/dashboard`

**Components:**
```typescript
<ClientDashboard>
  <WelcomeCard name={client.name} />
  <StatsCards>
    <StatCard icon={Package} label="Active Orders" value={3} />
    <StatCard icon={FileText} label="Active Contracts" value={1} />
    <StatCard icon={CheckCircle} label="Completed Orders" value={12} />
    <StatCard icon={Calendar} label="Next Maintenance" value="15 Jan 2025" />
  </StatsCards>
  
  <RecentOrders limit={5} />
  <UpcomingMaintenance limit={3} />
</ClientDashboard>
```

**Data:**
- Recent orders (last 5)
- Active contracts
- Upcoming maintenance schedules
- Unpaid invoices notification

---

### Feature 2: Order Tracking
**Path:** `/client/orders`

**Features:**
- List semua order client (filter: pending, in_progress, completed)
- Real-time status updates
- Order detail modal
- Track technician yang assigned
- View estimated time & actual time
- Download invoice & BAST per order

**UI:**
```typescript
<OrdersList>
  {orders.map(order => (
    <OrderCard
      orderNumber={order.order_number}
      status={order.status}
      serviceType={order.order_type}
      scheduledDate={order.scheduled_date}
      technicianName={order.technician?.full_name}
      canDownloadBAST={order.status === 'completed'}
    />
  ))}
</OrdersList>
```

---

### Feature 3: Service History
**Path:** `/client/orders/history`

**Features:**
- Timeline view semua order yang pernah dilakukan
- Filter by date range, service type
- Export to PDF/Excel
- See pattern (berapa kali maintenance per tahun, dll)

---

### Feature 4: Maintenance Contracts
**Path:** `/client/contracts`

**Features:**
- List active contracts
- View contract details (frequency, coverage, price)
- See maintenance schedule auto-generated
- Contract expiry notification
- Renewal request form

**UI:**
```typescript
<ContractCard>
  <ContractHeader
    contractNumber="MC-2024-001"
    status="active"
    startDate="01 Jan 2024"
    endDate="31 Dec 2024"
  />
  <ContractDetails
    frequency="Monthly"
    totalUnits={5}
    price="Rp 5,000,000/bulan"
  />
  <MaintenanceSchedule schedules={schedules} />
  <RenewalButton expiresIn={30} />
</ContractCard>
```

---

### Feature 5: Assets Management
**Path:** `/client/assets`

**Features:**
- List semua unit AC/HVAC milik client
- Detail per unit: brand, model, serial number, installation date
- Maintenance history per unit
- Next maintenance schedule per unit
- Unit health status (good, needs attention, critical)

**Data Structure:**
```typescript
interface ClientAsset {
  id: string
  client_id: string
  asset_type: 'ac_split' | 'ac_vrf' | 'ac_central' | 'ahu' | 'chiller'
  brand: string
  model: string
  serial_number: string
  location: string // "Ruang Meeting Lt 3"
  installation_date: Date
  warranty_expires: Date
  last_maintenance: Date
  next_maintenance: Date
  health_status: 'good' | 'needs_attention' | 'critical'
  maintenance_count: number
}
```

---

### Feature 6: Documents Center
**Path:** `/client/documents`

**Features:**
- Download BAST (Berita Acara Serah Terima)
- Download Invoice
- Download Quotation
- Download Contract PDF
- Download Maintenance Reports

**UI:**
```typescript
<DocumentsList>
  <DocumentCard
    type="BAST"
    orderNumber="SO-202501-0023"
    date="15 Jan 2025"
    downloadUrl="/api/documents/bast/uuid"
  />
  <DocumentCard
    type="Invoice"
    invoiceNumber="INV-202501-0045"
    amount="Rp 2,500,000"
    status="Paid"
    downloadUrl="/api/documents/invoice/uuid"
  />
</DocumentsList>
```

---

### Feature 7: Payment History
**Path:** `/client/payments`

**Features:**
- List semua pembayaran (paid, pending, overdue)
- Invoice details
- Payment proof upload
- Payment reminder

**Optional:** Integration dengan payment gateway (Midtrans, Xendit)

---

### Feature 8: Support & Communication
**Path:** `/client/support`

**Features:**
- Create new service request (redirect to form)
- Live chat dengan CS (optional)
- FAQ section
- Contact company info

---

## 📱 MOBILE RESPONSIVE DESIGN

**Priority:** Mobile-first design untuk client portal

**Reasoning:**
- Client lebih sering akses via mobile
- Staff pakai desktop, client pakai HP
- Simple, clean UI untuk client

---

## 🔔 NOTIFICATION SYSTEM

### In-App Notifications
- New order created → notify client
- Order status changed → notify client
- Technician assigned → notify client
- Order completed → notify client (with BAST link)
- Invoice generated → notify client
- Payment reminder → notify client
- Maintenance schedule upcoming → notify client

### Email Notifications
- Welcome email (when portal activated)
- Order confirmation
- Order completion (with BAST)
- Invoice reminder
- Contract expiry reminder

### WhatsApp Notifications (Optional)
- Order status updates
- Payment reminders
- Maintenance reminders

**Implementation:**
```typescript
// hooks/use-client-notifications.ts
export function useClientNotifications(clientId: string) {
  const supabase = createClient()
  
  useEffect(() => {
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('client-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_orders',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        toast.success(`Order ${payload.new.order_number} status: ${payload.new.status}`)
      })
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [clientId])
}
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Extend `clients` table with portal fields
- [ ] Create RLS policies for client access
- [ ] Setup client authentication flow
- [ ] Create `/client/login` page
- [ ] Create client dashboard layout

### Phase 2: Core Features (Week 3-4)
- [ ] Client Dashboard overview
- [ ] Order tracking & history
- [ ] Profile management
- [ ] Document downloads (BAST, Invoice)

### Phase 3: Advanced Features (Week 5-6)
- [ ] Contracts management view
- [ ] Assets management
- [ ] Maintenance schedule calendar
- [ ] Payment history

### Phase 4: Engagement (Week 7-8)
- [ ] Real-time notifications
- [ ] Email notifications
- [ ] WhatsApp integration
- [ ] Activity audit trail

### Phase 5: Polish (Week 9-10)
- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] Security audit
- [ ] User testing & feedback

---

## 🎯 SUCCESS METRICS

### Client Engagement
- % clients yang activate portal
- Average login frequency
- Document download rate
- Self-service order creation rate

### Business Impact
- Reduction in "status update" calls/messages
- Customer satisfaction score
- Repeat business rate
- Average response time to inquiries

### Technical
- Portal uptime
- Page load speed
- Error rate
- Security incidents

---

## 🔒 SECURITY CONSIDERATIONS

### Authentication
✅ Email verification required
✅ Strong password policy
✅ Password reset via email
✅ Session timeout (30 days)
✅ Device tracking (IP, user agent)

### Authorization
✅ RLS policies enforce client-only access
✅ No cross-tenant data leakage
✅ API routes validate client ownership
✅ Document URLs are signed (temporary access)

### Privacy
✅ Client can't see other clients' data
✅ Internal notes hidden from client
✅ Staff can disable portal access anytime
✅ Data export on request (GDPR compliance)

### Audit
✅ All portal activities logged
✅ Staff can see client portal usage
✅ Suspicious activity alerts
✅ Login history tracking

---

## 🎨 DESIGN PRINCIPLES

### For Client Portal
1. **Simplicity** - Tidak seperti dashboard internal yang complex
2. **Clarity** - Semua informasi jelas, tidak ada jargon teknis
3. **Trust** - Professional, reliable, no bugs
4. **Speed** - Fast loading, minimal steps
5. **Accessibility** - Mobile-first, easy navigation

### UI/UX Guidelines
- Use card-based layout
- Clear status badges with colors
- Timeline for order tracking
- Prominent CTA buttons
- Minimal form fields
- Auto-save preferences
- Contextual help text

---

## 📞 NEXT STEPS

1. **Review** arsitektur ini dengan team
2. **Decide** authentication strategy (Option A recommended)
3. **Design** UI mockups untuk client portal
4. **Prioritize** features (MVP first)
5. **Start** dengan Phase 1 implementation

---

## 💡 FUTURE ENHANCEMENTS

- **Multi-language support** (EN/ID)
- **Dark mode**
- **Mobile app** (React Native)
- **Client feedback/rating system**
- **Loyalty program integration**
- **Smart maintenance predictions** (AI-based)
- **Energy consumption tracking**
- **Carbon footprint calculator**

---

**Document Status:** Draft v1.0
**Last Updated:** 2025-01-20
**Author:** GitHub Copilot + User Collaboration
**Next Review:** After Phase 1 completion
