import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Brand = { name_bn: string; tagline_bn: string; logo_url: string };
export type Seo = { title: string; description: string; keywords: string; og_image: string; favicon_url: string };
export type Topbar = { location_bn: string; phone: string; enabled: boolean };
export type Hero = {
  badge_bn: string; title_bn: string; title_highlight_bn: string; title_suffix_bn: string;
  subtitle_bn: string; cta_primary_bn: string; cta_secondary_bn: string; image_url: string;
};
export type Offer = {
  enabled: boolean; label_bn: string; title_bn: string; subtitle_bn: string;
  coupon_code: string; min_order_bn: string; cta_bn: string;
};
export type Feature = { icon: string; text_bn: string };
export type Footer = { about_bn: string; phone: string; email: string; address_bn: string };

export type SiteSettings = {
  brand: Brand;
  seo: Seo;
  topbar: Topbar;
  hero: Hero;
  offer: Offer;
  features: Feature[];
  footer: Footer;
};

const DEFAULTS: SiteSettings = {
  brand: { name_bn: "তাজা বাজার", tagline_bn: "তাজা · বিশ্বস্ত · দ্রুত", logo_url: "" },
  seo: { title: "তাজা বাজার", description: "", keywords: "", og_image: "", favicon_url: "" },
  topbar: { location_bn: "", phone: "", enabled: true },
  hero: {
    badge_bn: "", title_bn: "", title_highlight_bn: "", title_suffix_bn: "",
    subtitle_bn: "", cta_primary_bn: "অর্ডার করুন", cta_secondary_bn: "দেখুন", image_url: "",
  },
  offer: { enabled: false, label_bn: "", title_bn: "", subtitle_bn: "", coupon_code: "", min_order_bn: "", cta_bn: "" },
  features: [],
  footer: { about_bn: "", phone: "", email: "", address_bn: "" },
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await (supabase as any).from("site_settings").select("key,value");
      if (error) throw error;
      const map: any = { ...DEFAULTS };
      for (const row of (data ?? []) as { key: string; value: any }[]) {
        map[row.key] = row.value;
      }
      return map as SiteSettings;
    },
    staleTime: 60_000,
  });
}