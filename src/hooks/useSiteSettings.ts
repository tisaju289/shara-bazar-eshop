import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Brand = { name_bn: string; tagline_bn: string; logo_url: string };
export type Seo = { title: string; description: string; keywords: string; og_image: string; favicon_url: string };
export type Topbar = { location_bn: string; phone: string; enabled: boolean };
export type MenuItem = { label_bn: string; url: string };
export type HeaderMenu = { items: MenuItem[] };
export type Hero = {
  badge_bn: string; title_bn: string; title_highlight_bn: string; title_suffix_bn: string;
  subtitle_bn: string; cta_primary_bn: string; cta_primary_enabled: boolean;
  cta_secondary_bn: string; cta_secondary_enabled: boolean; image_url: string;
  images?: string[];
};
export type Offer = {
  enabled: boolean; label_bn: string; title_bn: string; subtitle_bn: string;
  coupon_code: string; min_order_bn: string; cta_bn: string;
};
export type Feature = { icon: string; text_bn: string };
export type Footer = { about_bn: string; phone: string; email: string; address_bn: string };
export type Sections = {
  categories_title_bn: string;
  categories_subtitle_bn: string;
  products_title_bn: string;
  products_subtitle_bn: string;
};

export type DeliveryOption = { label_bn: string; charge: number; enabled: boolean };
export type Delivery = { enabled: boolean; options: DeliveryOption[] };

export type HomeSectionType = "hero" | "category" | "product" | "offer" | "banner";
type Base = { id: string; enabled: boolean };
export type HeroSection = Base & {
  type: "hero";
  badge_bn: string;
  title_bn: string;
  title_highlight_bn: string;
  title_suffix_bn: string;
  subtitle_bn: string;
  cta_primary_bn: string;
  cta_primary_enabled: boolean;
  cta_secondary_bn: string;
  cta_secondary_enabled: boolean;
  image_url: string;
  images: string[];
};
export type CategorySection = Base & {
  type: "category";
  title_bn: string;
  subtitle_bn: string;
};
export type ProductSection = Base & {
  type: "product";
  title_bn: string;
  subtitle_bn: string;
  category_id: string; // empty = all
  limit: number;
};
export type OfferSection = Base & {
  type: "offer";
  label_bn: string;
  title_bn: string;
  subtitle_bn: string;
  coupon_code: string;
  min_order_bn: string;
  cta_bn: string;
};
export type BannerSection = Base & {
  type: "banner";
  image_url: string;
  link: string;
  caption_bn: string;
};
export type HomeSection =
  | HeroSection
  | CategorySection
  | ProductSection
  | OfferSection
  | BannerSection;

export type Tracking = {
  // Meta (Facebook) Pixel + Conversions API
  meta_pixel_id: string;
  meta_capi_token: string;       // server-side access token (stored in DB; admin-only RLS)
  meta_test_event_code: string;  // optional, for Events Manager testing
  // Google
  ga4_id: string;                // e.g. G-XXXXXXX
  gtm_id: string;                // e.g. GTM-XXXX
  google_ads_id: string;         // e.g. AW-123456789
  google_ads_purchase_label: string; // conversion label for Purchase
  // TikTok
  tiktok_pixel_id: string;
  // Custom raw snippets
  head_html: string;
  body_html: string;
  // Master switch
  enabled: boolean;
};

export type SiteSettings = {
  brand: Brand;
  seo: Seo;
  topbar: Topbar;
  header_menu: HeaderMenu;
  hero: Hero;
  offer: Offer;
  features: Feature[];
  footer: Footer;
  sections: Sections;
  tracking: Tracking;
  delivery: Delivery;
  home_sections: HomeSection[];
};

const DEFAULTS: SiteSettings = {
  brand: { name_bn: "তাজা বাজার", tagline_bn: "তাজা · বিশ্বস্ত · দ্রুত", logo_url: "" },
  seo: { title: "তাজা বাজার", description: "", keywords: "", og_image: "", favicon_url: "" },
  topbar: { location_bn: "", phone: "", enabled: true },
  header_menu: { items: [] },
  hero: {
    badge_bn: "", title_bn: "", title_highlight_bn: "", title_suffix_bn: "",
    subtitle_bn: "", cta_primary_bn: "অর্ডার করুন", cta_primary_enabled: true,
    cta_secondary_bn: "দেখুন", cta_secondary_enabled: true, image_url: "", images: [],
  },
  offer: { enabled: false, label_bn: "", title_bn: "", subtitle_bn: "", coupon_code: "", min_order_bn: "", cta_bn: "" },
  features: [],
  footer: { about_bn: "", phone: "", email: "", address_bn: "" },
  sections: {
    categories_title_bn: "জনপ্রিয় ক্যাটাগরি",
    categories_subtitle_bn: "যেটি দরকার, এক ক্লিকেই খুঁজে নিন",
    products_title_bn: "আজকের তাজা পণ্য",
    products_subtitle_bn: "সরাসরি কৃষক থেকে সংগ্রহ করা",
  },
  tracking: {
    meta_pixel_id: "",
    meta_capi_token: "",
    meta_test_event_code: "",
    ga4_id: "",
    gtm_id: "",
    google_ads_id: "",
    google_ads_purchase_label: "",
    tiktok_pixel_id: "",
    head_html: "",
    body_html: "",
    enabled: true,
  },
  delivery: {
    enabled: true,
    options: [
      { label_bn: "ঢাকার ভিতরে", charge: 60, enabled: true },
      { label_bn: "ঢাকার বাইরে", charge: 120, enabled: true },
    ],
  },
  home_sections: [],
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
      const settings = map as SiteSettings;
      settings.home_sections = normalizeHomeSections(
        settings.home_sections,
        settings,
      );
      return settings;
    },
    staleTime: 60_000,
  });
}

function normalizeHomeSections(
  raw: any[] | undefined,
  s: SiteSettings,
): HomeSection[] {
  const arr = Array.isArray(raw) ? raw : [];
  if (arr.length === 0) {
    // Seed defaults from legacy hero/sections/offer so the home page
    // doesn't go blank for projects that never used home_sections.
    const seed: HomeSection[] = [
      {
        id: "seed-hero",
        enabled: true,
        type: "hero",
        badge_bn: s.hero.badge_bn,
        title_bn: s.hero.title_bn,
        title_highlight_bn: s.hero.title_highlight_bn,
        title_suffix_bn: s.hero.title_suffix_bn,
        subtitle_bn: s.hero.subtitle_bn,
        cta_primary_bn: s.hero.cta_primary_bn,
        cta_primary_enabled: s.hero.cta_primary_enabled,
        cta_secondary_bn: s.hero.cta_secondary_bn,
        cta_secondary_enabled: s.hero.cta_secondary_enabled,
        image_url: s.hero.image_url,
        images: s.hero.images ?? [],
      },
      {
        id: "seed-category",
        enabled: true,
        type: "category",
        title_bn: s.sections.categories_title_bn,
        subtitle_bn: s.sections.categories_subtitle_bn,
      },
      ...(s.offer.enabled
        ? [
            {
              id: "seed-offer",
              enabled: true,
              type: "offer" as const,
              label_bn: s.offer.label_bn,
              title_bn: s.offer.title_bn,
              subtitle_bn: s.offer.subtitle_bn,
              coupon_code: s.offer.coupon_code,
              min_order_bn: s.offer.min_order_bn,
              cta_bn: s.offer.cta_bn,
            },
          ]
        : []),
      {
        id: "seed-product",
        enabled: true,
        type: "product",
        title_bn: s.sections.products_title_bn,
        subtitle_bn: s.sections.products_subtitle_bn,
        category_id: "",
        limit: 12,
      },
    ];
    return seed;
  }
  return arr.map((item: any): HomeSection => {
    if (item && item.type) return item as HomeSection;
    // Legacy item (no type) → treat as product section
    return {
      id: item.id ?? crypto.randomUUID(),
      enabled: item.enabled ?? true,
      type: "product",
      title_bn: item.title_bn ?? "",
      subtitle_bn: item.subtitle_bn ?? "",
      category_id: item.category_id ?? "",
      limit: item.limit ?? 8,
    };
  });
}