import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { thumb } from "@/lib/img";
import { Loader2, X, Plus, Minus, ShoppingCart, Star } from "lucide-react";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({ meta: [{ title: "পণ্যের বিস্তারিত — তাজা বাজার" }] }),
  component: ProductDetailModal,
});

type Product = {
  id: string; slug: string; name_bn: string; unit: string; price: number; old_price: number | null;
  image_url: string | null; tag: string | null; stock: number; category_id: string | null;
  brand_id: string | null; keywords: string | null; reviews_rating: number | null;
  reviews_count: number | null; offer_badge: string | null;
};
type Named = { id: string; name_bn: string };

function ProductDetailModal() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useCart();
  const { data, isLoading, error } = useQuery({
    queryKey: ["product", "slug", slug],
    queryFn: async (): Promise<{ product: Product; category: Named | null; brand: Named | null }> => {
      const { data: product, error: productError } = await supabase
        .from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (productError) throw productError;
      if (!product) throw new Error("পণ্যটি পাওয়া যায়নি");
      const [categoryResult, brandResult] = await Promise.all([
        product.category_id ? supabase.from("categories").select("id,name_bn").eq("id", product.category_id).maybeSingle() : Promise.resolve({ data: null }),
        product.brand_id ? supabase.from("brands").select("id,name_bn").eq("id", product.brand_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return { product: product as Product, category: categoryResult.data as Named | null, brand: brandResult.data as Named | null };
    },
    enabled: !!slug,
  });
  const product = data?.product;
  const qty = product ? (cart[product.id] ?? 0) : 0;
  const close = () => {
    if (window.history.length > 1) window.history.back();
    else navigate({ to: "/products" });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="পণ্যের বিস্তারিত">
      <button aria-label="বন্ধ করুন" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <section className="relative w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-background shadow-2xl">
        <button onClick={close} aria-label="বন্ধ করুন" className="absolute right-3 top-3 z-10 size-10 rounded-full bg-background/90 border border-border grid place-items-center hover:bg-secondary">
          <X className="size-5" />
        </button>
        {isLoading ? (
          <div className="min-h-[360px] grid place-items-center"><Loader2 className="size-7 animate-spin text-primary" /></div>
        ) : error || !product ? (
          <div className="min-h-[360px] grid place-items-center text-center p-8">
            <div><p className="font-semibold">পণ্যটি পাওয়া যায়নি</p><Link to="/products" className="text-primary text-sm mt-2 inline-block">সব পণ্য দেখুন</Link></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-0">
            <div className="aspect-square bg-white rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none overflow-hidden p-6">
              {product.image_url ? <img src={thumb(product.image_url, 800)} alt={product.name_bn} className="w-full h-full object-contain" /> : <div className="h-full grid place-items-center text-7xl">🛒</div>}
            </div>
            <div className="p-6 md:p-8 flex flex-col">
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
              <div className="mt-auto pt-7 flex gap-2">
                {qty > 0 ? (
                  <div className="flex items-center justify-between h-12 px-2 rounded-xl border border-primary text-primary min-w-32">
                    <button onClick={() => setCart((c) => qty > 1 ? { ...c, [product.id]: qty - 1 } : Object.fromEntries(Object.entries(c).filter(([id]) => id !== product.id)))} className="size-9 grid place-items-center"><Minus className="size-4" /></button>
                    <b>{qty}</b>
                    <button onClick={() => setCart((c) => ({ ...c, [product.id]: qty + 1 }))} className="size-9 grid place-items-center"><Plus className="size-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => setCart((c) => ({ ...c, [product.id]: 1 }))} className="h-12 flex-1 rounded-xl border border-primary text-primary font-bold inline-flex items-center justify-center gap-2 hover:bg-primary/10"><ShoppingCart className="size-5" /> কার্টে যোগ করুন</button>
                )}
                <button onClick={() => { if (!qty) setCart((c) => ({ ...c, [product.id]: 1 })); navigate({ to: "/products" }); }} className="h-12 flex-1 rounded-xl bg-primary text-primary-foreground font-bold">এখনই কিনুন</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}