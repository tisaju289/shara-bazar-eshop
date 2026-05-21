import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, MapPin, Trash2, ChevronDown } from "lucide-react";

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

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="size-6 animate-spin inline text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">কোনো অর্ডার নেই</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="p-3 font-semibold">ক্রেতা</th>
                  <th className="p-3 font-semibold hidden md:table-cell">ফোন</th>
                  <th className="p-3 font-semibold hidden lg:table-cell">ঠিকানা</th>
                  <th className="p-3 font-semibold hidden sm:table-cell">পণ্য</th>
                  <th className="p-3 font-semibold">মোট</th>
                  <th className="p-3 font-semibold">স্ট্যাটাস</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const status = STATUSES.find((s) => s.value === o.status) ?? STATUSES[0];
                  const isOpen = expanded === o.id;
                  const items = Array.isArray(o.items) ? o.items : [];
                  return (
                    <React.Fragment key={o.id}>
                      <tr className="border-t border-border hover:bg-secondary/30">
                        <td className="p-3">
                          <div className="font-semibold">{o.customer_name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(o.created_at).toLocaleString("bn-BD")}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">
                          <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                            <Phone className="size-3" /> {o.phone}
                          </a>
                        </td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell max-w-[220px]">
                          <span className="inline-flex items-start gap-1"><MapPin className="size-3 mt-0.5 shrink-0" /> <span className="truncate">{o.address}</span></span>
                        </td>
                        <td className="p-3 hidden sm:table-cell">{items.length}</td>
                        <td className="p-3 font-bold text-[var(--leaf-deep)]">৳{o.total}</td>
                        <td className="p-3">
                          <select
                            value={o.status}
                            onChange={(e) => updateStatus(o.id, e.target.value)}
                            className={`h-8 px-2 rounded-md border text-xs font-medium ${status.color}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setExpanded(isOpen ? null : o.id)}
                              className="size-8 rounded-lg hover:bg-secondary grid place-items-center"
                              title="বিস্তারিত"
                            >
                              <ChevronDown className={`size-4 transition ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            <button
                              onClick={() => removeOrder(o.id)}
                              className="size-8 rounded-lg hover:bg-destructive/10 text-destructive grid place-items-center"
                              title="মুছুন"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[var(--cream)]/40">
                          <td colSpan={7} className="p-4">
                            <div className="md:hidden text-xs text-muted-foreground mb-3 space-y-1">
                              <div className="inline-flex items-center gap-1"><Phone className="size-3" /> {o.phone}</div>
                              <div className="flex items-start gap-1"><MapPin className="size-3 mt-0.5 shrink-0" /> {o.address}</div>
                              <div>{o.payment_method === "cod" ? "ক্যাশ অন ডেলিভারি" : o.payment_method}</div>
                            </div>
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}