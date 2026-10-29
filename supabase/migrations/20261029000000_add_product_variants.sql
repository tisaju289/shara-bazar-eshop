ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.variants IS
  'Additional selectable product options with individual labels and prices; stock is shared with the product.';
