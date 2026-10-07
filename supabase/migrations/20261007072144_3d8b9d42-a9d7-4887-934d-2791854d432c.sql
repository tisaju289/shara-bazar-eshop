ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH t AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
  FROM public.products
)
UPDATE public.products p
SET sort_order = t.rn
FROM t
WHERE p.id = t.id;

CREATE INDEX IF NOT EXISTS products_sort_order_idx ON public.products (sort_order);