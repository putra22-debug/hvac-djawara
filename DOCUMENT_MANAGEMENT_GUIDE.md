# 📄 Document Management System Setup Guide

## Overview
Complete document management untuk client files: SPK, penawaran, invoice, BAST, kontrak, dan arsip administratif lainnya.

---

## ✅ Features

### 11 Document Types Supported:
| Type | Label | Icon | Use Case |
|------|-------|------|----------|
| `spk` | SPK (Surat Perintah Kerja) | 📋 | Work orders |
| `penawaran` | Penawaran/Quotation | 💰 | Service quotations |
| `invoice` | Invoice/Tagihan | 🧾 | Invoices & billing |
| `bast` | BAST (Berita Acara) | 📝 | Handover reports |
| `kontrak` | Kontrak/Agreement | 📄 | Service contracts |
| `po` | Purchase Order | 🛒 | Purchase orders |
| `kwitansi` | Kwitansi/Receipt | 💵 | Payment receipts |
| `warranty` | Warranty Certificate | 🛡️ | Warranty docs |
| `foto_sebelum` | Foto Sebelum | 📸 | Before photos |
| `foto_sesudah` | Foto Sesudah | 📷 | After photos |
| `lainnya` | Lainnya | 📎 | Other documents |

### File Types Supported:
- ✅ PDF (`.pdf`)
- ✅ Word (`.doc`, `.docx`)
- ✅ Excel (`.xls`, `.xlsx`)
- ✅ Images (`.jpg`, `.jpeg`, `.png`)

---

## 🗄️ Database Setup

### Step 1: Execute SQL Migration

Run in Supabase SQL Editor:
```bash
supabase/CLIENT_DOCUMENTS_SYSTEM.sql
```

This creates:
- ✅ `client_documents` table
- ✅ Indexes for performance
- ✅ RLS policies
- ✅ Triggers for updated_at
- ✅ Summary view

### Step 2: Verify Table Created

```sql
-- Check table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'client_documents';

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'client_documents';
```

---

## 📦 Storage Bucket Setup

### Step 1: Create Storage Bucket

1. Login to Supabase Dashboard
2. Go to **Storage** section (left sidebar)
3. Click **New bucket**
4. Configure:
   ```
   Name: client-documents
   Public: false (IMPORTANT - keep private)
   File size limit: 50MB (recommended)
   Allowed MIME types: Leave empty (accept all)
   ```
5. Click **Create bucket**

### Step 2: Configure Storage Policies

Go to bucket **Policies** tab and add these policies:

#### Policy 1: Staff Can Upload
```sql
-- Policy Name: Staff can upload documents
-- Allowed operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Staff can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND active_tenant_id IS NOT NULL
  )
);
```

#### Policy 2: Staff Can View/Download
```sql
-- Policy Name: Staff can view documents
-- Allowed operation: SELECT
-- Target roles: authenticated

CREATE POLICY "Staff can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND active_tenant_id IS NOT NULL
  )
);
```

#### Policy 3: Staff Can Delete
```sql
-- Policy Name: Staff can delete documents
-- Allowed operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Staff can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND active_tenant_id IS NOT NULL
  )
);
```

#### Policy 4: Clients Can View Own Documents (Optional)
```sql
-- Policy Name: Clients can view own documents
-- Allowed operation: SELECT
-- Target roles: authenticated

CREATE POLICY "Clients can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.clients
    WHERE portal_email = auth.email()
    AND portal_enabled = true
  )
);
```

### Step 3: Verify Storage Policies

```sql
-- Check storage policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%documents%';
```

---

## 🎯 Usage Guide

### Upload Document

1. Navigate to client detail page
2. Click **Documents** tab
3. Click **Upload Dokumen**
4. Fill form:
   - **Tipe Dokumen**: Select document type
   - **Nama Dokumen**: Document name/title
   - **Nomor Dokumen**: Optional reference number
   - **Tanggal Dokumen**: Optional date
   - **Upload File**: Select file (PDF, Word, Excel, Image)
   - **Catatan**: Optional notes
5. Click **Upload Dokumen**

### Download Document

1. Go to Documents tab
2. Find document in list
3. Click download icon (⬇️)
4. File downloads automatically

### Delete Document

1. Go to Documents tab
2. Find document to delete
3. Click delete icon (🗑️)
4. Confirm deletion
5. Document soft-deleted (status = 'deleted')

---

## 📊 Database Schema

### `client_documents` Table

```sql
CREATE TABLE client_documents (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  tenant_id UUID REFERENCES tenants(id),
  
  -- Document Info
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 11 types
  
  -- File Storage
  file_path TEXT NOT NULL,     -- Path in storage
  file_size BIGINT,             -- Bytes
  file_type TEXT,               -- MIME type
  
  -- Metadata
  document_number TEXT,
  document_date DATE,
  related_order_id UUID,
  related_contract_id UUID,
  
  -- Status
  status TEXT DEFAULT 'active', -- active/archived/deleted
  tags TEXT[],
  notes TEXT,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### File Storage Structure

Files stored in Supabase Storage:
```
client-documents/
├── {client_id}/
│   ├── {timestamp}_spk.pdf
│   ├── {timestamp}_invoice.pdf
│   ├── {timestamp}_foto_sebelum.jpg
│   └── ...
```

Example path: `abc123/1702540800000_spk.pdf`

---

## 🔒 Security

### RLS Policies

**Database (client_documents table):**
- ✅ Staff can manage all documents in their tenant
- ✅ Clients can view own documents (if portal enabled)

**Storage (client-documents bucket):**
- ✅ Staff can upload/view/delete files
- ✅ Clients can view files in their folder
- ❌ Anonymous users blocked
- ❌ Cross-tenant access blocked

### File Organization

Files organized by `client_id`:
- Prevents unauthorized access
- Easy cleanup when client deleted
- Clear audit trail

---

## 📝 Component API

### DocumentManager Component

```tsx
import { DocumentManager } from '@/components/client-portal/DocumentManager'

<DocumentManager clientId={clientId} />
```

**Props:**
- `clientId` (string, required): Client UUID

**Features:**
- Auto-fetch documents on mount
- Upload form with validation
- File type restrictions
- File size display
- Download functionality
- Soft delete
- Upload attribution
- Document type icons
- Date formatting

---

## 🎓 Business Use Cases

### Use Case 1: Service Order Documentation
```
Client: Hotel ABC
Order: AC maintenance 10 units

Documents:
1. SPK-2024-001.pdf - Work order
2. Foto_sebelum_001.jpg - Before photos (10 files)
3. Foto_sesudah_001.jpg - After photos (10 files)
4. BAST-2024-001.pdf - Handover report
5. Invoice-2024-001.pdf - Invoice
6. Kwitansi-2024-001.pdf - Payment receipt
```

### Use Case 2: Contract Management
```
Client: PT Manufacturing
Contract: Annual maintenance

Documents:
1. Penawaran-2024-Q1.pdf - Initial quotation
2. PO-12345.pdf - Client purchase order
3. Kontrak-2024-001.pdf - Signed contract
4. Warranty-Units.pdf - Equipment warranties
```

### Use Case 3: Project Documentation
```
Client: School Building
Project: 50 AC units installation

Documents:
1. Penawaran-Sekolah-2024.pdf
2. PO-School-001.pdf
3. SPK-Install-001.pdf to SPK-Install-010.pdf
4. Foto_sebelum (50 photos)
5. Foto_sesudah (50 photos)
6. BAST-Final.pdf
7. Warranty-50Units.pdf
8. Invoice-Project.pdf
9. Kwitansi-Payment.pdf
```

---

## 🔍 Searching & Filtering

### Filter by Document Type

```typescript
// In DocumentManager component
const filteredDocs = documents.filter(doc => 
  doc.document_type === 'spk'
)
```

### Search by Name

```typescript
const searchResults = documents.filter(doc =>
  doc.document_name.toLowerCase().includes(searchTerm.toLowerCase())
)
```

### Filter by Date Range

```typescript
const dateRangeDocs = documents.filter(doc => {
  const docDate = new Date(doc.document_date)
  return docDate >= startDate && docDate <= endDate
})
```

---

## 📊 Reporting

### Document Summary View

```sql
-- View created by migration
SELECT * FROM v_client_documents_summary
WHERE client_id = 'client-uuid';

-- Returns:
-- client_id | document_type | document_count | total_size_bytes | latest_document_date
```

### Document Count by Client

```sql
SELECT 
  c.name,
  COUNT(d.id) as total_documents,
  SUM(d.file_size) as total_size_mb
FROM clients c
LEFT JOIN client_documents d ON d.client_id = c.id AND d.status = 'active'
GROUP BY c.id, c.name
ORDER BY total_documents DESC;
```

---

## ⚠️ Important Notes

### File Size Limits
- Default: 50MB per file (Supabase free tier)
- Increase in bucket settings if needed
- Large files may affect upload speed

### Storage Quota
- Supabase free tier: 1GB storage
- Monitor usage in dashboard
- Delete unused documents regularly

### Backup Strategy
- Documents stored in Supabase Storage
- Regular backups via Supabase
- Export important docs periodically

### MIME Type Restrictions
Currently accepting:
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `image/jpeg`
- `image/jpg`
- `image/png`

---

## ✅ Testing Checklist

- [ ] SQL migration executed successfully
- [ ] Storage bucket created (client-documents)
- [ ] Storage policies configured
- [ ] Upload document works
- [ ] Download document works
- [ ] Delete document works (soft delete)
- [ ] File size display correct
- [ ] Document types show proper icons
- [ ] RLS policies working (tenant isolation)
- [ ] Client portal can view own documents

---

## 🚀 Deployment Summary

**Database:**
- ✅ `client_documents` table created
- ✅ RLS policies enabled
- ✅ Indexes for performance

**Storage:**
- ✅ `client-documents` bucket (private)
- ✅ Upload/view/delete policies
- ✅ Folder structure by client_id

**UI:**
- ✅ Documents tab added
- ✅ DocumentManager component
- ✅ Upload form with validation
- ✅ Document list with download/delete

**Ready to use!** 🎉
