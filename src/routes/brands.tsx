import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/brands")({
  head: () => ({
    meta: [
      { title: "সব ব্র্যান্ড — তাজা বাজার" },
      { name: "description", content: "আমাদের সব ব্র্যান্ড এক জায়গায় দেখুন।" },
      { property: "og:title", content: "সব ব্র্যান্ড — তাজা বাজার" },
      { property: "og:description", content: "আমাদের সব ব্র্যান্ড এক জায়গায় দেখুন।" },
    ],
  }),
  component: BrandsPage,
});

type DBBrand = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null };
type DBProduct = { id: string; brand_id: string | null };

function BrandsPage() {
  const { data: brands = [] } = useQuery({
    queryKey: ["brands", "public", "all"],
    queryFn: async (): Promise<DBBrand[]> => {
      const { data, error } = await supabase.from("brands").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "public", "brand-counts"],
    queryFn: async (): Promise<DBProduct[]> => {
      const { data, error } = await supabase.from("products").select("id,brand_id").eq("is_active", true);
      if (error) throw error;
      return (data as DBProduct[]) ?? [];
    },
  });
  const counts: Record<string, number> = {};
  for (const p of products) if (p.brand_id) counts[p.brand_id] = (counts[p.brand_id] ?? 0) + 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="py-6 md:py-10 pb-24 md:pb-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)] mb-6 text-center">সব ব্র্যান্ড</h1>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
            {brands.map((b) => (
              <Link
                key={b.id}
                to="/brands/$brandId"
                params={{ brandId: b.id }}
                className="group flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl bg-card border border-border hover:border-primary transition"
              >
                <div className="size-16 md:size-20 rounded-2xl grid place-items-center text-3xl group-hover:scale-110 transition overflow-hidden bg-white" style={{ background: "var(--gradient-warm)" }}>
                  {b.image_url ? <img src={b.image_url} alt={b.name_bn} className="size-full object-contain p-1" /> : "🏷️"}
                </div>
                <div className="text-xs md:text-sm font-semibold text-center leading-tight">{b.name_bn}</div>
                <div className="text-[10px] text-muted-foreground">{counts[b.id] ?? 0} পণ্য</div>
              </Link>
            ))}
          </div>
          {brands.length === 0 && (
            <div className="text-center text-muted-foreground py-12">কোন ব্র্যান্ড পাওয়া যায়নি</div>
          )}
        </div>
      </section>
      <MobileBottomNav />
    </div>
  );
}
