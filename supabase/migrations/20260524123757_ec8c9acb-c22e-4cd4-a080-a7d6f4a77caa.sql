ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS keywords text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS keywords text;