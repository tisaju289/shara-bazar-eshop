import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ShoppingCart, MapPin, Phone, X, Plus, Minus, ChevronLeft,
  Truck, ShieldCheck, Clock, Leaf, Star, ChevronRight, Heart, Loader2,
  Home, LayoutGrid, Package, CheckCircle2,
} from "lucide-react";
import heroImg from "@/assets/hero-grocery.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SiteHeader } from "@/components/SiteHeader";
import { trackEvent } from "@/lib/tracking";

export const Route = createFileRoute("/")({
  component: Index,
});

function HeroSlider({ images, fallback }: { images: string[]; fallback: string }) {
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
      <div className="relative aspect-[4/3] md:aspect-[5/4]">
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

type DBProduct = {
  id: string; name_bn: string; unit: string; price: number; old_price: number | null;
  image_url: string | null; tag: string | null; stock: number; is_active: boolean;
  category_id: string | null;
};
type DBCategory = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null };

function useCategories() {
  return useQuery({
    queryKey: ["categories", "public"],
    queryFn: async (): Promise<DBCategory[]> => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}
function useProducts() {
  return useQuery({
    queryKey: ["products", "public"],
    queryFn: async (): Promise<DBProduct[]> => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function Index() {
  const { data: settings } = useSiteSettings();
  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading: prodLoading } = useProducts();

  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
      value: checkoutTotal,
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

  const brand = settings?.brand;
  const topbar = settings?.topbar;
  const hero = settings?.hero;
  const offer = settings?.offer;
  const features = settings?.features ?? [];
  const footer = settings?.footer;
  const sections = settings?.sections;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top utility bar */}
      {topbar?.enabled && (
        <div className="hidden md:block bg-[var(--leaf-deep)] text-primary-foreground/90 text-xs">
          <div className="container mx-auto px-4 flex justify-between py-2">
            <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {topbar.location_bn}</span>
            <span className="flex items-center gap-4">
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

          <div className="flex-1 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="খুঁজুন: ইলিশ, আম, মিনিকেট চাল..."
                className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border border-transparent focus:border-primary outline-none transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

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
        <SiteHeader />
      </div>

      {/* Mobile search bar (toggleable) */}
      {searchOpen && (
        <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
        </div>
      )}




      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="space-y-6 hidden md:block">
            {hero?.badge_bn && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--cream)] text-[var(--leaf-deep)] text-xs font-semibold border border-border">
                <Leaf className="size-3.5" /> {hero.badge_bn}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] text-[var(--leaf-deep)]">
              {hero?.title_bn} <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
                {hero?.title_highlight_bn}
              </span>{" "}
              {hero?.title_suffix_bn}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-lg">{hero?.subtitle_bn}</p>
            <div className="flex flex-wrap gap-3">
              {hero?.cta_primary_enabled !== false && (
                <a href="#shop" className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-pop)] hover:opacity-95">
                  {hero?.cta_primary_bn} <ChevronRight className="size-4" />
                </a>
              )}
              {hero?.cta_secondary_enabled !== false && (
                <a href="#categories" className="h-12 px-6 rounded-full bg-secondary text-secondary-foreground font-semibold inline-flex items-center hover:bg-secondary/80">
                  {hero?.cta_secondary_bn}
                </a>
              )}
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-6 pt-4 text-sm">
                {features.map((f, i) => {
                  const Icon = ICONS[f.icon] ?? Leaf;
                  return <div key={i} className="flex items-center gap-2"><Icon className="size-5 text-primary" /> {f.text_bn}</div>;
                })}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] blur-3xl opacity-40" style={{ background: "var(--gradient-hero)" }} />
            <HeroSlider images={(hero?.images ?? []).filter(Boolean)} fallback={hero?.image_url || heroImg} />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center mb-6 gap-2 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">{sections?.categories_title_bn || "জনপ্রিয় ক্যাটাগরি"}</h2>
            <p className="text-muted-foreground text-sm">{sections?.categories_subtitle_bn || "যেটি দরকার, এক ক্লিকেই খুঁজে নিন"}</p>
          </div>
          <div className="grid grid-cols-4 md:flex md:flex-wrap md:justify-center gap-2 md:gap-4">
            {categories.slice(0, 8).map((c, i) => (
              <Link key={c.id} to="/products"
                search={{ cat: c.id }}
                className={`group flex flex-col items-center gap-2 p-2 md:p-4 rounded-2xl bg-card border border-border hover:border-primary transition w-full md:w-[calc(12.5%-0.875rem)] md:min-w-[80px] ${i >= 4 ? "hidden md:flex" : ""}`}>
                <div className="size-11 md:size-16 rounded-2xl grid place-items-center text-2xl md:text-3xl group-hover:scale-110 transition overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
                  {c.image_url ? <img src={c.image_url} alt={c.name_bn} className="size-full object-cover" /> : "🛒"}
                </div>
                <div className="text-[11px] md:text-sm font-semibold text-center leading-tight">{c.name_bn}</div>
                <div className="text-[10px] text-muted-foreground">{catCounts[c.id] ?? 0} আইটেম</div>
              </Link>
            ))}
          </div>
          <div className="flex justify-center mt-6">
            <Link to="/categories" className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
              সব দেখুন <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Offer banner */}
      {offer?.enabled && (
        <section id="offer" className="py-6 md:py-10">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl p-6 md:p-10 relative overflow-hidden text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
              <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
              <div className="relative max-w-xl space-y-3 text-center  mx-auto ">
                <span className="inline-block text-xs font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full">{offer.label_bn}</span>
                <h3 className="text-2xl md:text-4xl font-extrabold leading-tight">{offer.title_bn}</h3>
                <p className="text-primary-foreground/85 text-sm md:text-base">{offer.subtitle_bn} — <span className="font-bold tracking-wider">{offer.coupon_code}</span> · {offer.min_order_bn}</p>
                <a href="#shop" className="inline-flex items-center gap-2 mt-2 h-11 px-6 rounded-full bg-white text-[var(--leaf-deep)] font-semibold mx-auto ">{offer.cta_bn} <ChevronRight className="size-4" /></a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Products grouped by category */}
      <section id="shop" className="py-10 md:py-14">
        <div className="container mx-auto px-4 space-y-10">
          <div className="flex flex-col items-center mb-2">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">{sections?.products_title_bn || "আজকের তাজা পণ্য"}</h2>
              <p className="text-muted-foreground text-sm mt-1">{sections?.products_subtitle_bn || "সরাসরি কৃষক থেকে সংগ্রহ করা"}</p>
            </div>
          </div>

          {prodLoading ? (
            <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">এখনো কোনো পণ্য নেই। অ্যাডমিন প্যানেল থেকে পণ্য যোগ করুন।</p>
          ) : (
            <>
              {(() => {
                // Interleave products by category so same-category items are spread apart
                const byCat: Record<string, typeof products> = {};
                for (const p of products) {
                  const cat = p.category_id ?? "__none";
                  if (!byCat[cat]) byCat[cat] = [];
                  byCat[cat].push(p);
                }
                const catIds = Object.keys(byCat);
                const mixed: typeof products = [];
                let pos = 1;
                let hasMore = true;
                while (hasMore) {
                  hasMore = false;
                  for (const cat of catIds) {
                    const idx = pos - 1;
                    if (idx < byCat[cat].length) {
                      mixed.push(byCat[cat][idx]);
                      hasMore = true;
                    }
                  }
                  pos++;
                }
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                    {mixed.map((p) => {
                      const qty = cart[p.id] ?? 0;
                      return (
                        <article key={p.id} className="group rounded-3xl bg-card border border-border overflow-hidden hover:shadow-[var(--shadow-pop)] hover:-translate-y-1 transition-all duration-300">
                          <div className="relative aspect-square overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name_bn} loading="lazy" className="w-full h-full object-contain p-3 group-hover:scale-110 transition duration-500" />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-5xl">🛒</div>
                            )}
                            {p.tag && (
                              <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wide uppercase bg-[var(--chili)] text-white px-2 py-1 rounded-full">{p.tag}</span>
                            )}
                            <button className="absolute top-3 right-3 size-8 rounded-full bg-background/80 grid place-items-center backdrop-blur hover:text-[var(--chili)]" aria-label="Wishlist">
                              <Heart className="size-4" />
                            </button>
                          </div>
                          <div className="p-3 md:p-4 space-y-2 text-center">
                            <h3 className="font-semibold text-sm md:text-base leading-tight line-clamp-2 min-h-[2.5rem]">{p.name_bn}</h3>
                            <div className="flex items-baseline justify-center gap-1.5 pt-1">
                              <span className="text-lg md:text-xl font-extrabold text-[var(--leaf-deep)]">৳{p.price}</span>
                              {p.old_price && <span className="text-xs text-muted-foreground line-through">৳{p.old_price}</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {qty === 0 ? (
                                <button onClick={() => add(p.id)} className="h-9 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1 hover:bg-secondary/80">
                                  <Plus className="size-3.5" /> কার্ট
                                </button>
                              ) : (
                                <div className="flex items-center justify-between bg-secondary rounded-xl text-secondary-foreground h-9 px-1">
                                  <button onClick={() => sub(p.id)} className="size-7 grid place-items-center"><Minus className="size-3.5" /></button>
                                  <span className="text-xs font-bold">{qty}</span>
                                  <button onClick={() => add(p.id)} className="size-7 grid place-items-center"><Plus className="size-3.5" /></button>
                                </div>
                              )}
                              <button
                                onClick={() => openCheckout({ [p.id]: Math.max(qty, 1) })}
                                className="h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center hover:opacity-90 shadow-[var(--shadow-soft)]"
                              >
                                এখনই কিনুন
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              })()}

              {/* All products CTA */}
              <div className="text-center pt-6">
                <Link to="/products" className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-pop)] hover:opacity-95">
                  সব পণ্য দেখুন <ChevronRight className="size-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--leaf-deep)] text-primary-foreground/90 pt-12 pb-20 md:pb-6 mt-8">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8 text-center ">
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
          <div>
            <h4 className="font-bold mb-3">ক্যাটাগরি</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/75">
              {categories.slice(0, 5).map((c) => <li key={c.id}>{c.name_bn}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3">যোগাযোগ</h4>
            {footer?.phone && <p className="text-sm text-primary-foreground/75 flex items-center gap-2 justify-center "><Phone className="size-4" /> {footer.phone}</p>}
            {footer?.email && <p className="text-sm text-primary-foreground/75 mt-2">✉ {footer.email}</p>}
            {footer?.address_bn && <p className="text-sm text-primary-foreground/75 mt-2 flex items-center gap-2 justify-center "><MapPin className="size-4" /> {footer.address_bn}</p>}
          </div>
        </div>
        <div className="container mx-auto px-4 mt-10 pt-6 border-t border-white/10 text-xs text-primary-foreground/60 text-center">
          © {new Date().getFullYear()} {brand?.name_bn} — সর্বস্বত্ব সংরক্ষিত
        </div>
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <aside className="absolute right-0 top-1 bottom-0 w-full sm:w-96 bg-background flex flex-col shadow-2xl">
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