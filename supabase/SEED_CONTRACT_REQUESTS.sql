-- ============================================
-- SEED DATA FOR CONTRACT REQUESTS
-- Insert sample data untuk testing UI
-- ============================================

-- Insert 3 sample contract requests dengan status berbeda
INSERT INTO public.contract_requests (
  company_name,
  contact_person,
  phone,
  email,
  address,
  city,
  province,
  unit_count,
  location_count,
  preferred_frequency,
  notes,
  status,
  quotation_amount,
  quotation_notes,
  quotation_sent_at,
  created_at
) VALUES
-- Request 1: Pending (baru masuk)
(
  'PT Maju Jaya Elektronik',
  'Budi Santoso',
  '081234567890',
  'budi@majujaya.com',
  'Jl. Sudirman No. 123, Blok A',
  'Jakarta Pusat',
  'DKI Jakarta',
  25,
  3,
  'monthly',
  'Kami memiliki 3 lokasi kantor cabang yang membutuhkan perawatan rutin bulanan. Total 25 unit AC split dan cassette.',
  'pending',
  NULL,
  NULL,
  NULL,
  NOW() - INTERVAL '2 days'
),

-- Request 2: Quoted (sudah dikirim penawaran)
(
  'Hotel Grand Permata',
  'Siti Nurhaliza',
  '082345678901',
  'info@grandpermata.com',
  'Jl. MH Thamrin No. 456',
  'Jakarta Selatan',
  'DKI Jakarta',
  50,
  1,
  'quarterly',
  'Hotel bintang 4 dengan 50 unit AC VRV. Butuh perawatan berkala setiap 3 bulan.',
  'quoted',
  12500000,
  'Penawaran maintenance quarterly untuk 50 unit AC VRV:
- Cleaning indoor & outdoor unit
- Pengecekan refrigerant
- Electrical check
- Report maintenance digital
- Garansi spare part 30 hari

Harga: Rp 12.500.000 per quarter (sudah include biaya transportasi)',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '5 days'
),

-- Request 3: Approved (sudah disetujui)
(
  'RS Sehat Sentosa',
  'Dr. Ahmad Fauzi',
  '083456789012',
  'admin@rssehat.com',
  'Jl. Gatot Subroto No. 789',
  'Bandung',
  'Jawa Barat',
  80,
  1,
  'monthly',
  'Rumah sakit dengan 80 unit AC central dan split. Perlu perawatan bulanan karena operasional 24/7.',
  'approved',
  28000000,
  'Paket maintenance bulanan RS Sehat Sentosa:
- 80 unit AC (central + split)
- Kunjungan 2x per bulan
- Emergency call 24/7
- Cleaning & checking menyeluruh
- Replacement part gratis untuk kerusakan normal

Harga kontrak tahunan: Rp 336.000.000 (Rp 28jt/bulan)
Pembayaran quarterly',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '7 days'
),

-- Request 4: Rejected (ditolak)
(
  'Warung Kopi Sejahtera',
  'Andi Wijaya',
  '084567890123',
  'andi@kopiku.com',
  'Jl. Kemanggisan No. 45',
  'Jakarta Barat',
  'DKI Jakarta',
  3,
  1,
  'semi_annual',
  'Warung kopi kecil dengan 3 unit AC split. Budget terbatas.',
  'rejected',
  NULL,
  NULL,
  NULL,
  NOW() - INTERVAL '10 days'
);

-- Verify inserted data
SELECT 
  company_name,
  contact_person,
  city,
  unit_count,
  status,
  TO_CHAR(created_at, 'DD Mon YYYY') as created_date
FROM public.contract_requests
ORDER BY created_at DESC;

-- Show status distribution
SELECT 
  status,
  COUNT(*) as count,
  STRING_AGG(company_name, ', ') as companies
FROM public.contract_requests
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'quoted' THEN 2
    WHEN 'approved' THEN 3
    WHEN 'rejected' THEN 4
    ELSE 5
  END;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sample contract requests inserted!';
  RAISE NOTICE '';
  RAISE NOTICE 'Status breakdown:';
  RAISE NOTICE '  • Pending: PT Maju Jaya Elektronik (25 units, 3 locations)';
  RAISE NOTICE '  • Quoted: Hotel Grand Permata (50 units, quarterly)';
  RAISE NOTICE '  • Approved: RS Sehat Sentosa (80 units, monthly)';
  RAISE NOTICE '  • Rejected: Warung Kopi Sejahtera (3 units)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test scenarios:';
  RAISE NOTICE '  1. View all requests in dashboard';
  RAISE NOTICE '  2. Send quotation untuk "pending" request';
  RAISE NOTICE '  3. Approve "quoted" request';
  RAISE NOTICE '  4. View details semua status';
  RAISE NOTICE '';
END $$;
