# SISTEM JADWAL OTOMATIS PERAWATAN AC
## Arsitektur untuk Recurring Maintenance Contracts

---

## 🎯 Konsep Utama

Sistem ini membuat **jadwal perawatan otomatis** untuk pelanggan yang berlangganan maintenance berkala (bulanan/3 bulan/6 bulan), sehingga:
- ✅ Perusahaan tidak perlu manual create order setiap bulan
- ✅ Pelanggan dapat monitor jadwal AC mereka
- ✅ Auto-reminder untuk teknisi dan pelanggan
- ✅ Tracking history maintenance per unit AC

---

## 📊 Database Schema (Tabel Baru)

### 1. `maintenance_contracts`
Menyimpan kontrak perawatan pelanggan

```sql
CREATE TABLE maintenance_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Contract details
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Recurring settings
  frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'semi_annual', 'annual'
  service_day_preference INT, -- 1-31 (tanggal preferensi, misal setiap tgl 15)
  preferred_time TIME, -- jam preferensi (misal 09:00)
  
  -- Service details
  job_type job_type_enum DEFAULT 'maintenance',
  service_notes TEXT,
  
  -- Pricing
  price_per_service DECIMAL(15,2),
  total_contract_value DECIMAL(15,2),
  
  -- Assignment
  default_technician_id UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. `contract_units`
Unit AC yang termasuk dalam kontrak (1 kontrak bisa banyak unit)

```sql
CREATE TABLE contract_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES maintenance_contracts(id) ON DELETE CASCADE,
  
  -- Unit details
  unit_category unit_category_enum NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  capacity VARCHAR(50), -- misal "1 PK", "2.5 PK"
  
  -- Location in building
  location_description TEXT, -- misal "Ruang Meeting Lt 2"
  installation_date DATE,
  
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. `generated_schedules`
Jadwal yang di-generate otomatis oleh sistem

```sql
CREATE TABLE generated_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contract_id UUID NOT NULL REFERENCES maintenance_contracts(id),
  
  -- Schedule info
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  generation_date TIMESTAMPTZ DEFAULT now(),
  
  -- Link to actual order (null jika belum di-convert jadi order)
  service_order_id UUID REFERENCES service_orders(id),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'converted', 'skipped'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contract_id, scheduled_date)
);
```

---

## ⚙️ Cara Kerja Sistem

### **Phase 1: Setup Kontrak**

1. Admin/Sales membuat kontrak maintenance untuk pelanggan
2. Input: pelanggan, periode (start-end date), frekuensi (bulanan/3 bulan/dst)
3. Tambahkan unit-unit AC yang akan di-maintain
4. Set teknisi default (opsional)

### **Phase 2: Auto-Generate Schedule**

Buat **Cron Job / Scheduled Function** yang jalan setiap hari tengah malam:

```sql
-- Function untuk generate jadwal 30 hari ke depan
CREATE OR REPLACE FUNCTION generate_maintenance_schedules()
RETURNS void AS $$
DECLARE
  contract_record RECORD;
  next_schedule_date DATE;
BEGIN
  -- Loop semua kontrak aktif
  FOR contract_record IN 
    SELECT * FROM maintenance_contracts 
    WHERE is_active = true 
    AND end_date >= CURRENT_DATE
  LOOP
    -- Cek apakah sudah ada schedule untuk 30 hari ke depan
    -- Kalau belum, generate berdasarkan frequency
    
    -- Contoh untuk monthly: 
    -- Generate schedule setiap bulan pada tanggal yang sama
    
    -- Insert ke generated_schedules jika belum ada
    INSERT INTO generated_schedules (
      tenant_id, 
      contract_id, 
      scheduled_date, 
      scheduled_time,
      status
    )
    VALUES (
      contract_record.tenant_id,
      contract_record.id,
      next_schedule_date,
      contract_record.preferred_time,
      'pending'
    )
    ON CONFLICT (contract_id, scheduled_date) DO NOTHING;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

Jalankan function ini via:
- **Supabase Edge Function** (cron job)
- **Vercel Cron Job** (`/api/cron/generate-schedules`)
- **Database Trigger** (pg_cron extension)

### **Phase 3: Convert ke Service Order**

Saat mendekati tanggal schedule (misal H-3), sistem/admin bisa:

1. **Manual Confirm**: Admin review generated_schedules, lalu convert jadi `service_order`
2. **Auto Convert**: Sistem otomatis create service_order dari generated_schedules

```typescript
// API endpoint: /api/maintenance/convert-schedule
async function convertScheduleToOrder(scheduleId: string) {
  const schedule = await supabase
    .from('generated_schedules')
    .select('*, contract:maintenance_contracts(*)')
    .eq('id', scheduleId)
    .single()
  
  // Create service order
  const order = await supabase.from('service_orders').insert({
    tenant_id: schedule.tenant_id,
    client_id: schedule.contract.client_id,
    order_number: generateOrderNumber(),
    service_title: `Maintenance Berkala - ${schedule.contract.contract_number}`,
    job_type: 'maintenance',
    scheduled_date: schedule.scheduled_date,
    scheduled_time: schedule.scheduled_time,
    assigned_to: schedule.contract.default_technician_id,
    status: 'scheduled',
    // ... other fields
  })
  
  // Update generated_schedules
  await supabase
    .from('generated_schedules')
    .update({ 
      service_order_id: order.id, 
      status: 'converted' 
    })
    .eq('id', scheduleId)
}
```

---

## 🎨 UI/UX Features

### **1. Halaman Kontrak Maintenance** (`/dashboard/contracts`)
- List semua kontrak dengan status aktif/expired
- Filter by client, frequency, technician
- Create/Edit kontrak dengan wizard:
  - Step 1: Client info + contract period
  - Step 2: Add units (multiple AC units)
  - Step 3: Set frequency + preferred schedule
  - Step 4: Assign default technician

### **2. Dashboard Monitoring**
- **Widget: Upcoming Maintenance** (7 hari ke depan)
- **Calendar view** khusus untuk maintenance schedules
- **Alert**: kontrak yang akan expired (30 hari lagi)

### **3. Halaman Unit Pelanggan** (`/dashboard/clients/[id]/units`)
- List semua unit AC milik 1 pelanggan
- History maintenance per unit (berapa kali sudah di-service)
- Next scheduled maintenance
- Download maintenance report per unit

### **4. Notifikasi Otomatis**
- **H-7**: Email/WA ke pelanggan reminder jadwal maintenance
- **H-1**: Reminder ke teknisi via dashboard notification
- **H+1**: Follow-up jika belum dikerjakan

---

## 📱 Customer Portal (Opsional)

Buat halaman khusus pelanggan (`/portal/[client-token]`):
- ✅ Lihat jadwal maintenance AC mereka
- ✅ History service per unit
- ✅ Request reschedule (pending approval admin)
- ✅ Download invoice/report

---

## 🔄 Workflow End-to-End

```
1. Sales/Admin create maintenance contract
   ↓
2. System auto-generate schedules (cron job)
   ↓
3. H-3: Admin review & confirm schedules
   ↓
4. System create service_order from generated_schedules
   ↓
5. Technician see schedule in Kanban/Calendar
   ↓
6. Complete job → update service_order status
   ↓
7. System mark generated_schedule as 'done'
   ↓
8. Next month: repeat from step 2
```

---

## 💡 Keunggulan Sistem Ini

1. **Efisiensi**: Tidak perlu manual input order setiap bulan
2. **Prediktabilitas**: Perusahaan tahu workload 1-3 bulan ke depan
3. **Customer Satisfaction**: Pelanggan merasa di-care (auto reminder)
4. **Revenue Tracking**: Bisa forecast income dari maintenance contracts
5. **Compliance**: Tidak ada jadwal yang terlewat

---

## 🚀 Implementation Priority

**Sprint 1 (Week 1-2)**: Database schema + CRUD contracts
**Sprint 2 (Week 3)**: Auto-generate schedules (cron job)
**Sprint 3 (Week 4)**: UI dashboard contracts + convert schedule to order
**Sprint 4 (Week 5)**: Notifications + customer portal

---

## 📝 Next Steps

1. **Run migration SQL** untuk create tables baru
2. **Build UI** halaman contracts dengan form wizard
3. **Setup cron job** di Vercel/Supabase untuk auto-generate
4. **Test workflow** dengan 1-2 kontrak dummy

---

Apakah mau saya buatkan SQL migration-nya dan implement Phase 1 (database + basic UI)?
