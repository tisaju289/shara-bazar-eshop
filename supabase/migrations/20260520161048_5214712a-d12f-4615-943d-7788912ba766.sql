-- Add image_url to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create public storage bucket for site images (categories, products, logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public can view site images"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-images');

-- Admins can upload
CREATE POLICY "Admins can upload site images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update site images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete site images"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));
