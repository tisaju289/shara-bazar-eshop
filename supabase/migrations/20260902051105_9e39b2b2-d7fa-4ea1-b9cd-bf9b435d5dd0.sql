ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(trim(both '-' from regexp_replace(lower(coalesce(_txt,'')), '[^a-z0-9\u0980-\u09FF]+', '-', 'g')), '')
$$;

UPDATE public.products p
SET slug = COALESCE(public.slugify(p.name_bn), 'product') || '-' || left(replace(p.id::text,'-',''), 6)
WHERE p.slug IS NULL;

CREATE OR REPLACE FUNCTION public.products_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := COALESCE(public.slugify(NEW.name_bn), 'product') || '-' || left(replace(NEW.id::text,'-',''), 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_slug_trg ON public.products;
CREATE TRIGGER products_set_slug_trg
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_set_slug();

ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products (slug);