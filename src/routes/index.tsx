import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ShoppingCart, MapPin, Phone, X, Plus, Minus,
  Truck, ShieldCheck, Clock, Leaf, Star, ChevronRight, Heart, Loader2,
  Home, LayoutGrid, CheckCircle2,
} from "lucide-react";
import heroImg from "@/assets/hero-grocery.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const Route = createFileRoute("/")({
  component: Index,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck, shield: ShieldCheck, clock: Clock, leaf: Leaf, star: Star,
};

type DBProduct = {
  id: string; name_bn: string; unit: string; price: number; old_price: number | null;
  image_url: string | null; tag: string | null; stock: number; is_active: boolean;
  category_id: string | null;
};
type DBCategory = { id: string; name_bn: string; slug: string; emoji: string; sort_order: number; image_url: string | null };

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
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<Record<string, number>>({});
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "" });
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
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
  };

  const checkoutTotal = useMemo(
    () => Object.entries(checkoutItems).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [checkoutItems, products],
  );

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
        total: checkoutTotal,
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
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () => Object.entries(cart).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [cart, products],
  );

  const filtered = products.filter((p) => {
    const matchesCat = activeCat === "all" || p.category_id === activeCat;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || p.name_bn.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });
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

      {/* Desktop Header */}
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
          <div className="space-y-6 order-2 md:order-1">
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
              <a href="#shop" className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-pop)] hover:opacity-95">
                {hero?.cta_primary_bn} <ChevronRight className="size-4" />
              </a>
              <a href="#categories" className="h-12 px-6 rounded-full bg-secondary text-secondary-foreground font-semibold inline-flex items-center hover:bg-secondary/80">
                {hero?.cta_secondary_bn}
              </a>
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

          <div className="relative order-1 md:order-2">
            <div className="absolute -inset-6 rounded-[3rem] blur-3xl opacity-40" style={{ background: "var(--gradient-hero)" }} />
            <div className="relative rounded-[2rem] overflow-hidden shadow-[var(--shadow-pop)] border border-border">
              <img src={hero?.image_url || heroImg} alt="hero" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">জনপ্রিয় ক্যাটাগরি</h2>
              <p className="text-muted-foreground text-sm mt-1">যেটি দরকার, এক ক্লিকেই খুঁজে নিন</p>
            </div>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)}
                className={`group flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl bg-card border transition ${activeCat === c.id ? "border-primary shadow-[var(--shadow-soft)]" : "border-border hover:border-primary"}`}>
                <div className="size-12 md:size-16 rounded-2xl grid place-items-center text-2xl md:text-3xl group-hover:scale-110 transition overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
                  {c.image_url ? <img src={c.image_url} alt={c.name_bn} className="size-full object-cover" /> : c.emoji}
                </div>
                <div className="text-[11px] md:text-sm font-semibold text-center leading-tight">{c.name_bn}</div>
                <div className="text-[10px] text-muted-foreground">{catCounts[c.id] ?? 0} আইটেম</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Offer banner */}
      {offer?.enabled && (
        <section id="offer" className="py-6 md:py-10">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl p-6 md:p-10 relative overflow-hidden text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
              <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
              <div className="relative max-w-xl space-y-3">
                <span className="inline-block text-xs font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full">{offer.label_bn}</span>
                <h3 className="text-2xl md:text-4xl font-extrabold leading-tight">{offer.title_bn}</h3>
                <p className="text-primary-foreground/85 text-sm md:text-base">{offer.subtitle_bn} — <span className="font-bold tracking-wider">{offer.coupon_code}</span> · {offer.min_order_bn}</p>
                <a href="#shop" className="inline-flex items-center gap-2 mt-2 h-11 px-6 rounded-full bg-white text-[var(--leaf-deep)] font-semibold">{offer.cta_bn} <ChevronRight className="size-4" /></a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Products */}
      <section id="shop" className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">আজকের তাজা পণ্য</h2>
              <p className="text-muted-foreground text-sm mt-1">সরাসরি কৃষক থেকে সংগ্রহ করা</p>
            </div>
            <div className="hidden md:flex gap-2 flex-wrap">
              <button onClick={() => setActiveCat("all")} className={`px-4 py-2 rounded-full text-sm font-medium border transition ${activeCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}>সব</button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-4 py-2 rounded-full text-sm font-medium border transition ${activeCat === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}>
                  {c.name_bn}
                </button>
              ))}
            </div>
          </div>

          {prodLoading ? (
            <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">এখনো কোনো পণ্য নেই। অ্যাডমিন প্যানেল থেকে পণ্য যোগ করুন।</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {filtered.map((p) => {
                const qty = cart[p.id] ?? 0;
                const catName = categories.find((c) => c.id === p.category_id)?.name_bn ?? "";
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
                    <div className="p-3 md:p-4 space-y-2">
                      <div className="text-[11px] text-muted-foreground">{catName} · {p.unit}</div>
                      <h3 className="font-semibold text-sm md:text-base leading-tight line-clamp-2 min-h-[2.5rem]">{p.name_bn}</h3>
                      <div className="flex items-end justify-between pt-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg md:text-xl font-extrabold text-[var(--leaf-deep)]">৳{p.price}</span>
                          {p.old_price && <span className="text-xs text-muted-foreground line-through">৳{p.old_price}</span>}
                        </div>
                        {qty === 0 ? (
                          <button onClick={() => add(p.id)} className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center hover:opacity-90 shadow-[var(--shadow-soft)]" aria-label="Add">
                            <Plus className="size-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-primary rounded-xl text-primary-foreground">
                            <button onClick={() => sub(p.id)} className="size-9 grid place-items-center"><Minus className="size-4" /></button>
                            <span className="text-sm font-bold w-5 text-center">{qty}</span>
                            <button onClick={() => add(p.id)} className="size-9 grid place-items-center"><Plus className="size-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--leaf-deep)] text-primary-foreground/90 pt-12 pb-20 md:pb-6 mt-8">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
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
              {categories.slice(0, 5).map((c) => <li key={c.id}>{c.emoji} {c.name_bn}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3">যোগাযোগ</h4>
            {footer?.phone && <p className="text-sm text-primary-foreground/75 flex items-center gap-2"><Phone className="size-4" /> {footer.phone}</p>}
            {footer?.email && <p className="text-sm text-primary-foreground/75 mt-2">✉ {footer.email}</p>}
            {footer?.address_bn && <p className="text-sm text-primary-foreground/75 mt-2 flex items-center gap-2"><MapPin className="size-4" /> {footer.address_bn}</p>}
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
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-background flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-bold text-lg">আপনার কার্ট ({cartCount})</span>
              <button onClick={() => setCartOpen(false)}><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">মোট</span>
                  <span className="font-extrabold text-lg">৳{cartTotal}</span>
                </div>
                <button className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-pop)]">চেকআউট করুন</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-1">
        <div className="flex items-center justify-around py-2">
          <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setActiveCat("all"); }} className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
            <Home className="size-5" />
            <span className="text-[10px] font-medium">হোম</span>
          </button>
          <button onClick={() => { setSearchOpen((s) => !s); window.scrollTo({ top: 1, behavior: "smooth" }); }} className={`flex flex-col items-center gap-0.5 p-2 hover:text-primary transition min-w-[64px] ${searchOpen ? "text-primary" : "text-muted-foreground"}`}>
            <Search className="size-5" />
            <span className="text-[10px] font-medium">সার্চ</span>
          </button>
          <button onClick={() => { const el = document.getElementById("categories"); if (el) el.scrollIntoView({ behavior: "smooth" }); }} className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
            <LayoutGrid className="size-5" />
            <span className="text-[10px] font-medium">ক্যাটাগরি</span>
          </button>
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