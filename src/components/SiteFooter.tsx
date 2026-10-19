import { useQuery } from "@tanstack/react-query";
import { Leaf, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { thumb } from "@/lib/img";

type FooterCategory = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null };

export function SiteFooter() {
  const { data: settings } = useSiteSettings();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: async (): Promise<FooterCategory[]> => {
      const { data, error } = await (supabase as any)
        .from("categories")
        .select("id,name_bn,slug,sort_order,image_url")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const footer = settings?.footer;
  const brand = settings?.brand;

  return (
    <footer
      className="text-primary-foreground/90 pt-12 pb-20 md:pb-6 mt-8"
      style={{
        background: footer?.bg_color || "var(--leaf-deep)",
        color: footer?.text_color || undefined,
      }}
    >
      <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8 text-center">
        {footer?.show_brand_column !== false && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              {brand?.logo_url ? (
                <img src={thumb(brand.logo_url, 96)} alt={brand.name_bn} className="size-10 rounded-2xl object-contain bg-white/10 p-1" />
              ) : (
                <div className="size-10 rounded-2xl grid place-items-center bg-white/10"><Leaf className="size-5" /></div>
              )}
              <span className="font-extrabold text-lg">{brand?.name_bn}</span>
            </div>
            <p className="text-sm text-primary-foreground/70">{footer?.about_bn}</p>
          </div>
        )}
        {footer?.show_categories_column !== false && (
          <div>
            <h4 className="font-bold mb-3">{footer?.categories_title_bn || "ক্যাটাগরি"}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/75">
              {categories.slice(0, 5).map((category) => <li key={category.id}>{category.name_bn}</li>)}
            </ul>
          </div>
        )}
        {footer?.show_contact_column !== false && (
          <div>
            <h4 className="font-bold mb-3">{footer?.contact_title_bn || "যোগাযোগ"}</h4>
            {footer?.phone && <p className="text-sm text-primary-foreground/75 flex items-center gap-2 justify-center"><Phone className="size-4" /> {footer.phone}</p>}
            {footer?.email && <p className="text-sm text-primary-foreground/75 mt-2">✉ {footer.email}</p>}
            {footer?.address_bn && <p className="text-sm text-primary-foreground/75 mt-2 flex items-center gap-2 justify-center"><MapPin className="size-4" /> {footer.address_bn}</p>}
          </div>
        )}
      </div>
      {footer?.show_copyright !== false && (
        <div className="container mx-auto px-4 mt-10 pt-6 border-t border-white/10 text-xs text-primary-foreground/60 text-center">
          {(footer?.copyright_bn || "© {year} {brand} — সর্বস্বত্ব সংরক্ষিত")
            .replace("{year}", String(new Date().getFullYear()))
            .replace("{brand}", brand?.name_bn ?? "")}
        </div>
      )}
    </footer>
  );
}
