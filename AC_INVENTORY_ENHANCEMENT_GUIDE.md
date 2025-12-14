# AC Inventory Enhancement System
## Sistem Tracking AC dengan Barcode & Photo Documentation

### 🎯 Fitur Utama

#### 1. **Room Name (Nama Ruangan)**
- Identifikasi lokasi spesifik AC dalam property
- Contoh: "Ruang Meeting 1", "Lobby", "Kantor Manager", "Area Produksi A"

#### 2. **Barcode System**
- **Format**: `CLT-PRO-0001`
  - CLT = 3 huruf pertama nama client
  - PRO = 3 huruf pertama nama property
  - 0001 = Nomor urut AC di property tersebut
- **Fungsi**: Unique identifier untuk setiap AC unit
- **QR Code**: Bisa di-scan untuk langsung akses detail AC

#### 3. **Photo Documentation**
- **Unit Photo**: Foto AC unit aktual di lapangan
- **Model Photo**: Foto nameplate/model AC untuk referensi
- **Update**: Bisa diupdate kapan saja, otomatis masuk history

#### 4. **History Tracking**
Semua perubahan tercatat otomatis:
- ✅ **created**: AC pertama kali ditambahkan
- ✅ **updated**: Update data (brand, model, kondisi, dll)
- ✅ **photo_updated**: Update foto dokumentasi
- ✅ **replaced**: AC diganti dengan unit baru
- ✅ **relocated**: AC dipindah ke ruang lain
- ✅ **maintenance**: Service/maintenance dilakukan
- ✅ **removed**: AC dilepas/dihapus

---

## 📊 Database Schema

### **ac_units** (Enhanced)
```sql
- room_name: TEXT               -- Nama ruangan
- barcode_number: TEXT UNIQUE   -- Nomor barcode unik
- unit_photo_url: TEXT          -- URL foto unit
- model_photo_url: TEXT         -- URL foto model
- qr_code_data: TEXT            -- Data QR code (JSON)
```

### **ac_unit_history** (New)
```sql
- ac_unit_id: UUID              -- FK ke ac_units
- property_id: UUID             -- FK ke properties
- change_type: TEXT             -- Jenis perubahan
- old_data: JSONB               -- Data sebelum
- new_data: JSONB               -- Data sesudah
- changes_summary: TEXT         -- Ringkasan perubahan
- photos: TEXT[]                -- Array foto dokumentasi
- notes: TEXT                   -- Catatan tambahan
- changed_by: UUID              -- Siapa yang ubah
- changed_at: TIMESTAMPTZ       -- Kapan diubah
- related_order_id: UUID        -- FK ke service_orders (optional)
```

---

## 🔄 Workflow & Logika

### **A. Menambah AC Unit Baru**
1. User input data AC + pilih property & room name
2. System auto-generate barcode: `BNK-KTR-0001`
3. User upload foto unit & model (optional)
4. Save → Trigger otomatis log ke history: `change_type = 'created'`
5. QR code data di-generate untuk print label

### **B. Update Foto AC**
1. User pilih AC unit
2. Upload foto baru (unit atau model)
3. Save → Trigger deteksi foto berubah
4. History log: `change_type = 'photo_updated'`
5. Foto lama tetap tersimpan di history (old_data)

### **C. Penggantian Unit AC**
1. User buka AC unit yang mau diganti
2. Klik "Replace Unit"
3. Input data AC baru (brand, model, serial, dll)
4. Upload foto AC baru
5. System log:
   - History: `change_type = 'replaced'`
   - `old_data`: Data AC lama + foto lama
   - `new_data`: Data AC baru + foto baru
   - Barcode tetap sama (untuk tracking lokasi)

### **D. Relokasi AC**
1. User pindah AC ke ruang lain
2. Update `room_name` dari "Lobby" → "Ruang Meeting 2"
3. Trigger detect perubahan room
4. History log: `change_type = 'relocated'`

### **E. Maintenance/Service**
1. Technician selesai service
2. Bisa link ke service order
3. Update kondisi, foto kondisi terkini
4. History log: `change_type = 'maintenance'`
5. Di history bisa lihat:
   - Foto sebelum service
   - Foto sesudah service
   - Perubahan kondisi

---

## 🖼️ Photo Management

### **Storage Structure**
```
supabase-storage/
└── ac-photos/
    ├── {tenant_id}/
    │   ├── {client_id}/
    │   │   ├── {property_id}/
    │   │   │   ├── {ac_unit_id}/
    │   │   │   │   ├── unit_{timestamp}.jpg
    │   │   │   │   ├── model_{timestamp}.jpg
    │   │   │   │   └── history_{timestamp}.jpg
```

### **Upload Process**
1. User select foto (max 5MB)
2. Upload ke Supabase Storage
3. Get public URL
4. Save URL ke `unit_photo_url` atau `model_photo_url`
5. Trigger otomatis backup foto lama ke history

---

## 🏷️ Barcode & QR Code

### **Barcode Generation**
```typescript
// Function: generate_ac_barcode()
// Input: client_id, property_id
// Output: "BNK-KTR-0001"

// Example:
const barcode = await generateACBarcode(clientId, propertyId);
// Returns: "BNK-KTR-0001"
```

### **QR Code Data (JSON)**
```json
{
  "ac_id": "uuid",
  "barcode": "BNK-KTR-0001",
  "client": "Bank Permata",
  "property": "Kantor Cabang Purwokerto",
  "room": "Ruang Meeting 1",
  "brand": "Daikin",
  "model": "CS-CU12VKP",
  "capacity": "1 PK",
  "installation_date": "2023-06-15",
  "url": "https://app.hvacdjawara.com/ac/{ac_id}"
}
```

### **QR Code Usage**
1. Print sticker dengan QR code
2. Tempel di AC unit
3. Technician scan QR → langsung buka detail AC
4. Bisa langsung update kondisi, foto, service notes

---

## 📱 UI Components

### **1. AC Inventory Form (Enhanced)**
```tsx
- Room Name: Text input (required)
- Barcode: Auto-generated, read-only, dengan tombol "Regenerate"
- Unit Photo: Upload button + preview
- Model Photo: Upload button + preview
- QR Code: Display + Download button
```

### **2. AC Unit Card**
```tsx
<ACUnitCard>
  - Barcode badge
  - Room name
  - Brand & Model
  - Thumbnail foto (klik untuk zoom)
  - History count badge
  - Last service date
  - Condition status
</ACUnitCard>
```

### **3. AC History Timeline**
```tsx
<Timeline>
  {history.map(item => (
    <TimelineItem>
      - Icon by change_type
      - Timestamp
      - Changed by (user name)
      - Changes summary
      - Before/After photos (if applicable)
      - Notes
      - Link to service order (if any)
    </TimelineItem>
  ))}
</Timeline>
```

### **4. Photo Comparison Modal**
```tsx
<PhotoCompareModal>
  <BeforePhoto src={oldData.unit_photo_url} />
  <AfterPhoto src={newData.unit_photo_url} />
  <ChangeNotes>{notes}</ChangeNotes>
</PhotoCompareModal>
```

---

## 🔐 Security & RLS

### **RLS Policies**
```sql
-- ac_units: Existing policies apply
-- ac_unit_history: Read-only for users in tenant
-- Photos: Private bucket with tenant-based access
```

### **Photo Upload Rules**
- Max file size: 5MB
- Allowed formats: JPG, PNG, WEBP
- Auto-compress on upload
- Generate thumbnail (200x200) for list view

---

## 📈 Use Cases

### **Case 1: Audit Internal**
Manager bisa cek:
- Berapa total AC per property
- Kondisi masing-masing AC
- Foto kondisi terkini
- History maintenance

### **Case 2: Technician Field Visit**
1. Scan QR code di AC
2. Lihat history service terakhir
3. Update kondisi + foto terbaru
4. Simpan → otomatis log

### **Case 3: Replacement Planning**
1. Filter AC dengan kondisi "Poor"
2. Lihat history berapa kali service
3. Foto kondisi deteriorasi
4. Decision: replace atau repair
5. Jika replace: log full history

### **Case 4: Compliance & Documentation**
- Export report dengan foto
- Proof of condition untuk insurance
- Maintenance record untuk audit
- Before/after documentation

---

## 🚀 Implementation Steps

### **Phase 1: Database (Completed)**
✅ SQL migration file created
✅ Tables, triggers, functions ready
✅ RLS policies defined

### **Phase 2: Storage Setup**
1. Create bucket: `ac-photos` (private)
2. Configure storage policies
3. Test upload/download

### **Phase 3: Backend Functions**
1. Barcode generation API
2. QR code generation API
3. Photo upload handler
4. History query endpoints

### **Phase 4: UI Components**
1. Enhanced AC form with room name
2. Photo upload components
3. Barcode display & QR code
4. History timeline viewer
5. Photo comparison modal

### **Phase 5: Integration**
1. Connect forms to new fields
2. Photo upload flow
3. History auto-refresh
4. QR code print function

---

## 📝 Next Actions

1. **Execute SQL**: Run `AC_INVENTORY_ENHANCEMENT.sql`
2. **Create Storage Bucket**: Setup `ac-photos` bucket
3. **Update UI**: Modify AC inventory components
4. **Test**: Upload foto, generate barcode, check history

---

## 💡 Future Enhancements

- 📱 Mobile app untuk scan QR di lapangan
- 🔔 Notifikasi service due date
- 📊 Analytics: AC lifecycle, maintenance cost
- 🤖 AI photo comparison untuk detect kondisi
- 📄 Auto-generate maintenance report dengan foto
- 🗺️ Map view: Lokasi semua AC dalam property

---

**Status**: Ready to implement ✅
**Impact**: High - Significant improvement in AC asset management
**Complexity**: Medium - Requires photo storage + UI updates
