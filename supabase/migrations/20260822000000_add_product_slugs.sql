-- Product detail URLs use this stable, human-readable identifier.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.products
SET slug = 'product-' || id
WHERE slug IS NULL OR trim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx ON public.products (slug);