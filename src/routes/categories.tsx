import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CategoryCard } from "@/components/CategoryCard";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "সব ক্যাটাগরি — FreshFeni" },
      { name: "description", content: "আমাদের সব ক্যাটাগরি এক জায়গায় দেখুন।" },
    ],
  }),
  component: CategoriesPage,
});

type DBCategory = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null };

function CategoriesPage() {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: async (): Promise<DBCategory[]> => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="py-6 md:py-10 pb-24 md:pb-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)] mb-6 text-center">সব ক্যাটাগরি</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
            {categories.map((c) => (
              <CategoryCard key={c.id} id={c.id} name_bn={c.name_bn} image_url={c.image_url} className="w-full" />
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
