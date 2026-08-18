import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ProductCard } from "@/components/ProductCard";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCart } from "@/hooks/useCart";
import { openCartDrawer } from "@/hooks/useCartDrawer";
import { trackEvent } from "@/lib/tracking";
import { SlidersHorizontal, ChevronRight, Home, Layers, X } from "lucide-react";

export const Route = createFileRoute("/subcat/$subcatId")({
  head: () => ({ meta: [{ title: "পণ্য — তাজা বাজার" }] }),
  component: SubcategoryProductPage,
});

type DBProduct = {
  id: string; name_bn: string; unit: string; price: number; old_price: number | null;
  image_url: string | null; tag: string | null; stock: number; is_active: boolean;
  category_id: string | null; brand_id: string | null; subcategory_id: string | null;
  reviews_rating: number | null; reviews_count: number | null; offer_badge: string | null;
};
type DBBrand = { id: string; name_bn: string };
type SubCat = { id: string; name_bn: string; slug: string; image_url: string | null; category_id: string | null; sort_order: number };
type DBCategory = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null };

function SubcategoryProductPage() {
  const { subcatId } = Route.useParams();
  const { data: settings } = useSiteSettings();

  const { data: currentSubcat } = useQuery({
    queryKey: ["subcategory", subcatId],
    queryFn: async (): Promise<SubCat | null> => {
      const { data } = await supabase
        .from("subcategories")
        .select("id,name_bn,slug,image_url,category_id,sort_order")
        .eq("id", subcatId)
        .single();
      return (data as SubCat) ?? null;
    },
    enabled: !!subcatId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: async (): Promise<DBCategory[]> => {
      const { data, error } = await supabase.from("categories").select("id,name_bn,slug,sort_order,image_url").order("sort_order");
      if (error) throw error;
      return (data as DBCategory[]) ?? [];
    },
  });

  const { data: allCatProducts = [] } = useQuery({
    queryKey: ["products", "public", "cat-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,category_id").eq("is_active", true).range(0, 9999);
      return (data as { id: string; category_id: string | null }[]) ?? [];
    },
  });

  const parentCategory = categories.find((c) => c.id === currentSubcat?.category_id) ?? null;

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", "public"],
    queryFn: async (): Promise<DBBrand[]> => {
      const { data } = await supabase.from("brands").select("id,name_bn").order("sort_order");
      return (data as DBBrand[]) ?? [];
    },
  });

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["products", "subcat", subcatId],
    queryFn: async (): Promise<DBProduct[]> => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("subcategory_id", subcatId)
        .order("created_at", { ascending: false });
      return (data as DBProduct[]) ?? [];
    },
    enabled: !!subcatId,
  });

  const [cart, setCart] = useCart();
  const add = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    const p = allProducts.find((x) => x.id === id);
    if (p) {
      trackEvent("AddToCart", {
        value: p.price, currency: "BDT", content_ids: [id],
        content_name: p.name_bn, content_type: "product",
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

  const prices = allProducts.map((p) => p.price);
  const minPossible = prices.length ? Math.min(...prices) : 0;
  const maxPossible = prices.length ? Math.max(...prices) : 5000;

  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      if (minPrice !== "" && p.price < (minPrice as number)) return false;
      if (maxPrice !== "" && p.price > (maxPrice as number)) return false;
      return true;
    });
  }, [allProducts, minPrice, maxPrice]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () => Object.entries(cart).reduce((sum, [id, q]) => sum + (allProducts.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [cart, allProducts],
  );

  const hasFilter = minPrice !== "" || maxPrice !== "";

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of allCatProducts) if (p.category_id) m[p.category_id] = (m[p.category_id] ?? 0) + 1;
    return m;
  }, [allCatProducts]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader cartCount={cartCount} cartTotal={cartTotal} onCartClick={openCartDrawer} />

      <div className="container mx-auto px-4 py-4 pb-28 md:pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
          <Link to="/" className="hover:text-primary transition"><Home className="size-3.5" /></Link>
          <ChevronRight className="size-3.5" />
          <Link to="/categories" className="hover:text-primary transition">ক্যাটাগরি</Link>
          {parentCategory && currentSubcat?.category_id && (
            <>
              <ChevronRight className="size-3.5" />
              <Link to="/cat/$catId" params={{ catId: currentSubcat.category_id }} className="hover:text-primary transition">
                {parentCategory.name_bn}
              </Link>
            </>
          )}
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-semibold">{currentSubcat?.name_bn ?? "..."}</span>
        </nav>

        {/* Header card */}
        {currentSubcat && (
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-card border border-border">
            <div className="size-16 md:size-20 rounded-2xl overflow-hidden shrink-0 grid place-items-center"
              style={{ background: "var(--gradient-warm)" }}>
              {currentSubcat.image_url ? (
                <img src={currentSubcat.image_url} alt={currentSubcat.name_bn} className="size-full object-cover" />
              ) : (
                <Layers className="size-7 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)]">{currentSubcat.name_bn}</h1>
              {parentCategory && (
                <Link to="/cat/$catId" params={{ catId: currentSubcat.category_id! }}
                  className="text-xs text-muted-foreground hover:text-primary transition mt-0.5 block">
                  {parentCategory.name_bn}
                </Link>
              )}
              <p className="text-sm text-muted-foreground mt-0.5">{allProducts.length} টি পণ্য পাওয়া গেছে</p>
            </div>
          </div>
        )}

        {/* Mobile: filter toggle bar */}
        <div className="md:hidden flex items-center gap-3 mb-4">
          <button onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold">
            <SlidersHorizontal className="size-4" />ফিল্টার
            {hasFilter && <span className="size-2 rounded-full bg-primary inline-block" />}
          </button>
          {hasFilter && (
            <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-secondary text-xs text-muted-foreground">
              <X className="size-3.5" /> রিসেট
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} টি পণ্য</span>
        </div>

        {/* Mobile: filter panel (full width, above products) */}
        {filterOpen && allProducts.length > 0 && (
          <div className="md:hidden bg-card border border-border rounded-2xl p-4 space-y-3 mb-4">
            <h3 className="font-bold text-sm">মূল্য পরিসীমা</h3>
            <div className="flex items-center gap-2">
              <input type="number" placeholder={`৳${minPossible}`} value={minPrice}
                onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-0 flex-1 h-9 px-3 rounded-lg bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary" />
              <span className="text-muted-foreground text-xs shrink-0">—</span>
              <input type="number" placeholder={`৳${maxPossible}`} value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-0 flex-1 h-9 px-3 rounded-lg bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            {hasFilter && (
              <button onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="text-xs text-primary hover:underline">রিসেট</button>
            )}
          </div>
        )}

        {/* Desktop: sidebar + products side by side */}
        <div className="flex gap-6 items-start">
          <aside className="hidden md:block w-60 shrink-0 space-y-4">
            {allProducts.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm">মূল্য পরিসীমা</h3>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder={`৳${minPossible}`} value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-0 flex-1 h-9 px-3 rounded-lg bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary" />
                  <span className="text-muted-foreground text-xs shrink-0">—</span>
                  <input type="number" placeholder={`৳${maxPossible}`} value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-0 flex-1 h-9 px-3 rounded-lg bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {hasFilter && (
                  <button onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="text-xs text-primary hover:underline">রিসেট</button>
                )}
              </div>
            )}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-bold text-sm mb-3">সব ক্যাটাগরি</h3>
              <div className="space-y-1">
                {categories.map((c) => (
                  <Link key={c.id} to="/cat/$catId" params={{ catId: c.id }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition flex items-center justify-between ${c.id === currentSubcat?.category_id ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"}`}>
                    <span className="truncate">{c.name_bn}</span>
                    <span className={`text-xs shrink-0 ml-1 ${c.id === currentSubcat?.category_id ? "opacity-80" : "opacity-60"}`}>{catCounts[c.id] ?? 0}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-3xl bg-card border border-border aspect-[3/4] animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-24">
                <Layers className="size-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {allProducts.length === 0
                    ? "এই সাব-ক্যাটাগরিতে এখনো কোন পণ্য যোগ করা হয়নি"
                    : "এই ফিল্টারে কোন পণ্য পাওয়া যায়নি"}
                </p>
                {hasFilter && (
                  <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                    className="mt-3 text-xs text-primary hover:underline">ফিল্টার সরান</button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden md:flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">{filtered.length} টি পণ্য</p>
                  {hasFilter && (
                    <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <X className="size-3" /> ফিল্টার সরান
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {filtered.map((p) => (
                    <ProductCard key={p.id} product={p}
                      categoryName={currentSubcat?.name_bn ?? ""}
                      brandName={brands.find((b) => b.id === p.brand_id)?.name_bn ?? ""}
                      qty={cart[p.id] ?? 0} add={add} sub={sub}
                      onBuyNow={() => { add(p.id); openCartDrawer(); }}
                      settings={settings?.product_card} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
