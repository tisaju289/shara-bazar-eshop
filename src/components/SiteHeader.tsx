import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { thumb } from "@/lib/img";
import { Search, ShoppingCart, MapPin, Phone, Leaf } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/hooks/useCart";
import { openCartDrawer } from "@/hooks/useCartDrawer";

export type SiteHeaderProps = {
  cartCount?: number;
  cartTotal?: number;
  onCartClick?: () => void;
};

/**
 * Shared site header for non-home pages.
 * - Desktop: full header (topbar + logo + search + cart link to home)
 * - Mobile: compact bar with logo centered
 */
export function SiteHeader({ cartCount, cartTotal, onCartClick }: SiteHeaderProps = {}) {
  const { data: settings } = useSiteSettings();
  const [cart] = useCart();
  const fallbackCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const effectiveCount = cartCount ?? fallbackCount;
  const handleCartClick = onCartClick ?? openCartDrawer;
  const brand = settings?.brand;
  const topbar = settings?.topbar;
  const menuItems = settings?.header_menu?.items ?? [];
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as { q?: string } });
  const [q, setQ] = useState(search?.q ?? "");
  useEffect(() => { setQ(search?.q ?? ""); }, [search?.q]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/products", search: { q: q.trim() || undefined } as any });
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileQ, setMobileQ] = useState("");
  const mobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    navigate({ to: "/products", search: { q: mobileQ.trim() || undefined } as any });
  };

  return (
    <>
      {/* Desktop top utility bar */}
      {topbar?.enabled && (
        <div className="hidden md:block bg-[var(--leaf-deep)] text-primary-foreground/90 text-xs">
          <div className="container mx-auto px-4 flex items-center gap-4 py-2">
            <span className="flex items-center gap-1.5 shrink-0"><MapPin className="size-3.5" /> {topbar.location_bn}</span>
            {topbar.notice_enabled && topbar.notice_bn && (
              <div className="flex-1 overflow-hidden text-right rounded-none">
                <div
                  className="marquee-track"
                  style={{ animationDuration: `${topbar.notice_speed ?? 30}s` }}
                >
                  <span className="px-8">📢 {topbar.notice_bn}</span>
                  <span className="px-8">📢 {topbar.notice_bn}</span>
                </div>
              </div>
            )}
            <span className="flex items-center gap-4 shrink-0 ml-auto">
              <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> {topbar.phone}</span>
              <span>সাহায্য</span>
              <span>আমার অর্ডার</span>
            </span>
          </div>
        </div>
      )}

      {/* Desktop header */}
      <header className="hidden md:block sticky top-0 z-40 shadow-[var(--shadow-soft)]">
        <div className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              {brand?.logo_url ? (
                <img src={thumb(brand.logo_url, 96)} alt={brand.name_bn} className="size-10 rounded-md object-contain bg-card p-1" />
              ) : (
                <div className="size-10 rounded-md grid place-items-center bg-card text-primary">
                  <Leaf className="size-5" />
                </div>
              )}
              <div className="leading-tight">
                <div className="font-[family-name:var(--font-display)] font-extrabold text-lg">{brand?.name_bn ?? "FreshFeni"}</div>
                {brand?.tagline_bn && <div className="text-[10px] opacity-80 -mt-0.5">{brand.tagline_bn}</div>}
              </div>
            </Link>

            <form onSubmit={submit} className="flex-1 min-w-0">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="খুঁজুন: ইলিশ, আম, মিনিকেট চাল..."
                  className="w-full h-11 pl-4 pr-12 rounded-md bg-card text-foreground outline-none text-sm placeholder:text-muted-foreground"
                />
                <button type="submit" aria-label="search" className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-3 rounded-md bg-accent text-accent-foreground grid place-items-center">
                  <Search className="size-5" />
                </button>
              </div>
            </form>

            <button onClick={handleCartClick} className="relative inline-flex items-center gap-2 h-11 px-4 rounded-md bg-accent text-accent-foreground font-bold hover:opacity-95 transition">
              <ShoppingCart className="size-5" />
              <span className="text-sm">{cartTotal ? `৳${cartTotal}` : "কার্ট"}</span>
              {!!effectiveCount && (
                <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-card text-primary text-[11px] grid place-items-center font-bold border border-border">{effectiveCount}</span>
              )}
            </button>
          </div>
        </div>

        {menuItems.length > 0 && (
          <div className="bg-card border-b border-border">
            <nav className="container mx-auto px-4 h-10 flex items-center gap-6 text-sm font-semibold text-[var(--leaf-deep)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {menuItems.map((m, i) => (
                <a key={i} href={m.url} className="hover:text-primary transition whitespace-nowrap">{m.label_bn}</a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Mobile compact header: logo + search */}
      <header className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {brand?.logo_url ? (
              <img src={thumb(brand.logo_url, 80)} alt={brand.name_bn} className="size-8 rounded-xl object-contain bg-white p-0.5 shadow-[var(--shadow-soft)]" />
            ) : (
              <div className="size-8 rounded-xl grid place-items-center text-primary-foreground shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-hero)" }}>
                <Leaf className="size-4" />
              </div>
            )}
            <span className="font-[family-name:var(--font-display)] font-extrabold text-base text-[var(--leaf-deep)]">{brand?.name_bn ?? "FreshFeni"}</span>
          </Link>
          <button type="button" onClick={() => setSearchOpen(true)} className="size-9 grid place-items-center rounded-full bg-secondary text-muted-foreground hover:text-primary transition" aria-label="search">
            <Search className="size-5" />
          </button>
        </div>
      </header>

      {/* Mobile search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="top-[20%] translate-y-0 max-w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>সার্চ করুন</DialogTitle>
          </DialogHeader>
          <form onSubmit={mobileSubmit}>
            <div className="relative">
              <button type="submit" aria-label="search" className="absolute left-2 top-1/2 -translate-y-1/2 size-9 grid place-items-center text-muted-foreground">
                <Search className="size-4" />
              </button>
              <input
                autoFocus
                value={mobileQ}
                onChange={(e) => setMobileQ(e.target.value)}
                placeholder="খুঁজুন তাজা পণ্য..."
                className="w-full h-11 pl-10 pr-4 rounded-full bg-secondary border border-transparent focus:border-primary outline-none text-sm"
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}