import { Plus, Minus, Heart, Star } from "lucide-react";
import type { ProductCard as ProductCardSettings } from "@/hooks/useSiteSettings";
import { thumb, thumbSrcSet } from "@/lib/img";

export type ProductCardData = {
  id: string;
  name_bn: string;
  unit: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  tag: string | null;
  category_id: string | null;
  brand_id?: string | null;
  reviews_rating?: number | null;
  reviews_count?: number | null;
  offer_badge?: string | null;
};

type Props = {
  product: ProductCardData;
  categoryName?: string;
  brandName?: string;
  qty: number;
  add: (id: string) => void;
  sub: (id: string) => void;
  onBuyNow: () => void;
  settings?: ProductCardSettings;
};

const DEFAULTS: ProductCardSettings = {
  show_category: true, show_brand: true, show_unit: true, show_name: true,
  show_price: true, show_old_price: true, show_tag: true, show_offer_badge: true,
  show_reviews: true, show_add_to_cart: true, show_buy_now: true, show_wishlist: false,
  add_to_cart_text_bn: "কার্ট", buy_now_text_bn: "এখনই কিনুন",
  badge_bg: "#e11d48", badge_color: "#ffffff", badge_style: "starburst",
};

export function OfferBadge({ text, settings }: { text: string; settings: ProductCardSettings }) {
  const style = { background: settings.badge_bg, color: settings.badge_color };
  if (settings.badge_style === "starburst") {
    return (
      <div className="absolute -top-1 -right-1 z-10 size-14 md:size-16 grid place-items-center pointer-events-none">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
          <polygon
            points="50,2 58,15 73,8 75,24 90,25 83,39 97,48 84,57 91,72 76,73 75,89 60,83 51,97 42,84 27,90 26,75 11,73 18,58 4,49 17,40 9,25 24,24 25,9 40,15"
            fill={settings.badge_bg}
            stroke={settings.badge_bg}
          />
        </svg>
        <span
          className="relative font-extrabold text-[9px] md:text-[10px] leading-none text-center px-1"
          style={{ color: settings.badge_color }}
        >
          {text.split(/\s+/).map((w, i) => (
            <span key={i} className="block">{w}</span>
          ))}
        </span>
      </div>
    );
  }
  if (settings.badge_style === "ribbon") {
    return (
      <span className="absolute top-3 right-0 z-10 text-[10px] font-bold px-3 py-1 rounded-l-full shadow" style={style}>
        {text}
      </span>
    );
  }
  return (
    <span className="absolute top-3 right-3 z-10 text-[10px] font-bold px-2 py-1 rounded-full shadow" style={style}>
      {text}
    </span>
  );
}

export function ProductCard({ product: p, categoryName, brandName, qty, add, sub, onBuyNow, settings }: Props) {
  const s = { ...DEFAULTS, ...(settings ?? {}) };
  const meta = [s.show_brand && brandName, s.show_category && categoryName, s.show_unit && p.unit]
    .filter(Boolean).join(" · ");
  const rating = Number(p.reviews_rating ?? 0);
  const reviewCount = Number(p.reviews_count ?? 0);
  return (
    <article className="group relative flex flex-col h-full rounded-xl bg-card border border-border overflow-hidden hover:shadow-[var(--shadow-pop)] transition-all duration-300">
      <div className="relative aspect-square overflow-hidden bg-white">
        {p.image_url ? (
          <img src={thumb(p.image_url, 400)} alt={p.name_bn} loading="lazy" decoding="async" className="w-full h-full object-contain p-3 group-hover:scale-105 transition duration-500" />
        ) : (
          <div className="w-full h-full grid place-items-center text-5xl">🛒</div>
        )}
        {s.show_tag && p.tag && (
          <span className="absolute top-2 left-2 text-[10px] font-bold tracking-wide uppercase bg-[var(--chili)] text-white px-2 py-0.5 rounded">{p.tag}</span>
        )}
        {s.show_wishlist && (
          <button className="absolute top-2 right-2 size-8 rounded-full bg-background/80 grid place-items-center backdrop-blur hover:text-[var(--chili)]" aria-label="Wishlist">
            <Heart className="size-4" />
          </button>
        )}
        {s.show_offer_badge && p.offer_badge && <OfferBadge text={p.offer_badge} settings={s} />}
      </div>
      <div className="p-2.5 md:p-3 space-y-1 text-left flex flex-col flex-1 border-t border-border">
        <div className="text-[10px] md:text-[11px] italic text-muted-foreground">ডেলিভারি ১-২ ঘণ্টা</div>
        {s.show_name && <h3 className="font-semibold text-[13px] md:text-sm leading-snug line-clamp-2 min-h-[2.3rem]">{p.name_bn}</h3>}
        {meta && <div className="text-[10px] md:text-[11px] text-muted-foreground line-clamp-1">{meta}</div>}
        {s.show_reviews && reviewCount > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`size-3 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              ))}
            </div>
            <span>({reviewCount})</span>
          </div>
        )}
        {s.show_price && (
          <div className="flex items-baseline gap-1.5 pt-0.5">
            <span className="text-base md:text-lg font-extrabold text-[var(--leaf-deep)]">৳{p.price}</span>
            {s.show_old_price && p.old_price && <span className="text-xs text-muted-foreground line-through">৳{p.old_price}</span>}
          </div>
        )}
        {(s.show_add_to_cart || s.show_buy_now) && (
          <div className={`grid ${s.show_add_to_cart && s.show_buy_now ? "grid-cols-2" : "grid-cols-1"} gap-1.5 pt-1.5 mt-auto`}>
            {s.show_add_to_cart && (
              qty === 0 ? (
                <button onClick={() => add(p.id)} className="h-8 rounded-lg border border-primary bg-transparent text-primary text-xs font-bold inline-flex items-center justify-center gap-1 hover:bg-primary hover:text-primary-foreground transition">
                  <Plus className="size-3.5" /> {s.add_to_cart_text_bn}
                </button>
              ) : (
                <div className="flex items-center justify-between border border-primary text-primary rounded-lg h-8 px-1">
                  <button onClick={() => sub(p.id)} className="size-7 grid place-items-center"><Minus className="size-3.5" /></button>
                  <span className="text-xs font-bold">{qty}</span>
                  <button onClick={() => add(p.id)} className="size-7 grid place-items-center"><Plus className="size-3.5" /></button>
                </div>
              )
            )}
            {s.show_buy_now && (
              <button onClick={onBuyNow} className="h-8 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center hover:opacity-90">
                {s.buy_now_text_bn}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}