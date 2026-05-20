
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are public"
  ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage settings"
  ON public.site_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (key, value) VALUES
  ('brand', '{"name_bn":"তাজা বাজার","tagline_bn":"তাজা · বিশ্বস্ত · দ্রুত","logo_url":""}'::jsonb),
  ('seo', '{"title":"তাজা বাজার — অনলাইনে তাজা গ্রোসারি অর্ডার করুন","description":"ঘরে বসেই অর্ডার করুন তাজা শাকসবজি, মাছ, চাল, ডাল, তেল ও মসলা। ১ ঘণ্টায় দ্রুত হোম ডেলিভারি — সারা ঢাকা জুড়ে।","keywords":"গ্রোসারি, অনলাইন বাজার, ঢাকা, তাজা সবজি","og_image":"","favicon_url":""}'::jsonb),
  ('topbar', '{"location_bn":"ঢাকার সব এলাকায় ডেলিভারি","phone":"১৬২৪৭","enabled":true}'::jsonb),
  ('hero', '{"badge_bn":"১০০% তাজা · কৃষক থেকে সরাসরি","title_bn":"ঘরে বসেই পান","title_highlight_bn":"বাজারের সব তাজা","title_suffix_bn":"পণ্য","subtitle_bn":"শাকসবজি, মাছ-মাংস, চাল-ডাল, তেল-মসলা — সব কিছু এক জায়গায়। অর্ডারের ৬০ মিনিটের মধ্যে আপনার দরজায় পৌঁছে যাবে।","cta_primary_bn":"এখনই অর্ডার করুন","cta_secondary_bn":"ক্যাটাগরি দেখুন","image_url":""}'::jsonb),
  ('offer', '{"enabled":true,"label_bn":"সাপ্তাহিক ডিল","title_bn":"প্রথম অর্ডারে পান ১৫০ টাকা ছাড়!","subtitle_bn":"কুপন কোড ব্যবহার করুন","coupon_code":"TAJA150","min_order_bn":"সর্বনিম্ন অর্ডার ৫০০৳","cta_bn":"এখনই কিনুন"}'::jsonb),
  ('features', '[{"icon":"truck","text_bn":"৬০ মিনিটে ডেলিভারি"},{"icon":"shield","text_bn":"১০০% গ্যারান্টি"},{"icon":"clock","text_bn":"২৪/৭ সাপোর্ট"}]'::jsonb),
  ('footer', '{"about_bn":"তাজা বাজার — ঢাকার সবচেয়ে বিশ্বস্ত অনলাইন গ্রোসারি।","phone":"১৬২৪৭","email":"support@tajabazar.com","address_bn":"ঢাকা, বাংলাদেশ"}'::jsonb);
