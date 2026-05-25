ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reviews_rating numeric(2,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offer_badge text;