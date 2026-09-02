import { createFileRoute, Link } from "@tanstack/react-router";
import { thumb } from "@/lib/img";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "সব ক্যাটাগরি — তাজা বাজার" },
      { name: "description", content: "আমাদের সব ক্যাটাগরি এক জায়গায় দেখুন।" },
    ],
  }),
  component: CategoriesPage,
});

type DBCategory = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null };
type DBProduct = { id: string; category_id: string | null };

function CategoriesPage() {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: async (): Promise<DBCategory[]> => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "public"],
    queryFn: async (): Promise<DBProduct[]> => {
      const { data, error } = await supabase.from("products").select("id,category_id").eq("is_active", true);
      if (error) throw error;
      return (data as DBProduct[]) ?? [];
    },
  });
  const counts: Record<string, number> = {};
  for (const p of products) if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="py-6 md:py-10 pb-24 md:pb-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)] mb-6 text-center">সব ক্যাটাগরি</h1>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/cat/$catId"
                params={{ catId: c.id }}
                className="group flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl bg-card border border-border hover:border-primary transition"
              >
                <div className="size-16 md:size-20 rounded-2xl grid place-items-center text-3xl group-hover:scale-110 transition overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
                  {c.image_url ? <img loading="lazy" decoding="async" src={thumb(c.image_url, 200)} alt={c.name_bn} className="size-full object-cover" /> : "🛒"}
                </div>
                <div className="text-xs md:text-sm font-semibold text-center leading-tight">{c.name_bn}</div>
                <div className="text-[10px] text-muted-foreground">{counts[c.id] ?? 0} আইটেম</div>
              </Link>
            ))}
          </div>
          {categories.length === 0 && (
            <div className="text-center text-muted-foreground py-12">কোন ক্যাটাগরি পাওয়া যায়নি</div>
          )}
        </div>
      </section>
      <MobileBottomNav />
    </div>
  );
}