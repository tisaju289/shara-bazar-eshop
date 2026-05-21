import { Link } from "@tanstack/react-router";
import { Search, ShoppingCart, MapPin, Phone, Leaf } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/**
 * Shared site header for non-home pages.
 * - Desktop: full header (topbar + logo + search + cart link to home)
 * - Mobile: compact bar with logo centered
 */
export function SiteHeader() {
  const { data: settings } = useSiteSettings();
  const brand = settings?.brand;
  const topbar = settings?.topbar;

  return (
    <>
      {/* Desktop top utility bar */}
      {topbar?.enabled && (
        <div className="hidden md:block bg-[var(--leaf-deep)] text-primary-foreground/90 text-xs">
          <div className="container mx-auto px-4 flex justify-between py-2">
            <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {topbar.location_bn}</span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> {topbar.phone}</span>
              <span>সাহায্য</span>
              <span>আমার অর্ডার</span>
            </span>
          </div>
        </div>
      )}

      {/* Desktop header */}
      <header className="hidden md:block sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 md:gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name_bn} className="size-10 rounded-2xl object-contain bg-white p-1 shadow-[var(--shadow-soft)]" />
            ) : (
              <div className="size-10 rounded-2xl grid place-items-center text-primary-foreground shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-hero)" }}>
                <Leaf className="size-5" />
              </div>
            )}
            <div className="leading-tight">
              <div className="font-[family-name:var(--font-display)] font-extrabold text-lg text-[var(--leaf-deep)]">{brand?.name_bn ?? "তাজা বাজার"}</div>
              {brand?.tagline_bn && <div className="text-[10px] text-muted-foreground -mt-0.5 hidden sm:block">{brand.tagline_bn}</div>}
            </div>
          </Link>

          <Link to="/products" className="flex-1 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <div className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border border-transparent flex items-center text-muted-foreground text-sm">
                খুঁজুন: ইলিশ, আম, মিনিকেট চাল...
              </div>
            </div>
          </Link>

          <Link to="/" className="relative inline-flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-primary-foreground hover:opacity-95 transition shadow-[var(--shadow-soft)]">
            <ShoppingCart className="size-5" />
            <span className="hidden sm:inline text-sm font-semibold">কার্ট</span>
          </Link>
        </div>
      </header>

      {/* Mobile compact header: centered logo */}
      <header className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="px-4 py-2.5 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-2">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name_bn} className="size-8 rounded-xl object-contain bg-white p-0.5 shadow-[var(--shadow-soft)]" />
            ) : (
              <div className="size-8 rounded-xl grid place-items-center text-primary-foreground shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-hero)" }}>
                <Leaf className="size-4" />
              </div>
            )}
            <span className="font-[family-name:var(--font-display)] font-extrabold text-base text-[var(--leaf-deep)]">{brand?.name_bn ?? "তাজা বাজার"}</span>
          </Link>
        </div>
      </header>
    </>
  );
}