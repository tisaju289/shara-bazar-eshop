import { Link, useNavigate } from "@tanstack/react-router";
import { Home, Search, LayoutGrid, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Shared mobile bottom nav for non-home pages.
 * (Home page has its own inline bottom nav wired to cart/search state.)
 */
export function MobileBottomNav() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate({ to: "/products", search: { q: q.trim() || undefined } as any });
  };
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-1">
      <div className="flex items-center justify-around py-2">
        <Link to="/" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
          <Home className="size-5" />
          <span className="text-[10px] font-medium">হোম</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
          <Search className="size-5" />
          <span className="text-[10px] font-medium">সার্চ</span>
        </button>
        <Link to="/categories" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
          <LayoutGrid className="size-5" />
          <span className="text-[10px] font-medium">ক্যাটাগরি</span>
        </Link>
        <Link to="/" className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px]">
          <ShoppingCart className="size-5" />
          <span className="text-[10px] font-medium">কার্ট</span>
        </Link>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 max-w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>সার্চ করুন</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit}>
            <div className="relative">
              <button type="submit" aria-label="search" className="absolute left-2 top-1/2 -translate-y-1/2 size-9 grid place-items-center text-muted-foreground">
                <Search className="size-4" />
              </button>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="খুঁজুন তাজা পণ্য..."
                className="w-full h-11 pl-10 pr-4 rounded-full bg-secondary border border-transparent focus:border-primary outline-none text-sm"
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
}