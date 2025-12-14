# Client Data Management & AC Inventory System
**Complete Asset Management with Multi-Property Support**

## 🎯 Overview
Comprehensive client data management system with editable information, multi-property support, detailed AC inventory tracking, and complete audit trail. Designed for HVAC businesses managing multiple properties and equipment per client.

---

## 📊 Database Schema

### 1. Client Audit Log (`client_audit_log`)
Track all changes to client data with complete history.

```sql
CREATE TABLE client_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- JSON diff between old and new values
- Track specific fields modified
- User attribution (who made the change)
- Timestamp for every modification

---

### 2. Client Properties (`client_properties`)
Support multiple locations per client (residential/commercial).

```sql
CREATE TABLE client_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  property_name VARCHAR(255) NOT NULL,
  property_type VARCHAR(50) CHECK (property_type IN ('residential', 'commercial')),
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  coordinates VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Use Cases:**
- Client with multiple homes
- Business with multiple branches
- Property management companies
- Real estate developers

---

### 3. AC Units (`ac_units`)
Detailed inventory tracking for every AC unit.

```sql
CREATE TABLE ac_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  property_id UUID REFERENCES client_properties(id) ON DELETE CASCADE,
  unit_code VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: CLI-P01-001
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  ac_type VARCHAR(50) NOT NULL,
  capacity_pk NUMERIC(4,1) NOT NULL,
  capacity_btu INTEGER NOT NULL,
  installation_date DATE,
  warranty_until DATE,
  last_service_date DATE,
  next_service_due DATE,
  condition_status VARCHAR(20) CHECK (condition_status IN 
    ('excellent', 'good', 'fair', 'poor', 'broken')),
  notes TEXT,
  contract_id UUID REFERENCES maintenance_contracts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**AC Types Supported:**
- Split Wall
- Split Floor
- Cassette
- Ducted
- VRV/VRF
- Chiller
- Window

**Auto-Generated Unit Codes:**
Format: `CLI-{property_id}-{sequence}`
Example: `CLI-P01-001`, `CLI-P02-015`

---

## 🎨 UI Components

### 1. EditClientForm
**Path:** `components/client-portal/EditClientForm.tsx`

**Features:**
- Edit basic information (name, email, phone, address)
- Client type selection (residential/commercial)
- Business details for commercial clients (PIC, NPWP)
- Internal notes (staff only)
- Real-time validation
- Success/error feedback
- Automatic audit logging via database trigger

**Props:**
```typescript
interface EditClientFormProps {
  client: any
  onSave: () => void
  onCancel: () => void
}
```

---

### 2. PropertyManagement
**Path:** `components/client-portal/PropertyManagement.tsx`

**Features:**
- Add/edit/delete properties
- Set primary property
- Property type (residential/commercial)
- Full address with city and postal code
- Optional GPS coordinates
- AC unit count per property
- Inline editing
- Confirmation before deletion

**Props:**
```typescript
interface PropertyManagementProps {
  clientId: string
}
```

**UI Flow:**
1. View list of all properties
2. Click "Add Property" to open form
3. Fill in property details
4. Set as primary if needed
5. Edit/delete existing properties
6. Star icon indicates primary property

---

### 3. ACInventoryManager
**Path:** `components/client-portal/ACInventoryManager.tsx`

**Features:**
- Add/edit/delete AC units
- Link to specific property
- Brand and model tracking
- AC type selection (8 types)
- Capacity in PK (auto-calculate BTU)
- Installation and warranty dates
- Service schedule tracking
- Condition status with color coding
- Auto-generate unit codes
- Notes for each unit

**Props:**
```typescript
interface ACInventoryManagerProps {
  clientId: string
}
```

**Condition Status Colors:**
- 🟢 Excellent - Green
- 🔵 Good - Blue
- 🟡 Fair - Yellow
- 🟠 Poor - Orange
- 🔴 Broken - Red

---

### 4. AuditLogViewer
**Path:** `components/client-portal/AuditLogViewer.tsx`

**Features:**
- Display all client data changes
- Show old vs new values side by side
- User attribution (who changed)
- Timestamp for each change
- Field-level granularity
- JSON diff support
- Color-coded changes (old=gray, new=blue)
- Last 50 changes displayed

**Props:**
```typescript
interface AuditLogViewerProps {
  clientId: string
}
```

---

## 📱 Client Detail Page Integration

### Updated Page Structure
**Path:** `app/dashboard/clients/[id]/page.tsx`

**New Features:**
- Tabbed interface (Client Info / Properties / AC Inventory / Audit Log)
- Edit mode toggle for client info
- Real-time data refresh after edits
- Responsive design
- Share client link sidebar (always visible)

**Tab Navigation:**
```tsx
<nav>
  <button>Client Info</button>
  <button>Properties</button>
  <button>AC Inventory</button>
  <button>Change History</button>
</nav>
```

**State Management:**
```typescript
const [activeTab, setActiveTab] = useState<'info' | 'properties' | 'inventory' | 'audit'>('info')
const [editMode, setEditMode] = useState(false)
```

---

## 🔒 Security (RLS Policies)

### All tables protected with Row-Level Security:

```sql
-- Properties: Only tenant staff can access
CREATE POLICY "Tenant staff can manage properties"
  ON client_properties
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE tenant_id = auth.jwt()->>'tenant_id'
    )
  );

-- AC Units: Only tenant staff can access
CREATE POLICY "Tenant staff can manage AC units"
  ON ac_units
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE tenant_id = auth.jwt()->>'tenant_id'
    )
  );

-- Audit Log: Read-only for tenant staff
CREATE POLICY "Tenant staff can view audit logs"
  ON client_audit_log
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE tenant_id = auth.jwt()->>'tenant_id'
    )
  );
```

---

## 🚀 Deployment Steps

### 1. Execute SQL Migration
```bash
# In Supabase SQL Editor, run:
supabase/CLIENT_DATA_MANAGEMENT.sql
```

This creates:
- ✅ `client_audit_log` table
- ✅ `client_properties` table
- ✅ `ac_units` table
- ✅ `update_client_data()` trigger function
- ✅ Trigger on `clients` table
- ✅ RLS policies for all tables
- ✅ Indexes for performance

### 2. Verify Deployment
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('client_audit_log', 'client_properties', 'ac_units');

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'clients';

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('client_audit_log', 'client_properties', 'ac_units');
```

### 3. Test Frontend
1. Navigate to any client detail page
2. Test Edit Client button
3. Add a new property
4. Add AC units to property
5. View audit log tab
6. Verify all changes tracked

---

## 💡 Usage Examples

### Example 1: Residential Client with Multiple Homes

**Scenario:** Client "John Doe" owns 3 properties

**Properties:**
1. Primary Home (Jakarta)
   - 3 Split Wall AC units (Daikin)
   - 1 Cassette AC (Panasonic)
   
2. Beach House (Bali)
   - 2 Split Wall AC units (LG)
   
3. Investment Property (Bandung)
   - 4 Split Wall AC units (Sharp)

**Total:** 3 properties, 10 AC units tracked

---

### Example 2: Commercial Client with Multiple Branches

**Scenario:** "ABC Corporation" office buildings

**Properties:**
1. Head Office (Jakarta CBD) - Commercial
   - 15 VRV units
   - 5 Cassette units
   - Linked to annual maintenance contract
   
2. Branch Office (Surabaya) - Commercial
   - 8 VRV units
   - 3 Cassette units
   
3. Warehouse (Tangerang) - Commercial
   - 6 Ducted units

**Total:** 3 properties, 37 AC units tracked

---

### Example 3: Audit Trail Use Case

**Scenario:** Client address changed

**Before:**
```json
{
  "address": "Jl. Sudirman No. 123, Jakarta"
}
```

**After:**
```json
{
  "address": "Jl. Thamrin No. 456, Jakarta"
}
```

**Audit Log Entry:**
- Changed by: staff@hvacdjawara.com
- Changed at: 2024-01-15 10:30:00
- Fields changed: ["address"]
- Old value displayed in gray
- New value displayed in blue

---

## 🎯 Business Benefits

### For HVAC Business:
- ✅ Complete asset tracking
- ✅ Multi-location support
- ✅ Service history per unit
- ✅ Warranty tracking
- ✅ Preventive maintenance scheduling
- ✅ Audit trail for compliance
- ✅ Professional client management

### For Clients:
- ✅ View all properties in one place
- ✅ Track all AC units
- ✅ See service history
- ✅ Warranty expiration alerts
- ✅ Next service due dates
- ✅ Equipment condition status

---

## 📋 Data Model Relationships

```
clients (1) ──< (N) client_properties (1) ──< (N) ac_units
clients (1) ──< (N) client_audit_log
ac_units (N) ──> (1) maintenance_contracts
```

**One client can have:**
- Multiple properties ✅
- Multiple audit log entries ✅

**One property can have:**
- Multiple AC units ✅

**One AC unit can link to:**
- One maintenance contract ✅

---

## 🔍 Search & Filter Capabilities

### Properties:
- Filter by type (residential/commercial)
- Search by name or address
- Sort by primary status

### AC Units:
- Filter by property
- Filter by condition status
- Filter by brand
- Sort by unit code
- Search by model

### Audit Logs:
- Filter by date range
- Filter by staff member
- Filter by changed fields

---

## 📊 Summary Statistics

**Auto-calculated metrics:**
- Total properties per client
- Total AC units per client
- AC units per property
- Units by condition status
- Warranty expiring soon
- Service overdue

---

## 🛠 Technical Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- React Hooks (useState, useEffect)
- Tailwind CSS
- Shadcn UI Components
- Lucide Icons

**Backend:**
- Supabase (PostgreSQL)
- Row-Level Security (RLS)
- Database Triggers
- JSONB for audit diff
- UUID for all IDs

**Features:**
- Real-time validation
- Optimistic UI updates
- Error handling
- Loading states
- Success feedback
- Responsive design

---

## 🎓 Best Practices Implemented

1. **Data Integrity:**
   - Foreign key constraints
   - Check constraints for enums
   - NOT NULL for critical fields
   - Unique constraints (unit_code)

2. **Audit Trail:**
   - Automatic via database trigger
   - Cannot be manually edited
   - Complete old/new diff
   - User attribution

3. **UX/UI:**
   - Inline editing
   - Confirmation dialogs for destructive actions
   - Visual feedback (colors, badges)
   - Responsive grid layouts
   - Loading states

4. **Security:**
   - RLS on all tables
   - Tenant isolation
   - Read-only audit logs
   - Service role for admin functions

5. **Performance:**
   - Indexes on foreign keys
   - Limit audit logs to last 50
   - Efficient queries with joins
   - Pagination ready

---

## 📝 Next Steps (Optional Enhancements)

### Phase 2 Ideas:
- [ ] Export AC inventory to PDF/Excel
- [ ] QR code labels for AC units
- [ ] Photo upload for AC units
- [ ] Service reminder notifications
- [ ] Warranty expiration alerts
- [ ] Bulk AC unit import (CSV)
- [ ] Property location maps (Google Maps)
- [ ] Service cost tracking per unit
- [ ] Equipment depreciation calculation
- [ ] Client-facing property portal

---

## ✅ Deployment Checklist

- [x] SQL schema created (CLIENT_DATA_MANAGEMENT.sql)
- [x] EditClientForm component built
- [x] PropertyManagement component built
- [x] ACInventoryManager component built
- [x] AuditLogViewer component built
- [x] Client detail page updated with tabs
- [x] All components committed
- [x] Pushed to GitHub (putra22-debug/hvac-djawara)
- [ ] Execute SQL in Supabase
- [ ] Test all CRUD operations
- [ ] Verify RLS policies working
- [ ] Test audit logging
- [ ] Verify multi-property flow
- [ ] Test AC unit management

---

## 🎉 Result

Complete asset management system that transforms client data from simple contact info into comprehensive property and equipment tracking with full audit trail. Perfect for HVAC businesses managing multiple properties and equipment per client!
