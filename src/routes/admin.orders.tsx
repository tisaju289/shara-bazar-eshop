import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  Package,
  Phone,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Truck,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "অর্ডার ম্যানেজমেন্ট — FreshFeni" },
      { name: "description", content: "FreshFeni অর্ডার, ক্রেতা ও ডেলিভারি স্ট্যাটাস ব্যবস্থাপনা।" },
      { property: "og:title", content: "অর্ডার ম্যানেজমেন্ট — FreshFeni" },
      { property: "og:description", content: "FreshFeni অর্ডার, ক্রেতা ও ডেলিভারি স্ট্যাটাস ব্যবস্থাপনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrders,
});

type OrderItem = {
  id: string;
  name_bn: string;
  qty: number;
  price: number;
  unit?: string;
  image_url?: string | null;
};

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

type ProductImageRow = { id: string; image_url: string | null };

const STATUSES = [
  { value: "pending", label: "নতুন", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock3 },
  { value: "confirmed", label: "নিশ্চিত", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
  { value: "delivered", label: "ডেলিভারড", color: "bg-green-100 text-green-800 border-green-200", icon: Truck },
  { value: "cancelled", label: "বাতিল", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
];

const money = (value: number) => `৳${Number(value || 0).toLocaleString("bn-BD")}`;

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productImages, setProductImages] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [sort, setSort] = useState<"newest" | "oldest" | "high" | "low">("newest");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      const list = (data ?? []) as unknown as Order[];
      if (!active) return;
      setOrders(list);

      const productIds = [...new Set(list.flatMap((order) =>
        (Array.isArray(order.items) ? order.items : []).map((item) => item.id).filter(Boolean),
      ))];
      if (productIds.length > 0) {
        const { data: products } = await supabase.from("products").select("id,image_url").in("id", productIds);
        if (active) {
          setProductImages(Object.fromEntries(((products ?? []) as ProductImageRow[]).map((p) => [p.id, p.image_url])));
        }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => STATUSES.reduce<Record<string, number>>((acc, status) => {
    acc[status.value] = orders.filter((order) => order.status === status.value).length;
    return acc;
  }, {}), [orders]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = orders.filter((order) => {
      if (filter !== "all" && order.status !== filter) return false;
      if (!query) return true;
      const items = Array.isArray(order.items) ? order.items : [];
      return order.customer_name.toLowerCase().includes(query)
        || order.phone.toLowerCase().includes(query)
        || order.address.toLowerCase().includes(query)
        || order.id.toLowerCase().includes(query)
        || items.some((item) => item.name_bn.toLowerCase().includes(query));
    });
    return [...list].sort((a, b) => {
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "high") return b.total - a.total;
      if (sort === "low") return a.total - b.total;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filter, orders, search, sort]);

  const phoneStats = (phone: string, currentId: string) => {
    const all = orders.filter((order) => order.phone === phone);
    const delivered = all.filter((order) => order.status === "delivered").length;
    const cancelled = all.filter((order) => order.status === "cancelled").length;
    const completed = delivered + cancelled;
    return {
      delivered,
      cancelled,
      successPct: completed > 0 ? Math.round((delivered / completed) * 100) : null,
      duplicates: all.filter((order) => order.id !== currentId).length,
      totalOrders: all.length,
    };
  };

  const updateStatus = async (id: string, status: string) => {
    const previous = orders;
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) setOrders(previous);
  };

  const removeOrder = async (id: string) => {
    if (!confirm("এই অর্ডারটি স্থায়ীভাবে মুছে ফেলবেন?")) return;
    const previous = orders;
    setOrders((current) => current.filter((order) => order.id !== id));
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) setOrders(previous);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--leaf-deep)] md:text-3xl">অর্ডার ম্যানেজমেন্ট</h1>
          <p className="mt-1 text-sm text-muted-foreground">মোট {orders.length.toLocaleString("bn-BD")}টি অর্ডার · এখানে {visible.length.toLocaleString("bn-BD")}টি দেখানো হচ্ছে</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Button type="button" variant={filter === "all" ? "default" : "outline"} className="h-16 justify-start px-3" onClick={() => setFilter("all")}>
          <ShoppingBag className="size-5" />
          <span className="text-left"><span className="block text-lg font-bold leading-none">{orders.length.toLocaleString("bn-BD")}</span><span className="text-xs">সব অর্ডার</span></span>
        </Button>
        {STATUSES.map((status) => (
          <Button key={status.value} type="button" variant={filter === status.value ? "default" : "outline"} className="h-16 justify-start px-3" onClick={() => setFilter(status.value)}>
            <status.icon className="size-5" />
            <span className="text-left"><span className="block text-lg font-bold leading-none">{(counts[status.value] ?? 0).toLocaleString("bn-BD")}</span><span className="text-xs">{status.label}</span></span>
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="নাম, ফোন, ঠিকানা, অর্ডার বা পণ্য খুঁজুন" className="h-10 pl-9" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="স্ট্যাটাস অনুযায়ী দেখুন" className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring">
            <option value="all">সব স্ট্যাটাস</option>
            {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label} ({counts[status.value] ?? 0})</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="অর্ডার সাজান" className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring">
            <option value="newest">নতুন আগে</option>
            <option value="oldest">পুরোনো আগে</option>
            <option value="high">বেশি মূল্য আগে</option>
            <option value="low">কম মূল্য আগে</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-52 place-items-center rounded-lg border border-border bg-card"><span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-5 animate-pulse" /> অর্ডার লোড হচ্ছে...</span></div>
      ) : visible.length === 0 ? (
        <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-border bg-card text-center">
          <div><Package className="mx-auto mb-2 size-8 text-muted-foreground" /><p className="font-semibold">কোনো অর্ডার পাওয়া যায়নি</p><p className="text-xs text-muted-foreground">অন্য স্ট্যাটাস বা শব্দ দিয়ে খুঁজুন</p></div>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => {
            const status = STATUSES.find((item) => item.value === order.status) ?? STATUSES[0];
            const items = Array.isArray(order.items) ? order.items : [];
            const stats = phoneStats(order.phone, order.id);
            const itemCount = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
            const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
            const delivery = Math.max(0, Number(order.total || 0) - subtotal);
            const isOpen = expanded === order.id;

            return (
              <article key={order.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)]">
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,.7fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold">{order.customer_name}</h2>
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${status.color}`}>{status.label}</span>
                      {stats.duplicates > 0 && <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"><AlertTriangle className="size-3" /> আরও {stats.duplicates.toLocaleString("bn-BD")}টি অর্ডার</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"><Phone className="size-3.5" />{order.phone}</a>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{new Date(order.created_at).toLocaleString("bn-BD")}</span>
                      <span className="inline-flex items-center gap-1"><ShoppingBag className="size-3.5" />#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="mt-2 flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" /><span>{order.address}</span></div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2" aria-label={`${itemCount}টি পণ্য`}>
                      {items.slice(0, 4).map((item, index) => (
                        <div key={`${item.id}-${index}`} className="size-11 overflow-hidden rounded-md border-2 border-card bg-secondary">
                          <ProductImage url={item.image_url ?? productImages[item.id]} alt={item.name_bn} width={56} className="size-full object-contain p-1" fallback={<div className="grid size-full place-items-center"><Package className="size-4 text-muted-foreground" /></div>} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{itemCount.toLocaleString("bn-BD")}টি পণ্য</div>
                      <div className="text-lg font-extrabold text-[var(--leaf-deep)]">{money(order.total)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value)} aria-label={`${order.customer_name}-এর স্ট্যাটাস`} className={`h-9 rounded-md border px-2 text-xs font-semibold outline-none ${status.color}`}>
                      {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <Button type="button" variant="outline" size="icon" onClick={() => setExpanded(isOpen ? null : order.id)} aria-label="অর্ডারের বিস্তারিত দেখুন" title="বিস্তারিত">
                      <ChevronDown className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeOrder(order.id)} aria-label="অর্ডার মুছুন" title="মুছুন"><Trash2 /></Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-secondary/30 p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                      <div>
                        <h3 className="mb-2 text-sm font-bold">অর্ডারের পণ্য</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {items.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-md border border-border bg-card p-2.5">
                              <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
                                <ProductImage url={item.image_url ?? productImages[item.id]} alt={item.name_bn} width={80} className="size-full object-contain p-1.5" fallback={<div className="grid size-full place-items-center"><Package className="size-5 text-muted-foreground" /></div>} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold">{item.name_bn}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{Number(item.qty).toLocaleString("bn-BD")} × {money(item.price)}{item.unit ? ` · ${item.unit}` : ""}</div>
                              </div>
                              <div className="shrink-0 text-sm font-bold">{money(item.qty * item.price)}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <aside className="space-y-3">
                        <div className="rounded-md border border-border bg-card p-3">
                          <div className="mb-2 flex items-center gap-2 text-sm font-bold"><TrendingUp className="size-4 text-primary" />ক্রেতার ইতিহাস</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <span>মোট অর্ডার <b className="block text-base">{stats.totalOrders.toLocaleString("bn-BD")}</b></span>
                            <span>সফলতার হার <b className="block text-base">{stats.successPct === null ? "—" : `${stats.successPct}%`}</b></span>
                            <span className="text-green-700">ডেলিভারড <b>{stats.delivered.toLocaleString("bn-BD")}</b></span>
                            <span className="text-red-700">বাতিল <b>{stats.cancelled.toLocaleString("bn-BD")}</b></span>
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3 text-xs">
                          <div className="mb-2 flex items-center gap-2 text-sm font-bold"><Banknote className="size-4 text-primary" />পেমেন্ট হিসাব</div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between"><span className="text-muted-foreground">পণ্যের মূল্য</span><span>{money(subtotal)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">ডেলিভারি চার্জ</span><span>{money(delivery)}</span></div>
                            <div className="flex justify-between border-t border-border pt-1.5 text-sm font-bold"><span>সর্বমোট</span><span>{money(order.total)}</span></div>
                            <div className="pt-1 text-muted-foreground">পদ্ধতি: {order.payment_method === "cod" ? "ক্যাশ অন ডেলিভারি" : order.payment_method}</div>
                          </div>
                        </div>
                      </aside>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}