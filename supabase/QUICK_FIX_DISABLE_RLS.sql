-- SOLUSI CEPAT: Disable RLS dan fix trigger untuk testing public form
-- Jalankan ini di Supabase SQL Editor

-- Step 1: Disable RLS untuk service_orders (TEMPORARY)
ALTER TABLE public.service_orders DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop trigger yang bermasalah (jika ada)
DROP TRIGGER IF EXISTS set_updated_at ON public.service_orders;
DROP TRIGGER IF EXISTS auto_generate_order_number ON public.service_orders;
DROP TRIGGER IF EXISTS track_status_change_trigger ON public.service_orders;

-- Step 3: Recreate auto_generate_order_number trigger (essential)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'SO-' || 
                        TO_CHAR(NOW(), 'YYYYMM') || '-' || 
                        LPAD(nextval('service_orders_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_order_number
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- Verify
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'service_orders';

-- CATATAN: Setelah form bekerja, enable kembali dengan:
-- ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
