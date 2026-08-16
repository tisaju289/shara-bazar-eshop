DROP POLICY IF EXISTS "admin_all_subcategories" ON public.subcategories;
CREATE POLICY "Admins manage subcategories" ON public.subcategories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Move secret token to a private settings row
INSERT INTO public.site_settings (key, value)
SELECT 'tracking_secret', jsonb_build_object('meta_capi_token', (value::jsonb ->> 'meta_capi_token'))
FROM public.site_settings WHERE key = 'tracking'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

UPDATE public.site_settings
SET value = (value::jsonb - 'meta_capi_token')
WHERE key = 'tracking';

DROP POLICY IF EXISTS "Settings are public" ON public.site_settings;
CREATE POLICY "Public settings are readable" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key <> 'tracking_secret');
CREATE POLICY "Admins read all settings" ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));