import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { BrandCard } from "@/components/BrandCard";

export const Route = createFileRoute("/brands/")({
  head: () => ({
    meta: [
      { title: "সব ব্র্যান্ড — FreshFeni" },
      { name: "description", content: "আমাদের সব ব্র্যান্ড এক জায়গায় দেখুন।" },
      { property: "og:title", content: "সব ব্র্যান্ড — FreshFeni" },
      { property: "og:description", content: "আমাদের সব ব্র্যান্ড এক জায়গায় দেখুন।" },
    ],
  }),
  component: BrandsPage,
});

type DBBrand = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null };

function BrandsPage() {
  const { data: brands = [] } = useQuery({
    queryKey: ["brands", "public", "all"],
    queryFn: async (): Promise<DBBrand[]> => {
      const { data, error } = await supabase.from("brands").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="py-6 md:py-10 pb-24 md:pb-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)] mb-6 text-center">সব ব্র্যান্ড</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
            {brands.map((b) => (
              <BrandCard key={b.id} id={b.id} name_bn={b.name_bn} image_url={b.image_url} className="w-full" />
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
