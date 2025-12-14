# CASE STUDY: Kontrak Maintenance Multi-Frequency
## Customer dengan 2 Schedule Berbeda (Bulanan + 4 Bulanan)

---

## 📋 Kasus Nyata

**Customer**: PT ABC (misalnya)
**Sales Partner**: Pak Budi (sales perusahaan)
**Sistem Pembayaran**: Harga diskon

### Kontrak 1: Maintenance Bulanan
- **Frekuensi**: Setiap bulan
- **Scope**: Cuci AC 2 ruang (Ruang Meeting + Ruang Direktur)
- **Harga**: Rp 300.000/service
- **Diskon**: 10% (karena sales partner)
- **Final Price**: Rp 270.000/service
- **Periode**: 12 bulan (1 tahun)
- **Total Value**: Rp 3.240.000 (12x @ 270rb)

### Kontrak 2: Maintenance 4 Bulanan
- **Frekuensi**: Setiap 4 bulan sekali
- **Scope**: Cuci seluruh ruang (8 unit AC)
- **Harga**: Rp 1.200.000/service
- **Diskon**: 15% (karena package besar)
- **Final Price**: Rp 1.020.000/service
- **Periode**: 12 bulan (3x service dalam setahun)
- **Total Value**: Rp 3.060.000 (3x @ 1.020rb)

---

## 💾 Data Structure SQL

### Insert Customer (Client)
```sql
-- Asumsi client sudah ada, kalau belum:
INSERT INTO public.clients (
  tenant_id,
  name,
  phone,
  email,
  address,
  client_type
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  'PT ABC Indonesia',
  '08123456789',
  'info@ptabc.com',
  'Jl. Sudirman No. 123, Jakarta',
  'corporate'
) RETURNING id; -- simpan id ini sebagai @client_id
```

### Insert Kontrak 1: Bulanan (2 Ruang)
```sql
INSERT INTO public.maintenance_contracts (
  tenant_id,
  client_id,
  contract_number,
  start_date,
  end_date,
  is_active,
  
  -- Recurring settings
  frequency,
  frequency_months,
  service_day_preference, -- misal tgl 5 setiap bulan
  preferred_time,
  
  -- Service scope
  service_scope,
  room_count,
  
  -- Service details
  job_type,
  job_category,
  service_notes,
  
  -- Pricing
  price_per_service,
  discount_percentage,
  final_price_per_service,
  total_contract_value,
  
  -- Assignment
  sales_partner_id,
  created_by
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  '@client_id', -- ganti dengan ID client PT ABC
  'MC-2025-001', -- contract number
  '2025-01-01',
  '2025-12-31',
  true,
  
  'monthly',
  1,
  5, -- service tanggal 5 setiap bulan
  '09:00:00',
  
  'Cuci AC 2 ruang (Meeting + Direktur)',
  2,
  
  'maintenance',
  'commercial',
  'Maintenance rutin bulanan untuk 2 ruang utama',
  
  300000.00,
  10.00, -- 10% discount
  270000.00,
  3240000.00, -- 12 bulan x 270rb
  
  (SELECT id FROM profiles WHERE full_name = 'Pak Budi'), -- sales partner
  (SELECT id FROM profiles WHERE full_name = 'Admin') -- created_by
) RETURNING id; -- simpan sebagai @contract_1_id
```

### Insert Units untuk Kontrak 1
```sql
-- Unit 1: Ruang Meeting
INSERT INTO public.contract_units (
  contract_id,
  unit_category,
  brand,
  capacity,
  room_name,
  floor_level,
  location_description,
  is_active
) VALUES (
  '@contract_1_id',
  'split',
  'Daikin',
  '2 PK',
  'Ruang Meeting',
  'Lantai 2',
  'Ruang meeting utama lantai 2, di sebelah lift',
  true
);

-- Unit 2: Ruang Direktur
INSERT INTO public.contract_units (
  contract_id,
  unit_category,
  brand,
  capacity,
  room_name,
  floor_level,
  location_description,
  is_active
) VALUES (
  '@contract_1_id',
  'split',
  'Panasonic',
  '1.5 PK',
  'Ruang Direktur',
  'Lantai 3',
  'Ruang direktur utama lantai 3',
  true
);
```

### Insert Kontrak 2: 4 Bulanan (Seluruh Ruang)
```sql
INSERT INTO public.maintenance_contracts (
  tenant_id,
  client_id,
  contract_number,
  start_date,
  end_date,
  is_active,
  
  frequency,
  frequency_months,
  service_day_preference,
  preferred_time,
  
  service_scope,
  room_count,
  
  job_type,
  job_category,
  service_notes,
  
  price_per_service,
  discount_percentage,
  final_price_per_service,
  total_contract_value,
  
  sales_partner_id,
  created_by
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  '@client_id',
  'MC-2025-002',
  '2025-01-01',
  '2025-12-31',
  true,
  
  'custom_months',
  4, -- setiap 4 bulan
  15, -- service tanggal 15
  '10:00:00',
  
  'Cuci seluruh ruang kantor (8 unit AC)',
  8,
  
  'maintenance',
  'commercial',
  'Maintenance berkala 4 bulanan untuk semua unit AC kantor',
  
  1200000.00,
  15.00, -- 15% discount
  1020000.00,
  3060000.00, -- 3x service x 1.020.000
  
  (SELECT id FROM profiles WHERE full_name = 'Pak Budi'),
  (SELECT id FROM profiles WHERE full_name = 'Admin')
) RETURNING id; -- simpan sebagai @contract_2_id
```

### Insert 8 Units untuk Kontrak 2
```sql
-- Simplified: Insert 8 units dengan different rooms
INSERT INTO public.contract_units (contract_id, unit_category, room_name, floor_level, is_active)
VALUES 
  ('@contract_2_id', 'split', 'Ruang Meeting', 'Lantai 2', true),
  ('@contract_2_id', 'split', 'Ruang Direktur', 'Lantai 3', true),
  ('@contract_2_id', 'cassette', 'Ruang Staff 1', 'Lantai 1', true),
  ('@contract_2_id', 'split', 'Ruang Staff 2', 'Lantai 1', true),
  ('@contract_2_id', 'split', 'Ruang Accounting', 'Lantai 2', true),
  ('@contract_2_id', 'split', 'Ruang IT', 'Lantai 2', true),
  ('@contract_2_id', 'cassette', 'Lobby', 'Lantai 1', true),
  ('@contract_2_id', 'split', 'Pantry', 'Lantai 1', true);
```

---

## 🔄 Logic Auto-Generate Schedule

### Kontrak 1 (Monthly) → Generate 12 schedules
```
2025-01-05 09:00 - Cuci 2 ruang
2025-02-05 09:00 - Cuci 2 ruang
2025-03-05 09:00 - Cuci 2 ruang
... (dst sampai Desember)
```

### Kontrak 2 (4-Monthly) → Generate 3 schedules
```
2025-01-15 10:00 - Cuci 8 unit (seluruh ruang)
2025-05-15 10:00 - Cuci 8 unit
2025-09-15 10:00 - Cuci 8 unit
```

---

## 💻 Function untuk Generate Schedules

```sql
CREATE OR REPLACE FUNCTION generate_initial_schedules(contract_id_param UUID)
RETURNS TABLE(scheduled_date DATE, scheduled_time TIME) AS $$
DECLARE
  contract_rec RECORD;
  current_date_iter DATE;
  end_date_limit DATE;
BEGIN
  -- Get contract details
  SELECT * INTO contract_rec
  FROM public.maintenance_contracts
  WHERE id = contract_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;
  
  current_date_iter := contract_rec.start_date;
  end_date_limit := contract_rec.end_date;
  
  -- Loop and generate schedules based on frequency
  WHILE current_date_iter <= end_date_limit LOOP
    -- Insert schedule
    INSERT INTO public.generated_schedules (
      tenant_id,
      contract_id,
      scheduled_date,
      scheduled_time,
      status
    ) VALUES (
      contract_rec.tenant_id,
      contract_rec.id,
      current_date_iter,
      contract_rec.preferred_time,
      'pending'
    ) ON CONFLICT (contract_id, scheduled_date) DO NOTHING;
    
    -- Return row
    scheduled_date := current_date_iter;
    scheduled_time := contract_rec.preferred_time;
    RETURN NEXT;
    
    -- Calculate next date
    IF contract_rec.frequency = 'monthly' OR contract_rec.frequency_months = 1 THEN
      current_date_iter := current_date_iter + INTERVAL '1 month';
    ELSIF contract_rec.frequency = 'quarterly' OR contract_rec.frequency_months = 3 THEN
      current_date_iter := current_date_iter + INTERVAL '3 months';
    ELSIF contract_rec.frequency = 'custom_months' THEN
      current_date_iter := current_date_iter + (contract_rec.frequency_months || ' months')::INTERVAL;
    ELSE
      EXIT; -- unknown frequency
    END IF;
    
    -- Adjust to preferred day
    IF contract_rec.service_day_preference IS NOT NULL THEN
      current_date_iter := date_trunc('month', current_date_iter) + 
                          (contract_rec.service_day_preference - 1 || ' days')::INTERVAL;
    END IF;
  END LOOP;
  
END;
$$ LANGUAGE plpgsql;
```

### Test Generate Schedules
```sql
-- Generate untuk kontrak 1 (monthly)
SELECT * FROM generate_initial_schedules('@contract_1_id');

-- Generate untuk kontrak 2 (4-monthly)
SELECT * FROM generate_initial_schedules('@contract_2_id');

-- View hasil
SELECT 
  gs.scheduled_date,
  gs.scheduled_time,
  mc.contract_number,
  mc.service_scope,
  mc.frequency
FROM public.generated_schedules gs
JOIN public.maintenance_contracts mc ON mc.id = gs.contract_id
WHERE mc.client_id = '@client_id'
ORDER BY gs.scheduled_date;
```

---

## 🎯 Hasil yang Diharapkan

Setelah generate, sistem akan punya:
- **12 schedule** untuk kontrak bulanan (tgl 5 setiap bulan)
- **3 schedule** untuk kontrak 4 bulanan (tgl 15 bulan Jan, Mei, Sep)
- Total **15 schedules** untuk tahun 2025

Admin tinggal:
1. Review di dashboard
2. Confirm schedules
3. Convert to service_order saat mendekati tanggal
4. Assign teknisi
5. Track completion

---

## 📊 Reporting Dashboard Ideas

**View untuk Sales Partner:**
```sql
-- Total kontrak value per sales
SELECT 
  p.full_name as sales_name,
  COUNT(mc.id) as total_contracts,
  SUM(mc.total_contract_value) as total_revenue,
  AVG(mc.discount_percentage) as avg_discount
FROM maintenance_contracts mc
JOIN profiles p ON p.id = mc.sales_partner_id
WHERE mc.is_active = true
GROUP BY p.full_name;
```

**View upcoming services:**
```sql
-- Services 30 hari ke depan
SELECT 
  gs.scheduled_date,
  c.name as client_name,
  mc.service_scope,
  mc.final_price_per_service,
  gs.status
FROM generated_schedules gs
JOIN maintenance_contracts mc ON mc.id = gs.contract_id
JOIN clients c ON c.id = mc.client_id
WHERE gs.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
AND gs.status IN ('pending', 'confirmed')
ORDER BY gs.scheduled_date;
```

---

Setelah run SQL, kita bisa diskusikan:
1. Error apa yang muncul?
2. Perlu adjustment di structure?
3. UI form untuk create contract seperti apa?
4. Workflow approve/convert schedule?
