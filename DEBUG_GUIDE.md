# 🔍 PANDUAN DEBUG TECHNICAL REPORT

## Masalah yang Perlu Dicek:

### 1️⃣ Timeline Tidak Berubah Hijau

**Buka Console Browser (F12)** saat di dashboard teknisi, cari log:
```
Work logs fetched: X records
⚠ Order SO-XXXXX incomplete: {problem: true/false, tindakan: true/false, signature: true/false}
```

**Jika salah satu `false`, berarti field tersebut tidak terisi!**

**Solusi:**
- Pastikan saat save laporan:
  - ✅ Field "Problem/Temuan" TERISI (bukan kosong)
  - ✅ Field "Tindakan/Actions Taken" TERISI
  - ✅ Tanda tangan CLIENT sudah dibuat (bukan teknisi saja)

---

### 2️⃣ PDF Download Error di Client Portal

**Buka Console Browser (F12) → Network tab**
- Klik button "Download PDF Report"
- Lihat request ke `/api/reports/[orderId]/pdf`
- Cek response: 400? 401? 403? 404? 500?

**Screenshot error message dan kirim ke saya!**

Kemungkinan error:
- **404**: Work log tidak ditemukan
- **403**: Forbidden - client tidak punya akses
- **500**: Error generating PDF

---

### 3️⃣ Dokumen BAST Tidak Muncul di Admin Dashboard

**Jalankan SQL Debug di Supabase:**

1. Buka Supabase SQL Editor
2. Copy paste SQL dari `supabase/DEBUG_TECHNICAL_REPORT.sql`
3. Ganti `YOUR_ORDER_ID_HERE` dengan ID order yang sudah Anda save (contoh: `5be68e59-1e8c-4b7b-8946-a41eb7e35a40`)
4. Run SQL
5. **Screenshot hasil query dan kirim ke saya!**

**Yang perlu dicek dari hasil query:**

**Query 1 (technician_work_logs):**
- ✅ `problem` terisi?
- ✅ `tindakan` terisi?
- ✅ `signature_client` terisi?
- ✅ `log_type` = 'technical_report'?

**Query 2 (client_documents):**
- ✅ Ada data? (jika tidak ada, entry tidak tercreate)
- ✅ `client_id` terisi?
- ✅ `tenant_id` terisi?
- ✅ `status` = 'active'?

**Query 3 (service_orders):**
- ✅ `status` = 'completed'?
- ✅ `client_id` ada?

---

## 🎯 Action Plan Berdasarkan Hasil:

### Jika Query 1 menunjukkan field kosong:
→ **Masalah di form:** Field tidak ter-submit dengan benar
→ **Solusi:** Saya perbaiki form submission

### Jika Query 2 tidak ada data:
→ **Masalah di auto-create document:** Logic tidak jalan
→ **Solusi:** Saya perbaiki document creation logic

### Jika Query 2 ada data tapi tidak muncul di admin dashboard:
→ **Masalah RLS policy:** Policy tidak memberi akses ke staff
→ **Solusi:** Saya perbaiki RLS policy

### Jika PDF download error 403/404:
→ **Masalah di API route:** Access check atau query issue
→ **Solusi:** Saya perbaiki API route logic

---

## 📸 Yang Saya Butuhkan Dari Anda:

1. **Screenshot Console Browser** (F12) di dashboard teknisi setelah refresh
2. **Screenshot Network tab error** saat download PDF
3. **Screenshot hasil SQL Debug** dari Supabase (3 queries)
4. **Order Number** yang Anda test (contoh: SO-202512-0023)

Dengan 4 data ini, saya bisa identifikasi masalah yang TEPAT dan buat fix yang PASTI berhasil! 🎯
