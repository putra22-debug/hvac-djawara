# 🎯 CONTRACT REQUESTS SETUP GUIDE

Halaman `/dashboard/contract-requests` **sudah siap**, tinggal setup database saja!

---

## 📋 QUICK START (5 menit)

### Step 1: Create Table di Supabase
```sql
-- EXECUTE di Supabase SQL Editor
-- File: supabase/FINAL_FIX_CONTRACT_REQUESTS.sql
```

**URL:** https://supabase.com/dashboard/project/YOUR_PROJECT/sql

### Step 2: Insert Sample Data (Optional - untuk testing)
```sql
-- EXECUTE di Supabase SQL Editor  
-- File: supabase/SEED_CONTRACT_REQUESTS.sql
```

### Step 3: Test di Browser
Visit: https://hvac-djawara.vercel.app/dashboard/contract-requests

---

## 🎨 UI FEATURES (Already Built)

### Dashboard View
```
┌──────────────────────────────────────────────────┐
│ Permintaan Kontrak Maintenance                   │
│ Kelola permintaan kontrak dari pelanggan         │
├──────────────────────────────────────────────────┤
│                                                   │
│ [Table with columns:]                             │
│  • Perusahaan (company + city)                   │
│  • Kontak (name + phone)                         │
│  • Unit (count + locations)                       │
│  • Frekuensi (monthly/quarterly/etc)             │
│  • Status (badge dengan warna)                    │
│  • Tanggal (created date)                         │
│  • Actions (👁️ View, 📤 Send Quote, ✅ Approve)  │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Status Badges
- 🟡 **Pending** - Baru masuk, belum diproses
- 🔵 **Quoted** - Penawaran sudah dikirim
- 🟢 **Approved** - Disetujui, siap jadi kontrak
- 🔴 **Rejected** - Ditolak

### Actions per Status

**Pending Status:**
- 👁️ **View Details** - Lihat info lengkap
- 📤 **Send Quotation** - Kirim penawaran dengan form modal:
  - Amount (Rp)
  - Notes (detail penawaran)
  - Auto update status → "Quoted"

**Quoted Status:**
- 👁️ **View Details** - Lihat penawaran yang sudah dikirim
- ✅ **Approve** - Setujui (status → "Approved")
- ❌ **Reject** - Tolak dengan alasan

**Approved/Rejected:**
- 👁️ **View Only** - Read-only

---

## 💾 DATABASE SCHEMA

### Table: contract_requests

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| company_name | VARCHAR(200) | Nama perusahaan |
| contact_person | VARCHAR(200) | Nama PIC |
| phone | VARCHAR(20) | Nomor telepon |
| email | VARCHAR(200) | Email (optional) |
| address | TEXT | Alamat lengkap |
| city | VARCHAR(100) | Kota |
| province | VARCHAR(100) | Provinsi |
| unit_count | INT | Jumlah unit AC |
| location_count | INT | Jumlah cabang/lokasi |
| preferred_frequency | VARCHAR(50) | monthly, quarterly, semi_annual, custom |
| notes | TEXT | Catatan pelanggan |
| status | VARCHAR(20) | pending, quoted, approved, rejected |
| quotation_amount | DECIMAL | Nilai penawaran |
| quotation_notes | TEXT | Detail penawaran |
| quotation_sent_at | TIMESTAMPTZ | Waktu kirim penawaran |
| approved_by | UUID | User yang approve |
| approved_at | TIMESTAMPTZ | Waktu approve |
| rejection_reason | TEXT | Alasan tolak |
| contract_id | UUID | Link ke maintenance_contracts (future) |
| created_at | TIMESTAMPTZ | Waktu dibuat |
| updated_at | TIMESTAMPTZ | Waktu update |

### RLS Policies
- ✅ **Public INSERT** - Anyone can submit via landing page form
- ✅ **Authenticated SELECT** - Internal team can view all
- ✅ **Authenticated UPDATE** - Internal team can update status/quotation

---

## 🔄 WORKFLOW

### 1. Customer Submit (Public Form)
```
Landing Page → Modal "Request Service" 
→ Check "Maintenance Berkala" 
→ Fill form (unit count, frequency, notes)
→ Submit → Insert to contract_requests (status: pending)
```

### 2. Admin Review (Dashboard)
```
Dashboard → Contract Requests
→ View pending request
→ Click "Send Quotation" icon
→ Fill amount & notes
→ Submit → Update status to "quoted"
```

### 3. Approval Decision
```
View quoted request
→ Click "Approve" button
→ Status → "approved"

OR

→ Click "Reject" button
→ Enter rejection reason
→ Status → "rejected"
```

### 4. Convert to Contract (Future Phase)
```
Approved request
→ Create maintenance_contracts record
→ Link contract_id
→ Generate schedules
→ Start maintenance cycle
```

---

## 🧪 TESTING CHECKLIST

### After Table Creation
- [ ] Navigate to `/dashboard/contract-requests`
- [ ] Page loads without errors
- [ ] Empty state shows "Belum ada permintaan kontrak"

### After Seed Data
- [ ] 4 sample requests visible
- [ ] Status badges showing correctly:
  - 🟡 Pending: PT Maju Jaya Elektronik
  - 🔵 Quoted: Hotel Grand Permata  
  - 🟢 Approved: RS Sehat Sentosa
  - 🔴 Rejected: Warung Kopi Sejahtera
- [ ] Unit counts displayed: 25, 50, 80, 3
- [ ] Frequency labels in Indonesian

### Functionality Test
- [ ] Click "Eye" icon → Modal opens with details
- [ ] Pending request → "Send" icon visible
- [ ] Click "Send" → Quotation modal opens
- [ ] Fill amount: 5000000, notes: "Test quotation"
- [ ] Submit → Toast success, status changes to "Quoted"
- [ ] Quoted request → "Approve" & "Reject" buttons visible
- [ ] Click "Approve" → Toast success, status → "Approved"

### Form Submission Test (Landing Page)
- [ ] Go to homepage `/`
- [ ] Click "Request Service" button
- [ ] Select "Maintenance/Service Rutin"
- [ ] Contract checkbox appears
- [ ] Check "Ajukan Kontrak Maintenance Berkala"
- [ ] Contract fields appear (unit count, location, frequency)
- [ ] Fill form & submit
- [ ] Success message appears
- [ ] New request appears in dashboard

---

## 📊 SAMPLE DATA OVERVIEW

**PT Maju Jaya Elektronik** (Pending)
- 25 units, 3 locations, Monthly
- Jakarta Pusat
- Budget: TBD

**Hotel Grand Permata** (Quoted)
- 50 units VRV, 1 location, Quarterly
- Jakarta Selatan
- Quotation: Rp 12.500.000/quarter

**RS Sehat Sentosa** (Approved)
- 80 units, 1 location, Monthly
- Bandung
- Approved: Rp 28.000.000/month (Rp 336jt/year)

**Warung Kopi Sejahtera** (Rejected)
- 3 units, 1 location, Semi-Annual
- Jakarta Barat
- Rejected: Budget tidak sesuai

---

## 🚀 DEPLOYMENT NOTES

### Files Already Deployed ✅
- `app/dashboard/contract-requests/page.tsx` - Dashboard UI
- `app/api/contract-requests/route.ts` - API endpoints (POST/GET)
- `components/RequestServiceForm.tsx` - Public form with contract option

### Files Need Execution ⚠️
- `supabase/FINAL_FIX_CONTRACT_REQUESTS.sql` - **EXECUTE THIS**
- `supabase/SEED_CONTRACT_REQUESTS.sql` - Optional (testing)

### No Code Changes Needed 🎉
UI sudah lengkap dan production-ready. Tinggal execute SQL!

---

## 🎯 NEXT STEPS

### Immediate (Now)
1. ✅ Execute `FINAL_FIX_CONTRACT_REQUESTS.sql` di Supabase
2. ✅ Execute `SEED_CONTRACT_REQUESTS.sql` untuk testing
3. ✅ Test dashboard berfungsi dengan baik

### Short Term (This Week)
4. 🔄 Test form submission dari landing page
5. 🔄 Test send quotation workflow
6. 🔄 Test approve/reject workflow
7. 📧 Setup email notification saat ada request baru

### Long Term (Future Phase)
8. 📄 Add PDF quotation generator
9. 📧 Auto-send email quotation ke customer
10. 🔄 Convert approved → maintenance_contracts
11. 📊 Analytics dashboard (request trends, conversion rate)

---

## 💡 IMPROVEMENT IDEAS

### UI Enhancements
- [ ] Add filter by status (All, Pending, Quoted, Approved, Rejected)
- [ ] Add search by company name
- [ ] Add export to Excel
- [ ] Add bulk actions (approve multiple)
- [ ] Add timeline view per request

### Features
- [ ] Email notification to admin on new request
- [ ] WhatsApp notification option
- [ ] Customer portal to track request status
- [ ] Auto-reminder jika pending > 3 hari
- [ ] Quotation template library

### Workflow
- [ ] Assignment system (assign to sales person)
- [ ] Follow-up reminder
- [ ] Won/Lost reason tracking
- [ ] Integration with accounting system

---

## 📞 SUPPORT

**Issues?**
- Check Supabase table exists: `SELECT * FROM contract_requests LIMIT 1;`
- Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'contract_requests';`
- Check browser console for errors
- Verify auth token valid

**Success Signs:**
- ✅ Dashboard loads without errors
- ✅ Empty state or data table visible
- ✅ Actions buttons functional
- ✅ Toast notifications working

---

**Status:** Ready to Deploy 🚀  
**Effort:** 5 minutes (just SQL execution)  
**Impact:** High - Critical for lead management
