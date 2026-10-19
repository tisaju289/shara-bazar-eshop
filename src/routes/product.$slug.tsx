import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { thumb } from "@/lib/img";
import { Loader2, Plus, Minus, ShoppingCart, Star, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({ meta: [{ title: "পণ্যের বিস্তারিত — তাজা বাজার" }] }),
  component: ProductDetailPage,
});

type Product = {
  id: string; slug: string; name_bn: string; unit: string; price: number; old_price: number | null;
  image_url: string | null; tag: string | null; stock: number; category_id: string | null; subcategory_id: string | null;
  brand_id: string | null; keywords: string | null; reviews_rating: number | null;
  reviews_count: number | null; offer_badge: string | null;
};
type Named = { id: string; name_bn: string };

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useCart();
  const { data: settings } = useSiteSettings();
  const { data, isLoading, error } = useQuery({
    queryKey: ["product", "slug", slug],
    queryFn: async (): Promise<{ product: Product; category: Named | null; brand: Named | null }> => {
      const { data: product, error: productError } = await (supabase as any)
        .from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (productError) throw productError;
      if (!product) throw new Error("পণ্যটি পাওয়া যায়নি");
      const [categoryResult, brandResult] = await Promise.all([
        product.category_id ? (supabase as any).from("categories").select("id,name_bn").eq("id", product.category_id).maybeSingle() : Promise.resolve({ data: null }),
        product.brand_id ? (supabase as any).from("brands").select("id,name_bn").eq("id", product.brand_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return {
        product: product as Product,
        category: categoryResult.data as Named | null,
        brand: brandResult.data as Named | null,
      };
    },
    enabled: !!slug,
  });
  const product = data?.product;
  const { data: relatedProducts = [], isLoading: relatedLoading, error: relatedError } = useQuery({
    queryKey: ["product", "related", product?.id, product?.category_id],
    queryFn: async (): Promise<Product[]> => {
      if (!product?.category_id) return [];
      const { data: related, error: relatedQueryError } = await (supabase as any)
        .from("products")
        .select("id,slug,name_bn,unit,price,old_price,image_url,tag,category_id,subcategory_id,brand_id,reviews_rating,reviews_count,offer_badge,stock,keywords")
        .eq("is_active", true)
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(8);
      if (relatedQueryError) throw relatedQueryError;
      return (related ?? []) as Product[];
    },
    enabled: !!product?.id && !!product.category_id,
  });
  const qty = product ? (cart[product.id] ?? 0) : 0;
  const addToCart = (id: string) => setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  const removeFromCart = (id: string) => setCart((current) => {
    const currentQty = current[id] ?? 0;
    if (currentQty <= 1) return Object.fromEntries(Object.entries(current).filter(([cartId]) => cartId !== id));
    return { ...current, [id]: currentQty - 1 };
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-5 md:py-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="size-4" />
          <Link to="/products" className="hover:text-primary">সব পণ্য</Link>
          <ChevronRight className="size-4" />
          <span className="truncate text-foreground">{product?.name_bn ?? "পণ্যের বিস্তারিত"}</span>
        </nav>

        {isLoading ? (
          <div className="min-h-[420px] grid place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
        ) : error || !product ? (
          <div className="min-h-[420px] grid place-items-center text-center px-4">
            <div>
              <p className="font-semibold text-lg">পণ্যটি পাওয়া যায়নি</p>
              <p className="mt-2 text-sm text-muted-foreground">পণ্যটি সরানো হয়েছে অথবা এই লিংকটি সঠিক নয়।</p>
              <Link to="/products" className="text-primary text-sm mt-4 inline-block">সব পণ্য দেখুন</Link>
            </div>
          </div>
        ) : (
          <article className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="grid md:grid-cols-2">
              <div className="aspect-square bg-white overflow-hidden p-6 md:p-10">
                {product.image_url ? <img src={thumb(product.image_url, 900)} alt={product.name_bn} className="w-full h-full object-contain" /> : <div className="h-full grid place-items-center text-7xl">🛒</div>}
              </div>
              <div className="p-5 md:p-8 lg:p-10 flex flex-col">
                <div className="flex flex-wrap gap-2 mb-3">
                  {product.tag && <span className="text-[10px] font-bold uppercase bg-[var(--chili)] text-white px-2 py-1 rounded">{product.tag}</span>}
                  {product.offer_badge && <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded">{product.offer_badge}</span>}
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">{product.name_bn}</h1>
                <p className="text-sm text-muted-foreground mt-2">{[data.category?.name_bn, data.brand?.name_bn, product.unit].filter(Boolean).join(" · ")}</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-3xl font-extrabold text-[var(--leaf-deep)]">৳{product.price}</span>
                  {product.old_price && <span className="text-sm text-muted-foreground line-through">৳{product.old_price}</span>}
                </div>
                {Number(product.reviews_count) > 0 && <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground"><Star className="size-4 fill-amber-400 text-amber-400" /> {product.reviews_rating ?? 0} ({product.reviews_count} রিভিউ)</div>}
                {product.keywords && <p className="text-sm leading-7 text-muted-foreground mt-5 border-t border-border pt-4">{product.keywords}</p>}
                <div className="mt-auto pt-7 flex flex-col sm:flex-row gap-2">
                  {qty > 0 ? (
                    <div className="flex items-center justify-between h-12 px-2 rounded-xl border border-primary text-primary min-w-32">
                      <button onClick={() => setCart((c) => qty > 1 ? { ...c, [product.id]: qty - 1 } : Object.fromEntries(Object.entries(c).filter(([id]) => id !== product.id)))} className="size-9 grid place-items-center" aria-label="পরিমাণ কমান"><Minus className="size-4" /></button>
                      <b>{qty}</b>
                      <button onClick={() => setCart((c) => ({ ...c, [product.id]: qty + 1 }))} className="size-9 grid place-items-center" aria-label="পরিমাণ বাড়ান"><Plus className="size-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setCart((c) => ({ ...c, [product.id]: 1 }))} className="h-12 flex-1 rounded-xl border border-primary text-primary font-bold inline-flex items-center justify-center gap-2 hover:bg-primary/10"><ShoppingCart className="size-5" /> কার্টে যোগ করুন</button>
                  )}
                  <button onClick={() => { if (!qty) setCart((c) => ({ ...c, [product.id]: 1 })); navigate({ to: "/products" }); }} className="h-12 flex-1 rounded-xl bg-primary text-primary-foreground font-bold">এখনই কিনুন</button>
                </div>
              </div>
            </div>
          </article>
        )}
        {product && (relatedLoading || relatedProducts.length > 0 || relatedError) && (
          <section className="mx-auto max-w-5xl mt-10 md:mt-14">
            <div className="mb-4">
              <h2 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)]">সম্পর্কিত পণ্য</h2>
              <p className="mt-1 text-sm text-muted-foreground">এই ক্যাটাগরির আরও কিছু পণ্য</p>
            </div>
            {relatedLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4" aria-label="সম্পর্কিত পণ্য লোড হচ্ছে">
                {[0, 1, 2, 3].map((item) => <div key={item} className="aspect-[3/4] animate-pulse rounded-lg bg-secondary" />)}
              </div>
            ) : relatedError ? (
              <p className="text-sm text-muted-foreground">সম্পর্কিত পণ্যগুলো এখন দেখানো যাচ্ছে না।</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct.id}
                    product={relatedProduct}
                    categoryName={data?.category?.name_bn ?? ""}
                    brandName=""
                    qty={cart[relatedProduct.id] ?? 0}
                    add={addToCart}
                    sub={removeFromCart}
                    onBuyNow={() => {
                      if (!cart[relatedProduct.id]) addToCart(relatedProduct.id);
                      navigate({ to: "/products" });
                    }}
                    settings={settings?.product_card}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}