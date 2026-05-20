import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Leaf, LayoutDashboard, Package, Tags, LogOut, Loader2, Menu, Globe } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "অ্যাডমিন প্যানেল — তাজা বাজার" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6 text-center">
        <div className="space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold">লগইন প্রয়োজন</h1>
          <p className="text-muted-foreground text-sm">অ্যাডমিন প্যানেলে প্রবেশ করতে হলে লগইন করুন।</p>
          <Link to="/login" className="inline-block h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold leading-[44px]">লগইন করুন</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6 text-center">
        <div className="space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold">অনুমতি নেই</h1>
          <p className="text-muted-foreground text-sm">এই প্যানেল ব্যবহার করতে admin role প্রয়োজন।</p>
          <button onClick={async () => { await signOut(); navigate({ to: "/login" }); }} className="h-11 px-6 rounded-full bg-secondary text-secondary-foreground font-semibold">সাইন আউট</button>
        </div>
      </div>
    );
  }

  const nav = [
    { to: "/admin", label: "ড্যাশবোর্ড", icon: LayoutDashboard, exact: true },
    { to: "/admin/products", label: "পণ্য", icon: Package },
    { to: "/admin/categories", label: "ক্যাটাগরি", icon: Tags },
  ];

  const SidebarBody = () => (
    <>
      <div className="px-5 py-5 flex items-center gap-2">
        <div className="size-10 rounded-2xl grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
          <Leaf className="size-5" />
        </div>
        <div>
          <div className="font-extrabold text-[var(--leaf-deep)]">তাজা বাজার</div>
          <div className="text-[10px] text-muted-foreground">অ্যাডমিন প্যানেল</div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {nav.map((n) => {
          const active = n.exact ? path === n.to : path.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "hover:bg-secondary"}`}>
              <n.icon className="size-4" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
        <button onClick={async () => { await signOut(); navigate({ to: "/login" }); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-secondary text-destructive">
          <LogOut className="size-4" /> সাইন আউট
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--cream)]/40 flex">
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border sticky top-0 h-screen">
        <SidebarBody />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card flex flex-col">
            <SidebarBody />
          </aside>
        </div>
      )}
      <main className="flex-1 min-w-1">
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setOpen(true)}><Menu /></button>
            <span className="font-bold md:hidden">অ্যাডমিন</span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-[var(--shadow-soft)] hover:opacity-90 transition"
          >
            <Globe className="size-4" />
            সাইট দেখুন
          </Link>
        </header>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}