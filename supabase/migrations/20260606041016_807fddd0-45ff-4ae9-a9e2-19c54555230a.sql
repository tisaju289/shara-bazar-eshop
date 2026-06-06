ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;