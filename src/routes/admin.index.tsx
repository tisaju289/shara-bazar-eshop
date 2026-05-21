import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Tags, TrendingUp, Eye, EyeOff, ShoppingBag, Clock, CheckCircle2, XCircle, Truck, DollarSign, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type OrderItem = { id: string; name_bn: string; qty: number; price: number; unit?: string };
type Order = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
};

function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, categories: 0, active: 0, inactive: 0 });
  const [orderStats, setOrderStats] = useState({ total: 0, pending: 0, confirmed: 0, delivered: 0, cancelled: 0, revenue: 0, todayCount: 0, todayRevenue: 0 });
  const [recent, setRecent] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: p }, { count: c }, { count: a }, { count: i }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", false),
      ]);
      setStats({ products: p ?? 0, categories: c ?? 0, active: a ?? 0, inactive: i ?? 0 });

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      const list = (orders ?? []) as unknown as Order[];
      const todayStr = new Date().toDateString();
      const counts = { total: list.length, pending: 0, confirmed: 0, delivered: 0, cancelled: 0, revenue: 0, todayCount: 0, todayRevenue: 0 };
      for (const o of list) {
        if (o.status === "pending") counts.pending++;
        else if (o.status === "confirmed") counts.confirmed++;
        else if (o.status === "delivered") { counts.delivered++; counts.revenue += Number(o.total) || 0; }
        else if (o.status === "cancelled") counts.cancelled++;
        if (new Date(o.created_at).toDateString() === todayStr) {
          counts.todayCount++;
          if (o.status !== "cancelled") counts.todayRevenue += Number(o.total) || 0;
        }
      }
      setOrderStats(counts);
      setRecent(list.slice(0, 5));
    })();
  }, []);

  const cards = [
    { label: "মোট পণ্য", value: stats.products, icon: Package, color: "var(--leaf)" },
    { label: "ক্যাটাগরি", value: stats.categories, icon: Tags, color: "var(--mango)" },
    { label: "সক্রিয় পণ্য", value: stats.active, icon: Eye, color: "var(--primary-glow)" },
    { label: "নিষ্ক্রিয় পণ্য", value: stats.inactive, icon: EyeOff, color: "var(--chili)" },
  ];

  const orderCards = [
    { label: "মোট অর্ডার", value: orderStats.total, icon: ShoppingBag, color: "var(--leaf)" },
    { label: "নতুন অর্ডার", value: orderStats.pending, icon: Clock, color: "var(--mango)" },
    { label: "নিশ্চিত", value: orderStats.confirmed, icon: CheckCircle2, color: "var(--primary-glow)" },
    { label: "ডেলিভারড", value: orderStats.delivered, icon: Truck, color: "var(--leaf-deep)" },
    { label: "বাতিল", value: orderStats.cancelled, icon: XCircle, color: "var(--chili)" },
    { label: "মোট আয়", value: `৳${orderStats.revenue.toLocaleString("bn-BD")}`, icon: DollarSign, color: "var(--leaf)" },
  ];

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    pending: { label: "নতুন", color: "bg-amber-100 text-amber-800 border-amber-200" },
    confirmed: { label: "নিশ্চিত", color: "bg-blue-100 text-blue-800 border-blue-200" },
    delivered: { label: "ডেলিভারড", color: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { label: "বাতিল", color: "bg-red-100 text-red-800 border-red-200" },
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground text-sm mt-1">আপনার দোকানের সর্বশেষ অবস্থা এক নজরে</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-5 hover:shadow-[var(--shadow-soft)] transition">
            <div className="size-10 rounded-xl grid place-items-center text-white" style={{ background: c.color }}>
              <c.icon className="size-5" />
            </div>
            <div className="mt-4 text-3xl font-extrabold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)]">অর্ডার সারাংশ</h2>
            <p className="text-xs text-muted-foreground mt-1">
              আজ {orderStats.todayCount} টি অর্ডার · আয় ৳{orderStats.todayRevenue.toLocaleString("bn-BD")}
            </p>
          </div>
          <Link to="/admin/orders" className="text-sm font-semibold text-primary hover:underline">সব দেখুন →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {orderCards.map((c) => (
            <div key={c.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-[var(--shadow-soft)] transition">
              <div className="size-9 rounded-xl grid place-items-center text-white" style={{ background: c.color }}>
                <c.icon className="size-4" />
              </div>
              <div className="mt-3 text-2xl font-extrabold">{c.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="font-bold">সাম্প্রতিক অর্ডার</div>
          <Link to="/admin/orders" className="text-xs text-primary font-semibold hover:underline">সব অর্ডার</Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">কোনো অর্ডার নেই</div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((o) => {
              const st = STATUS_LABEL[o.status] ?? STATUS_LABEL.pending;
              const items = Array.isArray(o.items) ? o.items : [];
              return (
                <li key={o.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{o.customer_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="inline-flex items-center gap-1"><Phone className="size-3" />{o.phone}</span>
                      <span className="inline-flex items-center gap-1 truncate max-w-[260px]"><MapPin className="size-3" />{o.address}</span>
                      <span>{items.length} আইটেম</span>
                      <span>{new Date(o.created_at).toLocaleString("bn-BD")}</span>
                    </div>
                  </div>
                  <div className="font-bold text-[var(--leaf-deep)] shrink-0">৳{o.total}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <TrendingUp className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg">দ্রুত শুরু করুন</h2>
            <p className="text-sm text-muted-foreground">নতুন পণ্য যোগ করুন বা বিদ্যমান পণ্য আপডেট করুন।</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link to="/admin/products" className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center">পণ্য ম্যানেজ করুন</Link>
          <Link to="/admin/categories" className="h-11 px-5 rounded-xl bg-secondary text-secondary-foreground font-semibold inline-flex items-center">ক্যাটাগরি ম্যানেজ করুন</Link>
        </div>
      </div>
    </div>
  );
}