## লক্ষ্য

Admin Settings এ "হিরো সেকশন" ও "হোম সেকশন" এর ভেতরের "সেকশন হেডিং" — দুটোই সরিয়ে দেওয়া হবে। সব কিছু একটাই ট্যাব "হোম সেকশন" এর নিচে আসবে, যেখানে admin চাইলে যেকোনো সেকশন যোগ/বাদ/অন-অফ করতে পারবে।

## নতুন সেকশন টাইপ

প্রতিটি home section এ একটা `type` থাকবে:

- **hero** — ব্যাজ, টাইটেল (৩ অংশ), সাবটাইটেল, ২টা CTA বাটন, স্লাইডার ইমেজ
- **category** — টাইটেল/সাবটাইটেল + ক্যাটাগরি গ্রিড (সব ক্যাটাগরি)
- **product** — টাইটেল/সাবটাইটেল + ক্যাটাগরি ফিল্টার + limit (পণ্য গ্রিড)
- **offer** — অফার ব্যানার (label, title, subtitle, coupon code, min order, CTA)
- **banner** — একটা ইমেজ + optional link + optional caption (নতুন)

প্রতিটার `enabled` toggle, order (↑/↓), delete থাকবে।

## পরিবর্তন

### `src/hooks/useSiteSettings.ts`
- `HomeSection` টাইপ discriminated union করা — `type: "hero" | "category" | "product" | "offer" | "banner"` + প্রতিটার field।
- `Hero`, `Offer`, `Sections` টাইপ-গুলো রেখে দেওয়া (পুরোনো data যেন break না করে) কিন্তু default home_sections এ এদের data inject করা হবে যদি home_sections খালি থাকে (one-time seed at runtime in the hook)।

### `src/routes/admin.settings.tsx`
- TabKey থেকে `"hero"` সরানো, TABS থেকে "হিরো সেকশন" এন্ট্রি সরানো।
- `HomeSectionsTab` থেকে "সেকশন হেডিং" ব্লক ও `sections`/`onSections` props পুরো সরানো।
- `addItem` কে একটা টাইপ-পিকার দিয়ে replace — admin "সেকশন যোগ" বাটনে চাপলে ৫টা টাইপের একটা ড্রপডাউন/বাটন আসবে।
- প্রতিটা section card টাইপ অনুযায়ী আলাদা editor render করবে (hero editor, category editor, product editor, offer editor, banner editor)।
- `HeroTab` ও পুরোনো `SectionsTab` related কোড সরানো।
- `saveTab` সরল হবে — শুধু `home_sections` save করবে।

### `src/routes/index.tsx`
- পুরাতন hardcoded Hero, Categories heading, Offer JSX সরিয়ে একটাই loop: `homeSections.filter(enabled).map(...)` যেটা type অনুযায়ী render করবে।
- প্রতিটা টাইপের জন্য ছোট render component: `HeroSection`, `CategorySection`, `ProductSection`, `OfferSection`, `BannerSection` — যাদের props এ section data, cart helpers, categories, products যাবে।
- Backward compat: যদি `home_sections` খালি/legacy থাকে, পুরোনো `hero`/`offer`/`sections` থেকে default sections বানিয়ে দেখানো হবে (hook এর seeding দিয়ে)।

## টেকনিক্যাল ডিটেইলস

```ts
type HomeSectionBase = { id: string; enabled: boolean };
type HeroSection = HomeSectionBase & { type: "hero"; badge_bn; title_bn; title_highlight_bn; title_suffix_bn; subtitle_bn; cta_primary_bn; cta_primary_enabled; cta_secondary_bn; cta_secondary_enabled; images: string[] };
type CategorySection = HomeSectionBase & { type: "category"; title_bn; subtitle_bn };
type ProductSection = HomeSectionBase & { type: "product"; title_bn; subtitle_bn; category_id; limit };
type OfferSection = HomeSectionBase & { type: "offer"; label_bn; title_bn; subtitle_bn; coupon_code; min_order_bn; cta_bn };
type BannerSection = HomeSectionBase & { type: "banner"; image_url; link; caption_bn };
export type HomeSection = HeroSection | CategorySection | ProductSection | OfferSection | BannerSection;
```

পুরোনো `home_sections` (যাদের `type` নেই) কে hook এ load-time এ `type: "product"` ধরা হবে।

## আউট অফ স্কোপ

- DB schema change নেই — সবই `site_settings` jsonb এ থাকছে।
- পুরোনো `hero`/`offer`/`sections` settings রেকর্ড DB থেকে delete করা হচ্ছে না (যদি admin আবার দরকার মনে করে fallback হিসেবে থাকছে)।
