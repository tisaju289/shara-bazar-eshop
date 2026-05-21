import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, Plus, Minus, Loader2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "সব পণ্য — তাজা বাজার" },
      { name: "description", content: "সব ক্যাটাগরির সব পণ্য এক জায়গায় দেখুন।" },
    ],
  }),
  component: ProductsPage,
});

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

function ProductsPage() {
  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading: prodLoading } = useProducts();

  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = products.filter((p) => {
    const matchesCat = activeCat === "all" || p.category_id === activeCat;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || p.name_bn.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const grouped = useMemo(() => {
    const m: Record<string, DBProduct[]> = {};
    for (const p of filtered) {
      const cid = p.category_id ?? "uncategorized";
      if (!m[cid]) m[cid] = [];
      m[cid].push(p);
    }
    return m;
  }, [filtered]);

  const catOrder = useMemo(() => {
    const ordered = categories.map((c) => c.id);
    if (grouped["uncategorized"]) ordered.push("uncategorized");
    return ordered.filter((id) => grouped[id] && grouped[id].length > 1);
  }, [categories, grouped]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="hidden md:block sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="size-9 rounded-full grid place-items-center bg-secondary hover:bg-secondary/80 shrink-0">
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-lg md:text-xl font-extrabold text-[var(--leaf-deep)]">সব পণ্য</h1>
        </div>
      </header>

      <section className="py-6 md:py-10">
        <div className="container mx-auto px-4 space-y-6">
          {/* Search */}
          <div className="max-w-xl mx-auto md:mx-1">
            <div className="relative">
              <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="পণ্য খুঁজুন..."
                className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border border-transparent focus:border-primary outline-none transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCat("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${activeCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
            >
              সব
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${activeCat === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}
              >
                {c.name_bn}
              </button>
            ))}
          </div>

          {prodLoading ? (
            <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">কোনো পণ্য পাওয়া যায়নি।</p>
          ) : (
            <div className="space-y-10">
              {activeCat === "all" ? (
                catOrder.map((catId) => {
                  const cat = categories.find((c) => c.id === catId);
                  const items = grouped[catId] ?? [];
                  return (
                    <div key={catId}>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)]">{cat?.name_bn ?? "অন্যান্য"}</h2>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                        {items.map((p) => (
                          <ProductCard key={p.id} product={p} categoryName={cat?.name_bn ?? ""} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                  {filtered.map((p) => {
                    const catName = categories.find((c) => c.id === p.category_id)?.name_bn ?? "";
                    return <ProductCard key={p.id} product={p} categoryName={catName} />;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product: p, categoryName }: { product: DBProduct; categoryName: string }) {
  const [qty, setQty] = useState(1);
  return (
    <article className="group rounded-3xl bg-card border border-border overflow-hidden hover:shadow-[var(--shadow-pop)] hover:-translate-y-1 transition-all duration-300">
      <div className="relative aspect-square overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
        {p.image_url ? (
          <img src={p.image_url} alt={p.name_bn} loading="lazy" className="w-full h-full object-contain p-3 group-hover:scale-110 transition duration-500" />
        ) : (
          <div className="w-full h-full grid place-items-center text-5xl">🛒</div>
        )}
        {p.tag && (
          <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wide uppercase bg-[var(--chili)] text-white px-2 py-1 rounded-full">{p.tag}</span>
        )}
      </div>
      <div className="p-3 md:p-4 space-y-2">
        <div className="text-[11px] text-muted-foreground">{categoryName} · {p.unit}</div>
        <h3 className="font-semibold text-sm md:text-base leading-tight line-clamp-2 min-h-[2.5rem]">{p.name_bn}</h3>
        <div className="flex items-baseline gap-1.5 pt-1">
          <span className="text-lg md:text-xl font-extrabold text-[var(--leaf-deep)]">৳{p.price}</span>
          {p.old_price && <span className="text-xs text-muted-foreground line-through">৳{p.old_price}</span>}
        </div>
        <button className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center justify-center hover:opacity-90 shadow-[var(--shadow-soft)] gap-1">
          <ShoppingCart className="size-3.5" /> কার্টে যোগ করুন
        </button>
      </div>
    </article>
  );
}
