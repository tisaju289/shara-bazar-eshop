-- Create subcategories table
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  name_bn text NOT NULL,
  slug text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  image_url text,
  keywords text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "public_select_subcategories"
  ON public.subcategories FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "admin_all_subcategories"
  ON public.subcategories FOR ALL USING (auth.role() = 'authenticated');

-- Add subcategory_id column to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory_id uuid
    REFERENCES public.subcategories(id) ON DELETE SET NULL;
