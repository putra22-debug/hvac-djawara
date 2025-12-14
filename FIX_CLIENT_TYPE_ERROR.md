# 🔧 Quick Fix - Client Type Constraint Error

## Error yang Terjadi:
```
Error updating client:
"new row for relation "clients" violates check constraint "clients_client_type_check"
```

## Root Cause:
Tabel `clients` masih punya constraint lama yang hanya accept 2 nilai:
- `residential`
- `commercial`

Tapi UI sudah update untuk gunakan 8 tipe baru:
- `rumah_tangga`, `perkantoran`, `komersial`, `perhotelan`, `sekolah_universitas`, `gedung_pertemuan`, `kantor_pemerintah`, `pabrik_industri`

---

## ✅ Solution: Execute SQL Fix

### Step 1: Buka Supabase SQL Editor
1. Login ke Supabase dashboard
2. Klik **SQL Editor** di sidebar
3. Klik **New Query**

### Step 2: Copy-Paste SQL Fix
Copy isi file: **`supabase/FIX_CLIENT_TYPE_CONSTRAINT.sql`**

Atau copy dari sini:
```sql
-- Drop old constraint
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_client_type_check;

-- Add new constraint with 8 types
ALTER TABLE public.clients ADD CONSTRAINT clients_client_type_check 
  CHECK (client_type IN (
    'rumah_tangga', 
    'perkantoran', 
    'komersial', 
    'perhotelan', 
    'sekolah_universitas', 
    'gedung_pertemuan', 
    'kantor_pemerintah', 
    'pabrik_industri'
  ));

-- Update existing client types to new values (if any)
UPDATE public.clients 
SET client_type = CASE 
  WHEN client_type = 'residential' THEN 'rumah_tangga'
  WHEN client_type = 'commercial' THEN 'perkantoran'
  ELSE client_type
END
WHERE client_type IN ('residential', 'commercial');
```

### Step 3: Run Query
1. Paste SQL di editor
2. Klik **Run** atau tekan `Ctrl+Enter`
3. Tunggu success message

### Step 4: Verify Fix
```sql
-- Check constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.clients'::regclass 
AND conname = 'clients_client_type_check';

-- Should show: client_type IN ('rumah_tangga', 'perkantoran', ...)
```

---

## 🎯 What This Fix Does:

1. **Drops old constraint** that only allowed residential/commercial
2. **Creates new constraint** that accepts all 8 client types
3. **Migrates existing data** (residential → rumah_tangga, commercial → perkantoran)

---

## ✅ After Fix:

You can now:
- ✅ Edit client and change type to any of 8 options
- ✅ Create new clients with new types
- ✅ UI displays proper capitalized labels (Rumah Tangga, Perkantoran, etc)
- ✅ Business details show for non-residential types
- ✅ Badges color-coded (secondary for rumah_tangga, default for others)

---

## 🔍 Verification Steps:

### 1. Test Edit Client:
- Go to any client detail page
- Click "Edit Client"
- Change Client Type to "Perkantoran"
- Click "Save Changes"
- Should succeed without error ✅

### 2. Check Business Details:
- If client type is NOT "Rumah Tangga"
- Business Details section should show
- Fields: PIC Name, PIC Phone, NPWP, NPWP Address

### 3. Check Badge Display:
- Client list: Should show capitalized type (e.g., "Sekolah Universitas")
- Client detail: Same capitalized format
- Color: Gray for Rumah Tangga, Blue for others

---

## 📝 Related Files:

- **SQL Fix:** `supabase/FIX_CLIENT_TYPE_CONSTRAINT.sql`
- **Full Schema:** `supabase/CLIENT_DATA_MANAGEMENT.sql`
- **Classification Guide:** `CLIENT_PROPERTY_CLASSIFICATION_GUIDE.md`

---

## ⚠️ Important Note:

Execute **FIX_CLIENT_TYPE_CONSTRAINT.sql** FIRST before **CLIENT_DATA_MANAGEMENT.sql** if you haven't run either yet.

Or just run CLIENT_DATA_MANAGEMENT.sql alone - it includes DROP IF EXISTS for all triggers so it's safe to re-run.
