import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, MapPin, Package, Trash2, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
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

const STATUSES = [
  { value: "pending", label: "নতুন", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "confirmed", label: "নিশ্চিত", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "delivered", label: "ডেলিভারড", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "cancelled", label: "বাতিল", color: "bg-red-100 text-red-800 border-red-200" },
];

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as unknown as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", id);
  };

  const removeOrder = async (id: string) => {
    if (!confirm("এই অর্ডারটি মুছে ফেলবেন?")) return;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await supabase.from("orders").delete().eq("id", id);
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = orders.filter((o) => o.status === s.value).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">অর্ডার ম্যানেজমেন্ট</h1>
        <p className="text-muted-foreground text-sm mt-1">মোট {orders.length} টি অর্ডার</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`h-9 px-4 rounded-full text-sm font-semibold border ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
        >
          সব ({orders.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`h-9 px-4 rounded-full text-sm font-semibold border ${filter === s.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
          >
            {s.label} ({counts[s.value] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center h-40">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          কোনো অর্ডার নেই
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const status = STATUSES.find((s) => s.value === o.status) ?? STATUSES[0];
            const isOpen = expanded === o.id;
            const items = Array.isArray(o.items) ? o.items : [];
            return (
              <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{o.customer_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1"><Phone className="size-3" /> {o.phone}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {o.address}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(o.created_at).toLocaleString("bn-BD")} · {o.payment_method === "cod" ? "ক্যাশ অন ডেলিভারি" : o.payment_method}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-[var(--leaf-deep)]">৳{o.total}</div>
                      <div className="text-[10px] text-muted-foreground">{items.length} টি পণ্য</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium inline-flex items-center gap-1"
                    >
                      <Package className="size-4" /> বিস্তারিত <ChevronDown className={`size-4 transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <a
                      href={`tel:${o.phone}`}
                      className="h-9 px-3 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium inline-flex items-center gap-1"
                    >
                      <Phone className="size-4" /> কল
                    </a>
                    <button
                      onClick={() => removeOrder(o.id)}
                      className="h-9 px-3 rounded-lg text-destructive border border-destructive/30 text-sm font-medium inline-flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="size-4" /> মুছুন
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-[var(--cream)]/40 p-4 md:p-5">
                    <div className="space-y-2">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-card rounded-lg px-3 py-2 border border-border">
                          <div>
                            <div className="font-medium">{it.name_bn}</div>
                            <div className="text-xs text-muted-foreground">{it.qty} × ৳{it.price}{it.unit ? ` · ${it.unit}` : ""}</div>
                          </div>
                          <div className="font-semibold">৳{it.qty * it.price}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}