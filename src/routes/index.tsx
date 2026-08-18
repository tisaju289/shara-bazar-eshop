import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { ProductSlider } from "@/components/ProductSlider";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ShoppingCart, MapPin, Phone, X, Plus, Minus, ChevronLeft,
  Truck, ShieldCheck, Clock, Leaf, Star, ChevronRight, Loader2,
  Home, LayoutGrid, Package, CheckCircle2,
} from "lucide-react";
import heroImg from "@/assets/hero-grocery.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SiteHeader } from "@/components/SiteHeader";
import { trackEvent } from "@/lib/tracking";
import { useCart } from "@/hooks/useCart";
import { ProductCard } from "@/components/ProductCard";
import { CategoryMarquee } from "@/components/CategoryMarquee";

export const Route = createFileRoute("/")({
  component: Index,
});

function HeroSlider({ images, fallback, aspectRatio }: { images: string[]; fallback: string; aspectRatio?: string }) {
  const slides = images.length > 0 ? images : [fallback];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [slides.length]);
  const go = (n: number) => setIdx((n + slides.length) % slides.length);
  return (
    <div className="relative rounded-[2rem] overflow-hidden shadow-[var(--shadow-pop)] border border-border bg-white">
      <div
        className="relative hero-frame"
        style={{ ["--hero-ar" as any]: (aspectRatio || "21/9").replace("/", " / ") }}
      >
        {slides.map((src, i) => (
          <img key={i} src={src} alt={`hero-${i}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0"}`} />
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => go(idx - 1)} aria-label="prev"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/80 hover:bg-white grid place-items-center shadow">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => go(idx + 1)} aria-label="next"
            className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/80 hover:bg-white grid place-items-center shadow">
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck, shield: ShieldCheck, clock: Clock, leaf: Leaf, star: Star,
};

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target?.getTime()]);
  if (!target) return null;
  const diff = Math.max(0, target.getTime() - now);
  const totalSec = Math.floor(diff / 1000);
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="min-w-[2.2rem] rounded-md bg-[var(--chili,#e11d48)] bg-red-600 text-white text-sm md:text-base font-extrabold px-1.5 py-1 text-center tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground mt-0.5 tracking-wide">{label}</span>
    </div>
  );
}

type BrandItem = { id: string; name_bn: string; image_url: string | null; slug: string };

function BrandMarquee({ brands, brandCounts }: { brands: BrandItem[]; brandCounts: Record<string, number> }) {
  return <BrandMarqueeInner brands={brands} brandCounts={brandCounts} />;
}

function DealBlock({ sec, products, categories, brands, cart, add, sub, onBuyNow, cardSettings }: {
  sec: any;
  products: any[];
  categories: any[];
  brands: any[];
  cart: Record<string, number>;
  add: (id: string) => void;
  sub: (id: string) => void;
  onBuyNow: (id: string) => void;
  cardSettings: any;
}) {
  const tabs: { label_bn: string; category_id: string }[] = Array.isArray(sec.tabs) ? sec.tabs : [];
  const [active, setActive] = useState(0);
  const target = useMemo(() => {
    if (sec.countdown_enabled === false) return null;
    if (sec.end_at) {
      const d = new Date(sec.end_at);
      if (isNaN(d.getTime())) return null;
      if (sec.daily_reset) {
        const now = new Date();
        const next = new Date(now);
        next.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), 0);
        if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
        return next;
      }
      return d;
    }
    const end = new Date();
    end.setHours(23, 59, 59, 0);
    return end;
  }, [sec.end_at, sec.daily_reset, sec.countdown_enabled]);
  const cd = useCountdown(target);

  const catId = tabs[active]?.category_id ?? "";
  const filtered = catId ? products.filter((p) => p.category_id === catId) : products;
  const items = (filtered.length ? filtered : products).slice(0, sec.limit || 12);
  if (items.length === 0) return null;
  const left = (sec.side_position ?? "left") === "left";

  const banner = sec.side_image_url ? (
    <div className="md:w-[240px] lg:w-[280px] shrink-0">
      {sec.side_link ? (
        <a href={sec.side_link} className="block rounded-2xl overflow-hidden">
          <img src={sec.side_image_url} alt={sec.title_bn || ""} className="w-full h-full object-cover" loading="lazy" />
        </a>
      ) : (
        <img src={sec.side_image_url} alt={sec.title_bn || ""} className="w-full rounded-2xl object-cover" loading="lazy" />
      )}
    </div>
  ) : null;

  return (
    <section className="py-6 md:py-10">
      <div className="container mx-auto px-4">
        <div className="rounded-3xl p-4 md:p-6" style={{ background: sec.bg_color || "var(--secondary)" }}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)]">{sec.title_bn}</h2>
            {cd && (
              <div className="flex items-end gap-1.5">
                <CountdownBox value={cd.hours} label="HRS" />
                <CountdownBox value={cd.minutes} label="MIN" />
                <CountdownBox value={cd.seconds} label="SEC" />
              </div>
            )}
            {tabs.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar ml-auto">
                {tabs.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
                      i === active
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "bg-background text-foreground border-border hover:border-primary"
                    }`}
                  >
                    {t.label_bn}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            {left && banner}
            <div className="min-w-0 flex-1">
              <ProductSlider
                products={items}
                categories={categories}
                brands={brands}
                cart={cart}
                add={add}
                sub={sub}
                onBuyNow={onBuyNow}
                settings={cardSettings}
                display="slider"
              />
            </div>
            {!left && banner}
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandMarqueeInner({ brands, brandCounts }: { brands: BrandItem[]; brandCounts: Record<string, number> }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="prev brands"
        className="grid absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 md:-translate-x-1/2 z-10 size-9 md:size-10 rounded-full bg-white shadow-[var(--shadow-pop)] border border-border place-items-center hover:bg-secondary"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="next brands"
        className="grid absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 md:translate-x-1/2 z-10 size-9 md:size-10 rounded-full bg-white shadow-[var(--shadow-pop)] border border-border place-items-center hover:bg-secondary"
      >
        <ChevronRight className="size-5" />
      </button>
      <div
        ref={ref}
        className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {brands.map((b) => (
          <Link
            key={b.id}
            to="/brands/$brandId"
            params={{ brandId: b.id }}
            className="group shrink-0 flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-[var(--shadow-pop)] transition min-w-[100px] md:min-w-[120px]"
          >
            <div
              className="size-16 md:size-20 rounded-2xl grid place-items-center overflow-hidden group-hover:scale-110 transition"
              style={{ background: "var(--gradient-warm)" }}
            >
              {b.image_url ? (
                <img src={b.image_url} alt={b.name_bn} className="size-full object-contain p-1" />
              ) : (
                <span className="text-3xl">🏷️</span>
              )}
            </div>
            <div className="text-xs md:text-sm font-semibold text-center leading-tight">{b.name_bn}</div>
            <div className="text-[10px] text-muted-foreground">{brandCounts[b.id] ?? 0} পণ্য</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategorySlider({ categories, catCounts }: { categories: DBCategory[]; catCounts: Record<string, number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories.length]);

  // Auto slide
  useEffect(() => {
    if (categories.length <= 4) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
    }, 3500);
    return () => clearInterval(t);
  }, [categories.length]);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={!canPrev}
        aria-label="prev"
        className="grid absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 md:-translate-x-1/2 z-10 size-9 md:size-10 rounded-full bg-white shadow-[var(--shadow-pop)] border border-border place-items-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={!canNext}
        aria-label="next"
        className="grid absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 md:translate-x-1/2 z-10 size-9 md:size-10 rounded-full bg-white shadow-[var(--shadow-pop)] border border-border place-items-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="size-5" />
      </button>
      <div
        ref={ref}
        className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((c) => (
          <Link
            key={c.id}
            to="/cat/$catId"
            params={{ catId: c.id }}
            className="group snap-start shrink-0 basis-[calc(25%-0.6rem)] md:basis-[14%] flex flex-col items-center gap-2 p-2 md:p-4 rounded-2xl bg-card border border-border hover:border-primary transition"
          >
            <div className="size-14 md:size-16 rounded-2xl grid place-items-center text-2xl md:text-3xl group-hover:scale-110 transition overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
              {c.image_url ? <img src={c.image_url} alt={c.name_bn} className="size-full object-cover" /> : "🛒"}
            </div>
            <div className="text-[11px] md:text-sm font-semibold text-center leading-tight">{c.name_bn}</div>
            <div className="text-[10px] text-muted-foreground">{catCounts[c.id] ?? 0} আইটেম</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

type DBProduct = {
  id: string; name_bn: string; unit: string; price: number; old_price: number | null;
  image_url: string | null; tag: string | null; stock: number; is_active: boolean;
  category_id: string | null; brand_id: string | null;
  reviews_rating: number | null; reviews_count: number | null; offer_badge: string | null;
};
type DBCategory = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null };

const PRODUCT_COLUMNS =
  "id,name_bn,unit,price,old_price,image_url,tag,stock,is_active,category_id,brand_id,subcategory_id,reviews_rating,reviews_count,offer_badge,created_at";
const MAX_PUBLIC_PRODUCTS = 5000;

function useCategories() {
  return useQuery({
    queryKey: ["categories", "public"],
    queryFn: async (): Promise<DBCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name_bn,slug,sort_order,image_url")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}
function useBrands() {
  return useQuery({
    queryKey: ["brands", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name_bn,image_url,slug")
        .eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data as { id: string; name_bn: string; image_url: string | null; slug: string }[]) ?? [];
    },
  });
}
function useProducts() {
  return useQuery({
    queryKey: ["products", "public"],
    queryFn: async (): Promise<DBProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(0, MAX_PUBLIC_PRODUCTS - 1);
      if (error) throw error;
      return (data as unknown as DBProduct[]) ?? [];
    },
  });
}

function Index() {
  const { data: settings } = useSiteSettings();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: products = [], isLoading: prodLoading } = useProducts();

  const [cart, setCart] = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate({ to: "/products", search: { q: q || undefined } as any });
    setSearchOpen(false);
  };
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<Record<string, number>>({});
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "" });
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const deliveryOptions = (settings?.delivery?.enabled ? settings?.delivery?.options ?? [] : []).filter((o) => o.enabled);
  const [deliveryIdx, setDeliveryIdx] = useState(0);
  const deliveryCharge = deliveryOptions[deliveryIdx]?.charge ?? 0;
  const deliveryLabel = deliveryOptions[deliveryIdx]?.label_bn ?? "";

  const add = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    const p = products.find((x) => x.id === id);
    if (p) {
      trackEvent("AddToCart", {
        value: p.price,
        currency: "BDT",
        content_ids: [id],
        content_name: p.name_bn,
        content_type: "product",
        contents: [{ id, quantity: 1, item_price: p.price }],
      });
    }
  };
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const { [id]: _, ...rest } = c;
      return n > 0 ? { ...c, [id]: n } : rest;
    });

  const openCheckout = (items: Record<string, number>) => {
    setCheckoutItems(items);
    setOrderDone(false);
    setOrderError(null);
    setCheckoutOpen(true);
    const ids = Object.keys(items);
    const total = ids.reduce((s, id) => s + (products.find((p) => p.id === id)?.price ?? 0) * items[id], 0);
    trackEvent("InitiateCheckout", {
      value: total,
      currency: "BDT",
      content_ids: ids,
      content_type: "product",
      num_items: Object.values(items).reduce((a, b) => a + b, 0),
      contents: ids.map((id) => ({ id, quantity: items[id], item_price: products.find((p) => p.id === id)?.price })),
    });
  };

  const checkoutTotal = useMemo(
    () => Object.entries(checkoutItems).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [checkoutItems, products],
  );
  const grandTotal = checkoutTotal + deliveryCharge;

  const placeOrder = async () => {
    setOrderError(null);
    if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.address.trim()) {
      setOrderError("সব তথ্য পূরণ করুন");
      return;
    }
    setPlacing(true);
    const items = Object.entries(checkoutItems).map(([id, q]) => {
      const p = products.find((x) => x.id === id);
      return { id, name_bn: p?.name_bn, price: p?.price, unit: p?.unit, qty: q };
    });
    const { error } = await (supabase as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string } | null }> } })
      .from("orders")
      .insert({
        customer_name: orderForm.name.trim(),
        phone: orderForm.phone.trim(),
        address: orderForm.address.trim(),
        items,
        total: grandTotal,
        payment_method: "cod",
      });
    setPlacing(false);
    if (error) {
      setOrderError(error.message);
      return;
    }
    // clear ordered items from main cart
    setCart((c) => {
      const next = { ...c };
      for (const id of Object.keys(checkoutItems)) delete next[id];
      return next;
    });
    setOrderForm({ name: "", phone: "", address: "" });
    setOrderDone(true);
    trackEvent("Purchase", {
      value: grandTotal,
      currency: "BDT",
      content_ids: Object.keys(checkoutItems),
      content_type: "product",
      num_items: Object.values(checkoutItems).reduce((a, b) => a + b, 0),
      contents: Object.entries(checkoutItems).map(([id, q]) => ({
        id, quantity: q, item_price: products.find((p) => p.id === id)?.price,
      })),
      phone: orderForm.phone.trim(),
      external_id: orderForm.phone.trim(),
    });
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () => Object.entries(cart).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [cart, products],
  );

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) if (p.category_id) m[p.category_id] = (m[p.category_id] ?? 0) + 1;
    return m;
  }, [products]);

  const brandCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) if (p.brand_id) m[p.brand_id] = (m[p.brand_id] ?? 0) + 1;
    return m;
  }, [products]);

  const brand = settings?.brand;
  const topbar = settings?.topbar;
  const features = settings?.features ?? [];
  const footer = settings?.footer;
  const menuItems = settings?.header_menu?.items ?? [];
  const homeSections = (settings?.home_sections ?? []).filter((s) => s.enabled);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top utility bar */}
      {topbar?.enabled && (
        <div className="hidden md:block bg-[var(--leaf-deep)] text-primary-foreground/90 text-xs">
          <div className="container mx-auto px-4 flex items-center gap-4 py-2">
            <span className="flex items-center gap-1.5 shrink-0"><MapPin className="size-3.5" /> {topbar.location_bn}</span>
            {topbar.notice_enabled && topbar.notice_bn && (
              <div className="flex-1 overflow-hidden text-right rounded-none">
                <div className="marquee-track" style={{ animationDuration: `${topbar.notice_speed ?? 30}s` }}>
                  <span className="px-8">📢 {topbar.notice_bn}</span>
                  <span className="px-8">📢 {topbar.notice_bn}</span>
                </div>
              </div>
            )}
            <span className="flex items-center gap-4 shrink-0 ml-auto">
              <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> {topbar.phone}</span>
              <span>সাহায্য</span>
              <span>আমার অর্ডার</span>
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="hidden md:block sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 md:gap-6">
          <a href="/" className="flex items-center gap-2 shrink-0">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name_bn} className="size-10 rounded-2xl object-contain bg-white p-1 shadow-[var(--shadow-soft)]" />
            ) : (
              <div className="size-10 rounded-2xl grid place-items-center text-primary-foreground shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-hero)" }}>
                <Leaf className="size-5" />
              </div>
            )}
            <div className="leading-tight">
              <div className="font-[family-name:var(--font-display)] font-extrabold text-lg text-[var(--leaf-deep)]">{brand?.name_bn ?? "তাজা বাজার"}</div>
              {brand?.tagline_bn && <div className="text-[10px] text-muted-foreground -mt-0.5 hidden sm:block">{brand.tagline_bn}</div>}
            </div>
          </a>

          <form onSubmit={submitSearch} className="flex-1 min-w-0">
            <div className="relative">
              <button type="submit" aria-label="search" className="absolute left-2 top-1/2 -translate-y-1/2 size-9 grid place-items-center text-muted-foreground hover:text-primary">
                <Search className="size-5" />
              </button>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="খুঁজুন: ইলিশ, আম, মিনিকেট চাল..."
                className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border border-transparent focus:border-primary outline-none transition placeholder:text-muted-foreground"
              />
            </div>
          </form>

          {menuItems.length > 0 && (
            <nav className="flex items-center gap-x-5 text-sm font-medium text-[var(--leaf-deep)]">
              {menuItems.map((m, i) => (
                <a key={i} href={m.url} className="hover:text-primary transition whitespace-nowrap">{m.label_bn}</a>
              ))}
            </nav>
          )}

          <button onClick={() => setCartOpen(true)} className="relative inline-flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-primary-foreground hover:opacity-95 transition shadow-[var(--shadow-soft)]">
            <ShoppingCart className="size-5" />
            <span className="hidden sm:inline text-sm font-semibold">৳{cartTotal}</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-[var(--chili)] text-white text-[11px] grid place-items-center font-bold">{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile site header (logo + search) */}
      <div className="md:hidden">
        <SiteHeader cartCount={cartCount} cartTotal={cartTotal} onCartClick={() => setCartOpen(true)} />
      </div>

      {/* Mobile search bar (toggleable) */}
      {searchOpen && (
        <form onSubmit={submitSearch} className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
          <div className="relative">
            <button type="submit" aria-label="search" className="absolute left-2 top-1/2 -translate-y-1/2 size-9 grid place-items-center text-muted-foreground">
              <Search className="size-5" />
            </button>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="খুঁজুন তাজা পণ্য..."
              className="w-full h-11 pl-12 pr-10 rounded-full bg-secondary outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-5" />
            </button>
          </div>
        </form>
      )}




      {/* Admin-configurable home sections */}
      {prodLoading && (
        <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
      )}
      {!prodLoading && homeSections.map((sec) => {
        if (sec.type === "hero") {
          const sideCards = (sec.side_cards ?? []).filter((c) => c.image_url);
          return (
            <section key={sec.id} className="relative overflow-hidden">
              <div className="container mx-auto px-4 py-6 md:py-10">
                {sideCards.length > 0 ? (
                  <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
                    <HeroSlider images={(sec.images ?? []).filter(Boolean)} fallback={sec.image_url || heroImg} aspectRatio={sec.aspect_ratio} />
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                      {sideCards.slice(0, 2).map((c, i) => {
                        const el = (
                          <img src={c.image_url} alt={`offer-${i + 1}`}
                            className="w-full h-full object-cover rounded-2xl border border-border hover:opacity-95 transition" />
                        );
                        return c.link
                          ? <a key={i} href={c.link} className="block min-h-0">{el}</a>
                          : <div key={i} className="min-h-0">{el}</div>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <HeroSlider images={(sec.images ?? []).filter(Boolean)} fallback={sec.image_url || heroImg} aspectRatio={sec.aspect_ratio} />
                  </div>
                )}
              </div>
            </section>
          );
        }
        if (sec.type === "category_tiles") {
          const tiles = (sec.items ?? []).filter((t) => t.image_url || t.label_bn);
          if (tiles.length === 0) return null;
          const cols = Math.max(3, Math.min(6, sec.columns || 5));
          const colMap: Record<number, string> = {
            3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6",
          };
          return (
            <section key={sec.id} className="py-4 md:py-6">
              <div className="container mx-auto px-4 space-y-4">
                {sec.title_bn && (
                  <h2 className="text-lg md:text-xl font-extrabold text-[var(--leaf-deep)]">{sec.title_bn}</h2>
                )}
                <div className={`grid grid-cols-2 ${colMap[cols]} gap-3 md:gap-4`}>
                  {tiles.map((t, i) => {
                    const el = (
                      <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
                        <div className="aspect-[4/3] w-full">
                          {t.image_url
                            ? <img src={t.image_url} alt={t.label_bn} className="w-full h-full object-cover" />
                            : <div className="w-full h-full grid place-items-center text-4xl" style={{ background: "var(--gradient-warm)" }}>🛒</div>}
                        </div>
                        {t.label_bn && (
                          <div className="absolute inset-x-3 bottom-3 rounded-full bg-[var(--mango,theme(colors.amber.400))] bg-amber-400 text-center text-[11px] md:text-sm font-bold py-1.5 text-[var(--leaf-deep)] shadow">
                            {t.label_bn}
                          </div>
                        )}
                      </div>
                    );
                    return t.link ? <a key={i} href={t.link}>{el}</a> : <div key={i}>{el}</div>;
                  })}
                </div>
              </div>
            </section>
          );
        }
        if (sec.type === "category") {
          return (
            <section key={sec.id} id="categories" className="py-10 md:py-14">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)] truncate">{sec.title_bn || "জনপ্রিয় ক্যাটাগরি"}</h2>
                    {sec.subtitle_bn && <p className="text-muted-foreground text-xs md:text-sm mt-0.5">{sec.subtitle_bn}</p>}
                  </div>
                  <Link to="/categories" className="shrink-0 text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
                    সব দেখুন <ChevronRight className="size-4" />
                  </Link>
                </div>
                <CategoryMarquee categories={categories} catCounts={catCounts} />
              </div>
            </section>
          );
        }
        if (sec.type === "offer") {
          return (
            <section key={sec.id} className="py-6 md:py-10">
              <div className="container mx-auto px-4">
                <div className="rounded-3xl p-6 md:p-10 relative overflow-hidden text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
                  <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative max-w-xl space-y-3 text-center mx-auto">
                    {sec.label_bn && <span className="inline-block text-xs font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full">{sec.label_bn}</span>}
                    <h3 className="text-2xl md:text-4xl font-extrabold leading-tight">{sec.title_bn}</h3>
                    <p className="text-primary-foreground/85 text-sm md:text-base">
                      {sec.subtitle_bn}
                      {sec.coupon_code && <> — <span className="font-bold tracking-wider">{sec.coupon_code}</span></>}
                      {sec.min_order_bn && <> · {sec.min_order_bn}</>}
                    </p>
                    {sec.cta_bn && <a href="#shop" className="inline-flex items-center gap-2 mt-2 h-11 px-6 rounded-full bg-white text-[var(--leaf-deep)] font-semibold mx-auto">{sec.cta_bn} <ChevronRight className="size-4" /></a>}
                  </div>
                </div>
              </div>
            </section>
          );
        }
        if (sec.type === "banner") {
          if (!sec.image_url) return null;
          const img = (
            <div className="rounded-3xl overflow-hidden relative">
              <img src={sec.image_url} alt={sec.caption_bn || "banner"} className="w-full h-auto object-cover" />
              {sec.caption_bn && (
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black/60 to-transparent text-white font-semibold">
                  {sec.caption_bn}
                </div>
              )}
            </div>
          );
          return (
            <section key={sec.id} className="py-6 md:py-10">
              <div className="container mx-auto px-4">
                {sec.link ? <a href={sec.link}>{img}</a> : img}
              </div>
            </section>
          );
        }
        if (sec.type === "banner_grid") {
          const items = (sec.items ?? []).filter((b) => b.image_url);
          if (items.length === 0) return null;
          const cols = Math.max(1, Math.min(4, sec.columns || 3));
          const colMap: Record<number, string> = {
            1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4",
          };
          return (
            <section key={sec.id} className="py-4 md:py-6">
              <div className="container mx-auto px-4 space-y-4">
                {sec.title_bn && (
                  <h2 className="text-lg md:text-xl font-extrabold text-[var(--leaf-deep)]">{sec.title_bn}</h2>
                )}
                <div className={`grid grid-cols-2 ${colMap[cols]} gap-3 md:gap-4`}>
                  {items.map((b, i) => {
                    const el = (
                      <img src={b.image_url} alt={`banner-${i + 1}`}
                        className="w-full h-full object-cover rounded-2xl border border-border hover:opacity-95 transition" />
                    );
                    return b.link
                      ? <a key={i} href={b.link} className="block">{el}</a>
                      : <div key={i}>{el}</div>;
                  })}
                </div>
              </div>
            </section>
          );
        }
        if (sec.type === "feature") {
          const items = (sec.items ?? []).filter((f) => f.title_bn || f.image_url);
          if (items.length === 0) return null;
          return (
            <section key={sec.id} className="py-4 md:py-8">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {items.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3 md:p-4">
                      {f.image_url ? (
                        <img src={f.image_url} alt={f.title_bn} className="size-10 md:size-12 object-contain shrink-0" />
                      ) : (
                        <div className="size-10 md:size-12 rounded-full grid place-items-center shrink-0" style={{ background: "var(--gradient-warm)" }}>
                          <ShieldCheck className="size-5 text-[var(--leaf-deep)]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs md:text-sm font-bold text-[var(--leaf-deep)] leading-tight">{f.title_bn}</div>
                        {f.subtitle_bn && <div className="text-[11px] md:text-xs text-muted-foreground leading-tight mt-0.5">{f.subtitle_bn}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }
        if (sec.type === "brand") {
          if (brands.length === 0) return null;
          return (
            <section key={sec.id} className="py-6 md:py-10">
              <div className="container mx-auto px-4 space-y-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)] truncate">{sec.title_bn || "জনপ্রিয় ব্র্যান্ড"}</h2>
                    {sec.subtitle_bn && <p className="text-muted-foreground text-xs md:text-sm mt-0.5">{sec.subtitle_bn}</p>}
                  </div>
                  {sec.show_all_link !== false && (
                    <Link to="/brands" className="shrink-0 text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
                      সব দেখুন <ChevronRight className="size-4" />
                    </Link>
                  )}
                </div>
                <BrandMarquee brands={brands} brandCounts={brandCounts} />
              </div>
            </section>
          );
        }
        if (sec.type === "deal") {
          return (
            <DealBlock
              key={sec.id}
              sec={sec}
              products={products}
              categories={categories}
              brands={brands}
              cart={cart}
              add={add}
              sub={sub}
              onBuyNow={(id) => openCheckout({ [id]: Math.max(cart[id] ?? 0, 1) })}
              cardSettings={settings?.product_card}
            />
          );
        }
        // product
        const items = (sec.category_id
          ? products.filter((p) => p.category_id === sec.category_id)
          : (() => {
              // mix across categories so same-cat items spread out
              const byCat: Record<string, typeof products> = {};
              for (const p of products) {
                const k = p.category_id ?? "__none";
                (byCat[k] ||= []).push(p);
              }
              const ks = Object.keys(byCat);
              const mixed: typeof products = [];
              let pos = 0, more = true;
              while (more) {
                more = false;
                for (const k of ks) {
                  if (pos < byCat[k].length) { mixed.push(byCat[k][pos]); more = true; }
                }
                pos++;
              }
              return mixed;
            })()
        ).slice(
          0,
          sec.display === "grid"
            ? Math.max(sec.limit, (sec.rows ?? 3) * (sec.columns ?? 5))
            : sec.limit,
        );
        if (items.length === 0) return null;
        return (
          <section key={sec.id} id="shop" className="py-6 md:py-10">
            <div className="container mx-auto px-4 space-y-4">
              {sec.banner_image_url && (
                sec.banner_link ? (
                  <a href={sec.banner_link} className="block rounded-2xl overflow-hidden">
                    <img src={sec.banner_image_url} alt={sec.title_bn} className="w-full object-cover" loading="lazy" />
                  </a>
                ) : (
                  <img src={sec.banner_image_url} alt={sec.title_bn} className="w-full rounded-2xl object-cover" loading="lazy" />
                )
              )}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)] truncate">{sec.title_bn}</h2>
                  {sec.subtitle_bn && <p className="text-muted-foreground text-xs md:text-sm mt-0.5">{sec.subtitle_bn}</p>}
                </div>
                <Link
                  to="/products"
                  search={(sec.category_id ? { cat: sec.category_id } : {}) as any}
                  className="shrink-0 text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  সব দেখুন <ChevronRight className="size-4" />
                </Link>
              </div>
              <ProductSlider
                products={items}
                categories={categories}
                brands={brands}
                cart={cart}
                add={add}
                sub={sub}
                onBuyNow={(id) => openCheckout({ [id]: Math.max(cart[id] ?? 0, 1) })}
                settings={settings?.product_card}
                display={sec.display ?? "slider"}
                rows={sec.rows ?? 3}
                columns={sec.columns ?? 5}
              />
            </div>
          </section>
        );
      })}

      {/* জনপ্রিয় ব্র্যান্ড (fallback — শুধু যদি অ্যাডমিনে ব্র্যান্ড সেকশন যোগ করা না থাকে) */}
      {!prodLoading && brands.length > 0 && !homeSections.some((s) => s.type === "brand") && (
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4 space-y-6">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">জনপ্রিয় ব্র্যান্ড</h2>
              <p className="text-muted-foreground text-sm mt-1">আপনার পছন্দের ব্র্যান্ড বেছে নিন</p>
            </div>
            <BrandMarquee brands={brands} brandCounts={brandCounts} />
            <div className="text-center">
              <Link to="/brands" className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-pop)] hover:opacity-95">
                সব ব্র্যান্ড <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* "সব পণ্য দেখুন" button removed per request */}

      {/* Footer */}
      <footer
        className="text-primary-foreground/90 pt-12 pb-20 md:pb-6 mt-8"
        style={{
          background: footer?.bg_color || "var(--leaf-deep)",
          color: footer?.text_color || undefined,
        }}
      >
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8 text-center ">
          {footer?.show_brand_column !== false && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center ">
              {brand?.logo_url ? (
                <img src={brand.logo_url} alt={brand.name_bn} className="size-10 rounded-2xl object-contain bg-white/10 p-1" />
              ) : (
                <div className="size-10 rounded-2xl grid place-items-center bg-white/10"><Leaf className="size-5" /></div>
              )}
              <span className="font-extrabold text-lg">{brand?.name_bn}</span>
            </div>
            <p className="text-sm text-primary-foreground/70">{footer?.about_bn}</p>
          </div>
          )}
          {footer?.show_categories_column !== false && (
          <div>
            <h4 className="font-bold mb-3">{footer?.categories_title_bn || "ক্যাটাগরি"}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/75">
              {categories.slice(0, 5).map((c) => <li key={c.id}>{c.name_bn}</li>)}
            </ul>
          </div>
          )}
          {footer?.show_contact_column !== false && (
          <div>
            <h4 className="font-bold mb-3">{footer?.contact_title_bn || "যোগাযোগ"}</h4>
            {footer?.phone && <p className="text-sm text-primary-foreground/75 flex items-center gap-2 justify-center "><Phone className="size-4" /> {footer.phone}</p>}
            {footer?.email && <p className="text-sm text-primary-foreground/75 mt-2">✉ {footer.email}</p>}
            {footer?.address_bn && <p className="text-sm text-primary-foreground/75 mt-2 flex items-center gap-2 justify-center "><MapPin className="size-4" /> {footer.address_bn}</p>}
          </div>
          )}
        </div>
        {footer?.show_copyright !== false && (
          <div className="container mx-auto px-4 mt-10 pt-6 border-t border-white/10 text-xs text-primary-foreground/60 text-center">
            {(footer?.copyright_bn || "© {year} {brand} — সর্বস্বত্ব সংরক্ষিত")
              .replace("{year}", String(new Date().getFullYear()))
              .replace("{brand}", brand?.name_bn ?? "")}
          </div>
        )}
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <aside className="absolute inset-x-3 bottom-3 top-auto max-h-[85vh] rounded-3xl overflow-hidden sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-96 sm:max-h-none sm:rounded-none bg-background flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-bold text-lg">আপনার কার্ট ({cartCount})</span>
              <button onClick={() => setCartOpen(false)}><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-3">
              {cartCount === 0 && <p className="text-center text-muted-foreground mt-10 text-sm">আপনার কার্ট খালি 🛒</p>}
              {Object.entries(cart).map(([id, q]) => {
                const p = products.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex gap-3 items-center bg-card border border-border rounded-2xl p-2">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name_bn} className="size-14 rounded-xl object-contain" style={{ background: "var(--gradient-warm)" }} />
                    ) : (
                      <div className="size-14 rounded-xl grid place-items-center text-2xl" style={{ background: "var(--gradient-warm)" }}>🛒</div>
                    )}
                    <div className="flex-1 text-sm">
                      <div className="font-semibold leading-tight">{p.name_bn}</div>
                      <div className="text-xs text-muted-foreground">৳{p.price} × {q}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-secondary rounded-lg">
                      <button onClick={() => sub(id)} className="size-7 grid place-items-center"><Minus className="size-3.5" /></button>
                      <span className="text-sm font-bold w-5 text-center">{q}</span>
                      <button onClick={() => add(id)} className="size-7 grid place-items-center"><Plus className="size-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {cartCount > 0 && (
              <div className="p-4 pb-20 md:pb-4 border-t border-border space-y-3 bg-background">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">মোট</span>
                  <span className="font-extrabold text-lg">৳{cartTotal}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); openCheckout(cart); }}
                  className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-pop)]"
                >
                  চেকআউট করুন
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !placing && setCheckoutOpen(false)} />
          <div className="relative bg-background rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            {orderDone ? (
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto size-16 rounded-full grid place-items-center" style={{ background: "var(--gradient-hero)" }}>
                  <CheckCircle2 className="size-9 text-white" />
                </div>
                <h3 className="text-2xl font-extrabold text-[var(--leaf-deep)]">ধন্যবাদ! 🎉</h3>
                <p className="text-sm text-muted-foreground">আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                <button onClick={() => setCheckoutOpen(false)} className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold">বন্ধ করুন</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <span className="font-bold text-lg">চেকআউট</span>
                  <button onClick={() => !placing && setCheckoutOpen(false)}><X /></button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-secondary/50 rounded-2xl p-3 space-y-3">
                    {Object.entries(checkoutItems).map(([id, q]) => {
                      const p = products.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} className="flex gap-3 items-center bg-card border border-border rounded-2xl p-2">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name_bn} className="size-14 rounded-xl object-contain shrink-0" style={{ background: "var(--gradient-warm)" }} />
                          ) : (
                            <div className="size-14 rounded-xl grid place-items-center text-2xl shrink-0" style={{ background: "var(--gradient-warm)" }}>🛒</div>
                          )}
                          <div className="flex-1 min-w-0 text-sm">
                            <div className="font-semibold leading-tight truncate">{p.name_bn}</div>
                            <div className="text-xs text-muted-foreground">৳{p.price} · ৳{p.price * q}</div>
                          </div>
                          <div className="flex items-center gap-1 bg-secondary rounded-lg shrink-0">
                            <button
                              onClick={() =>
                                setCheckoutItems((prev) => {
                                  const next = { ...prev };
                                  const nq = (next[id] ?? 0) - 1;
                                  if (nq <= 0) delete next[id];
                                  else next[id] = nq;
                                  return next;
                                })
                              }
                              className="size-7 grid place-items-center"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="text-sm font-bold w-5 text-center">{q}</span>
                            <button
                              onClick={() => setCheckoutItems((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))}
                              className="size-7 grid place-items-center"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-2 border-t border-border text-sm">
                      <span className="text-muted-foreground">সাবটোটাল</span>
                      <span className="font-semibold">৳{checkoutTotal}</span>
                    </div>
                    {deliveryOptions.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ডেলিভারি{deliveryLabel ? ` (${deliveryLabel})` : ""}</span>
                        <span className="font-semibold">৳{deliveryCharge}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border font-bold">
                      <span>মোট</span>
                      <span className="text-[var(--leaf-deep)]">৳{grandTotal}</span>
                    </div>
                  </div>
                  {deliveryOptions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">ডেলিভারি এলাকা</label>
                      <div className="space-y-2">
                        {deliveryOptions.map((o, i) => (
                          <label key={i} className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition ${deliveryIdx === i ? "border-primary bg-primary/5" : "border-border bg-secondary/40"}`}>
                            <input type="radio" name="delivery" checked={deliveryIdx === i} onChange={() => setDeliveryIdx(i)} className="size-4 accent-primary" />
                            <span className="flex-1 text-sm font-semibold">{o.label_bn}</span>
                            <span className="text-sm font-bold text-[var(--leaf-deep)]">৳{o.charge}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">নাম</label>
                    <input
                      value={orderForm.name}
                      onChange={(e) => setOrderForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="আপনার নাম"
                      className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">ফোন নম্বর</label>
                    <input
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="01XXXXXXXXX"
                      type="tel"
                      className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">ঠিকানা</label>
                    <textarea
                      value={orderForm.address}
                      onChange={(e) => setOrderForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="পূর্ণ ঠিকানা লিখুন"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-3">
                    <div className="size-5 rounded-full bg-primary grid place-items-center">
                      <div className="size-2 rounded-full bg-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">ক্যাশ অন ডেলিভারি</div>
                      <div className="text-[11px] text-muted-foreground">পণ্য পেয়ে টাকা পরিশোধ করুন</div>
                    </div>
                  </div>
                  {orderError && <p className="text-sm text-[var(--chili)]">{orderError}</p>}
                  <button
                    onClick={placeOrder}
                    disabled={placing || Object.keys(checkoutItems).length === 0}
                    className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold shadow-[var(--shadow-pop)] inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {placing ? <><Loader2 className="size-4 animate-spin" /> অর্ডার হচ্ছে...</> : `অর্ডার নিশ্চিত করুন · ৳${grandTotal}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-1">
        <div className="flex items-center justify-around py-2">
          <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
            <Home className="size-5" />
            <span className="text-[10px] font-medium">হোম</span>
          </button>
          <Link to="/categories" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
            <LayoutGrid className="size-5" />
            <span className="text-[10px] font-medium">ক্যাটাগরি</span>
          </Link>
          <Link to="/products" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
            <Package className="size-5" />
            <span className="text-[10px] font-medium">পণ্য</span>
          </Link>
          <button onClick={() => setCartOpen(true)} className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px] relative">
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-0.5 size-4 rounded-full bg-[var(--chili)] text-white text-[9px] grid place-items-center font-bold">{cartCount}</span>
            )}
            <span className="text-[10px] font-medium">কার্ট</span>
          </button>
        </div>
      </nav>
    </div>
  );
}