import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
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
      <header className="hidden md:block sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="size-9 rounded-full grid place-items-center bg-secondary hover:bg-secondary/80">
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-lg md:text-xl font-extrabold text-[var(--leaf-deep)]">সব ক্যাটাগরি</h1>
        </div>
      </header>

      <section className="py-6 md:py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/"
                hash="categories"
                className="group flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl bg-card border border-border hover:border-primary transition"
              >
                <div className="size-16 md:size-20 rounded-2xl grid place-items-center text-3xl group-hover:scale-110 transition overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
                  {c.image_url ? <img src={c.image_url} alt={c.name_bn} className="size-full object-cover" /> : "🛒"}
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
    </div>
  );
}