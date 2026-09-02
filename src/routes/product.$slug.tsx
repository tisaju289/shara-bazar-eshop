import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ProductCard } from "@/components/ProductCard";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCart } from "@/hooks/useCart";
import { openCartDrawer } from "@/hooks/useCartDrawer";
import { thumb, thumbSrcSet } from "@/lib/img";
import { Home, ChevronRight, Plus, Minus, Star, Truck, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "পণ্যের বিবরণ — Fresh Feni" },
      { name: "description", content: "পণ্যের দাম, ছবি ও বিস্তারিত দেখে সরাসরি অর্ডার করুন Fresh Feni থেকে।" },
      { property: "og:title", content: "পণ্যের বিবরণ — Fresh Feni" },
      { property: "og:description", content: "পণ্যের দাম, ছবি ও বিস্তারিত দেখে সরাসরি অর্ডার করুন Fresh Feni থেকে।" },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductDetailPage,
});

type DBProduct = {
  id: string; slug: string; name_bn: string; unit: string; price: number; old_price: number | null;
  image_url: string | null; tag: string | null; stock: number; is_active: boolean;
  category_id: string | null; brand_id: string | null; subcategory_id: string | null;
  keywords: string | null; reviews_rating: number | null; reviews_count: number | null; offer_badge: string | null;
};

const COLS =
  "id,slug,name_bn,unit,price,old_price,image_url,tag,stock,is_active,category_id,brand_id,subcategory_id,keywords,reviews_rating,reviews_count,offer_badge";

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { data: settings } = useSiteSettings();
  const [cart, setCart] = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async (): Promise<DBProduct | null> => {
      const { data } = await supabase.from("products").select(COLS).eq("slug", slug).eq("is_active", true).maybeSingle();
      return (data as DBProduct) ?? null;
    },
  });

  const { data: category } = useQuery({
    queryKey: ["category-of", product?.category_id],
    enabled: !!product?.category_id,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name_bn").eq("id", product!.category_id!).maybeSingle();
      return data as { id: string; name_bn: string } | null;
    },
  });

  const { data: brand } = useQuery({
    queryKey: ["brand-of", product?.brand_id],
    enabled: !!product?.brand_id,
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("id,name_bn").eq("id", product!.brand_id!).maybeSingle();
      return data as { id: string; name_bn: string } | null;
    },
  });

  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.category_id, product?.id],
    enabled: !!product?.category_id,
    queryFn: async (): Promise<DBProduct[]> => {
      const { data } = await supabase
        .from("products")
        .select(COLS)
        .eq("is_active", true)
        .eq("category_id", product!.category_id!)
        .neq("id", product!.id)
        .limit(12);
      return (data as DBProduct[]) ?? [];
    },
  });

  const qty = product ? cart[product.id] ?? 0 : 0;
  const add = (id: string) => setCart((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((p) => {
      const n = (p[id] ?? 0) - 1;
      const next = { ...p };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const buyNow = () => {
    if (!product) return;
    if (!cart[product.id]) add(product.id);
    openCartDrawer();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-3 md:px-4 py-4">
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6 animate-pulse">
            <div className="aspect-square rounded-xl bg-muted" />
            <div className="space-y-3">
              <div className="h-6 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-10 bg-muted rounded w-1/2" />
            </div>
          </div>
        ) : !product ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-lg font-bold">পণ্যটি পাওয়া যায়নি</p>
            <Link to="/products" className="inline-block h-10 px-5 rounded-lg bg-primary text-primary-foreground font-bold leading-10">
              সব পণ্য দেখুন
            </Link>
          </div>
        ) : (
          <>
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3 flex-wrap">
              <Link to="/" className="inline-flex items-center gap-1 hover:text-primary"><Home className="size-3.5" /> হোম</Link>
              <ChevronRight className="size-3" />
              {category ? (
                <>
                  <Link to="/cat/$catId" params={{ catId: product.category_id! }} className="hover:text-primary">{category.name_bn}</Link>
                  <ChevronRight className="size-3" />
                </>
              ) : null}
              <span className="text-foreground line-clamp-1">{product.name_bn}</span>
            </nav>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative rounded-xl border border-border bg-white overflow-hidden">
                <div className="aspect-square grid place-items-center">
                  {product.image_url ? (
                    <img
                      src={thumb(product.image_url, 700)}
                      srcSet={thumbSrcSet(product.image_url, 700)}
                      sizes="(max-width: 768px) 100vw, 500px"
                      alt={product.name_bn}
                      className="w-full h-full object-contain p-6"
                      fetchPriority="high"
                    />
                  ) : (
                    <div className="text-7xl">🛒</div>
                  )}
                </div>
                {product.tag && (
                  <span className="absolute top-3 left-3 text-[11px] font-bold uppercase bg-[var(--chili)] text-white px-2 py-0.5 rounded">{product.tag}</span>
                )}
              </div>

              <div className="space-y-3">
                <h1 className="text-xl md:text-2xl font-extrabold leading-snug">{product.name_bn}</h1>
                <div className="text-sm text-muted-foreground">
                  {[brand?.name_bn, category?.name_bn, product.unit].filter(Boolean).join(" · ")}
                </div>
                {Number(product.reviews_count ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={`size-4 ${i <= Math.round(Number(product.reviews_rating ?? 0)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                      ))}
                    </div>
                    <span>({product.reviews_count})</span>
                  </div>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[var(--leaf-deep)]">৳{product.price}</span>
                  {product.old_price ? <span className="text-base text-muted-foreground line-through">৳{product.old_price}</span> : null}
                </div>
                <div className="text-sm">
                  {product.stock > 0 ? <span className="text-primary font-semibold">স্টকে আছে</span> : <span className="text-destructive font-semibold">স্টক শেষ</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {qty === 0 ? (
                    <button onClick={() => add(product.id)} className="h-11 px-5 rounded-lg border border-primary text-primary font-bold inline-flex items-center gap-1 hover:bg-primary hover:text-primary-foreground transition">
                      <Plus className="size-4" /> কার্টে যোগ করুন
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 border border-primary text-primary rounded-lg h-11 px-2">
                      <button onClick={() => sub(product.id)} className="size-8 grid place-items-center"><Minus className="size-4" /></button>
                      <span className="font-bold min-w-6 text-center">{qty}</span>
                      <button onClick={() => add(product.id)} className="size-8 grid place-items-center"><Plus className="size-4" /></button>
                    </div>
                  )}
                  <button onClick={buyNow} className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90">
                    এখনই কিনুন
                  </button>
                </div>

                <div className="grid gap-2 pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Truck className="size-4 text-primary" /> ১-২ ঘণ্টায় ডেলিভারি</div>
                  <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> ১০০% ফ্রেশ পণ্যের নিশ্চয়তা</div>
                </div>
              </div>
            </div>

            {related.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-extrabold mb-3">একই ক্যাটাগরির পণ্য</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3">
                  {related.map((r) => (
                    <ProductCard
                      key={r.id}
                      product={r}
                      categoryName={category?.name_bn}
                      qty={cart[r.id] ?? 0}
                      add={add}
                      sub={sub}
                      onBuyNow={() => { if (!cart[r.id]) add(r.id); openCartDrawer(); }}
                      settings={settings?.product_card}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}
