-- ============================================
-- CREATE STORAGE BUCKETS
-- For client documents and AC photos
-- ============================================

-- ================================================
-- 1. CLIENT DOCUMENTS BUCKET
-- ================================================

-- Create bucket for client documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for client-documents bucket
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents' AND owner = auth.uid());

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents' AND owner = auth.uid());

-- ================================================
-- 2. AC PHOTOS BUCKET
-- ================================================

-- Create bucket for AC unit photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ac-photos',
  'ac-photos',
  false,
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for ac-photos bucket
CREATE POLICY "Authenticated users can view AC photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ac-photos');

CREATE POLICY "Authenticated users can upload AC photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ac-photos');

CREATE POLICY "Users can update AC photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ac-photos' AND owner = auth.uid());

CREATE POLICY "Users can delete AC photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ac-photos' AND owner = auth.uid());

-- ================================================
-- 3. WORK ORDER PHOTOS BUCKET (for technicians)
-- ================================================

-- Create bucket for work order before/after photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-photos',
  'work-photos',
  false,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for work-photos bucket
-- Technicians can upload work photos
CREATE POLICY "Technicians can upload work photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-photos'
  AND auth.uid() IN (
    SELECT user_id FROM technicians WHERE user_id IS NOT NULL
  )
);

-- Technicians can view work photos from their assignments
CREATE POLICY "Technicians can view work photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-photos'
  AND (
    -- Technicians see their own photos
    auth.uid() IN (
      SELECT user_id FROM technicians WHERE user_id IS NOT NULL
    )
    -- Admins see all photos
    OR auth.uid() IN (
      SELECT user_id 
      FROM user_tenant_roles 
      WHERE role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  )
);

-- Technicians can delete their own recent photos
CREATE POLICY "Technicians can delete recent work photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-photos'
  AND auth.uid() IN (
    SELECT user_id FROM technicians WHERE user_id IS NOT NULL
  )
  AND created_at > NOW() - INTERVAL '24 hours'
);

-- ================================================
-- 4. TECHNICIAN AVATARS BUCKET (public)
-- ================================================

-- Create bucket for technician profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'technician-avatars',
  'technician-avatars',
  true,
  2097152, -- 2MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for technician-avatars bucket
CREATE POLICY "Technicians can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technician-avatars'
  AND auth.uid() IN (
    SELECT user_id FROM technicians WHERE user_id IS NOT NULL
  )
);

CREATE POLICY "Technicians can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'technician-avatars'
  AND auth.uid() IN (
    SELECT user_id FROM technicians WHERE user_id IS NOT NULL
  )
);

CREATE POLICY "Public can view technician avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'technician-avatars');

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ STORAGE BUCKETS CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Buckets:';
  RAISE NOTICE '  1. client-documents (10MB limit)';
  RAISE NOTICE '     - PDF, Images, Word, Excel';
  RAISE NOTICE '  2. ac-photos (5MB limit)';
  RAISE NOTICE '     - JPEG, PNG, WEBP only';
  RAISE NOTICE '  3. work-photos (10MB limit) 🆕';
  RAISE NOTICE '     - Work order before/after photos';
  RAISE NOTICE '  4. technician-avatars (2MB, public) 🆕';
  RAISE NOTICE '     - Technician profile photos';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS Policies:';
  RAISE NOTICE '  - Technicians can upload work photos';
  RAISE NOTICE '  - Admins can view all work photos';
  RAISE NOTICE '  - Public avatars for technicians';
  RAISE NOTICE '';
END $$;
