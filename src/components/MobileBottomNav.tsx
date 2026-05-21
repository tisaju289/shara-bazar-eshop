import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Package, ShoppingCart } from "lucide-react";

/**
 * Shared mobile bottom nav for non-home pages.
 * (Home page has its own inline bottom nav wired to cart/search state.)
 */
export function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-1">
      <div className="flex items-center justify-around py-2">
        <Link to="/" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
          <Home className="size-5" />
          <span className="text-[10px] font-medium">হোম</span>
        </Link>
        <Link to="/categories" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
          <LayoutGrid className="size-5" />
          <span className="text-[10px] font-medium">ক্যাটাগরি</span>
        </Link>
        <Link to="/products" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
          <Package className="size-5" />
          <span className="text-[10px] font-medium">পণ্য</span>
        </Link>
        <Link to="/" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
          <ShoppingCart className="size-5" />
          <span className="text-[10px] font-medium">কার্ট</span>
        </Link>
      </div>
    </nav>
  );
}
