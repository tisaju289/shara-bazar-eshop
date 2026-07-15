import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, Plus, Minus, X, CheckCircle2,
  Home, LayoutGrid, Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { trackEvent } from "@/lib/tracking";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCart } from "@/hooks/useCart";
import { ProductCard } from "@/components/ProductCard";
import { ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "সব পণ্য — তাজা বাজার" },
      { name: "description", content: "সব ক্যাটাগরির সব পণ্য এক জায়গায় দেখুন।" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { q?: string; cat?: string } => {
    const out: { q?: string; cat?: string } = {};
    if (typeof s.q === "string") out.q = s.q;
    if (typeof s.cat === "string") out.cat = s.cat;
    return out;
  },
  component: ProductsPage,
});

type DBProduct = {
  id: string; name_bn: string; unit: string; price: number; old_price: number | null;
  image_url: string | null; tag: string | null; stock: number; is_active: boolean;
  category_id: string | null; brand_id: string | null; keywords: string | null;
  reviews_rating: number | null; reviews_count: number | null; offer_badge: string | null;
};
type DBCategory = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null; keywords: string | null };
type DBBrand = { id: string; name_bn: string };

function useCategories() {
  return useQuery({
    queryKey: ["categories", "public"],
    queryFn: async (): Promise<DBCategory[]> => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}
function useBrands() {
  return useQuery({
    queryKey: ["brands", "public"],
    queryFn: async (): Promise<DBBrand[]> => {
      const { data, error } = await supabase.from("brands").select("id, name_bn").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data as DBBrand[]) ?? [];
    },
  });
}
function useProducts() {
  return useQuery({
    queryKey: ["products", "public"],
    queryFn: async (): Promise<DBProduct[]> => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function ProductsPage() {
  const { q, cat } = Route.useSearch();
  const { data: settings } = useSiteSettings();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: products = [], isLoading: prodLoading } = useProducts();

  const [activeCat, setActiveCat] = useState<string | "all">(cat ?? "all");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");

  // Cart state
  const [cart, setCart] = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<Record<string, number>>({});
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "" });
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const deliveryOptions = (settings?.delivery?.enabled ? settings?.delivery?.options ?? [] : []).filter((o) => o.enabled);
  const [deliveryIdx, setDeliveryIdx] = useState(0);
  const deliveryCharge = deliveryOptions[deliveryIdx]?.charge ?? 0;
  const deliveryLabel = deliveryOptions[deliveryIdx]?.label_bn ?? "";

  // Sync when URL ?cat= changes
  useEffect(() => { setActiveCat(cat ?? "all"); }, [cat]);

  // Fire Search event when there is a query string
  useEffect(() => {
    if (q && q.trim()) {
      trackEvent("Search", { search_string: q.trim() });
    }
  }, [q]);

  const add = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    const p = products.find((x) => x.id === id);
    if (p) {
      trackEvent("AddToCart", {
        value: p.price,
        currency: "BDT",
        content_ids: [id],
        content_name: p.name_bn,
        content_type: "product",
        contents: [{ id, quantity: 1, item_price: p.price }],
      });
    }
  };

  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const { [id]: _, ...rest } = c;
      return n > 0 ? { ...c, [id]: n } : rest;
    });

  const openCheckout = (items: Record<string, number>) => {
    setCheckoutItems(items);
    setOrderDone(false);
    setOrderError(null);
    setCheckoutOpen(true);
    const ids = Object.keys(items);
    const total = ids.reduce((s, id) => s + (products.find((p) => p.id === id)?.price ?? 0) * items[id], 0);
    trackEvent("InitiateCheckout", {
      value: total,
      currency: "BDT",
      content_ids: ids,
      content_type: "product",
      num_items: Object.values(items).reduce((a, b) => a + b, 0),
      contents: ids.map((id) => ({ id, quantity: items[id], item_price: products.find((p) => p.id === id)?.price })),
    });
  };

  const checkoutTotal = useMemo(
    () => Object.entries(checkoutItems).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [checkoutItems, products],
  );
  const grandTotal = checkoutTotal + deliveryCharge;

  const placeOrder = async () => {
    setOrderError(null);
    if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.address.trim()) {
      setOrderError("সব তথ্য পূরণ করুন");
      return;
    }
    setPlacing(true);
    const items = Object.entries(checkoutItems).map(([id, q]) => {
      const p = products.find((x) => x.id === id);
      return { id, name_bn: p?.name_bn, price: p?.price, unit: p?.unit, qty: q };
    });
    const { error } = await (supabase as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string } | null }> } })
      .from("orders")
      .insert({
        customer_name: orderForm.name.trim(),
        phone: orderForm.phone.trim(),
        address: orderForm.address.trim(),
        items,
        total: grandTotal,
        payment_method: "cod",
      });
    setPlacing(false);
    if (error) {
      setOrderError(error.message);
      return;
    }
    setCart((c) => {
      const next = { ...c };
      for (const id of Object.keys(checkoutItems)) delete next[id];
      return next;
    });
    setOrderForm({ name: "", phone: "", address: "" });
    setOrderDone(true);
    trackEvent("Purchase", {
      value: grandTotal,
      currency: "BDT",
      content_ids: Object.keys(checkoutItems),
      content_type: "product",
      num_items: Object.values(checkoutItems).reduce((a, b) => a + b, 0),
      contents: Object.entries(checkoutItems).map(([id, q]) => ({
        id, quantity: q, item_price: products.find((p) => p.id === id)?.price,
      })),
      phone: orderForm.phone.trim(),
      external_id: orderForm.phone.trim(),
    });
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () => Object.entries(cart).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [cart, products],
  );

  const filtered = products.filter((p) => {
    const catOk = activeCat === "all" || p.category_id === activeCat;
    const minOk = !priceMin || p.price >= Number(priceMin);
    const maxOk = !priceMax || p.price <= Number(priceMax);
    if (!minOk || !maxOk) return false;
    if (!q) return catOk;
    const cat = categories.find((c) => c.id === p.category_id);
    const brand = brands.find((b) => b.id === p.brand_id);
    const haystack = [
      p.name_bn,
      p.keywords ?? "",
      p.tag ?? "",
      cat?.name_bn ?? "",
      cat?.keywords ?? "",
      brand?.name_bn ?? "",
    ].join(" ").toLowerCase();
    const tokens = q.toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
    return catOk && tokens.some((t: string) => haystack.includes(t));
  });

  const grouped = useMemo(() => {
    const m: Record<string, DBProduct[]> = {};
    for (const p of filtered) {
      const cid = p.category_id ?? "uncategorized";
      if (!m[cid]) m[cid] = [];
      m[cid].push(p);
    }
    return m;
  }, [filtered]);

  const catOrder = useMemo(() => {
    const ordered = categories.map((c) => c.id);
    if (grouped["uncategorized"]) ordered.push("uncategorized");
    return ordered.filter((id) => grouped[id] && grouped[id].length >= 1);
  }, [categories, grouped]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader cartCount={cartCount} cartTotal={cartTotal} onCartClick={() => setCartOpen(true)} />

      <section className="py-6 md:py-10 pb-24 md:pb-10">
        <div className="container mx-auto px-4 space-y-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)] text-center">
            {q ? `"${q}" এর ফলাফল` : "সব পণ্য"}
          </h1>

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="order-1 lg:sticky lg:top-24 lg:self-start space-y-4">
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-[var(--leaf-deep)]">দামের পরিসর (৳)</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="সর্বনিম্ন"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="সর্বোচ্চ"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                {(priceMin || priceMax || activeCat !== "all") && (
                  <button
                    onClick={() => { setPriceMin(""); setPriceMax(""); setActiveCat("all"); }}
                    className="w-full h-9 rounded-lg bg-secondary text-sm font-semibold hover:bg-secondary/80"
                  >
                    ফিল্টার রিসেট
                  </button>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-[var(--leaf-deep)]">ক্যাটাগরি</h3>
                <div className="space-y-1 max-h-[420px] overflow-y-auto">
                  <button
                    onClick={() => setActiveCat("all")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeCat === "all" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"}`}
                  >
                    সব ({products.length})
                  </button>
                  {categories.map((c) => {
                    const count = products.filter((p) => p.category_id === c.id).length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveCat(c.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between ${activeCat === c.id ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"}`}
                      >
                        <span className="truncate">{c.name_bn}</span>
                        <span className="text-xs opacity-70 ml-2">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div className="min-w-0 order-2">
          {prodLoading ? (
            <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">কোনো পণ্য পাওয়া যায়নি।</p>
          ) : (
            <div className="space-y-10">
              {activeCat === "all" ? (
                catOrder.map((catId) => {
                  const cat = categories.find((c) => c.id === catId);
                  const items = grouped[catId] ?? [];
                  return (
                    <div key={catId} id={`cat-${catId}`} className="scroll-mt-24">
                      <div className="flex items-center justify-center mb-4">
                        <h2 className="text-xl md:text-2xl font-extrabold text-[var(--leaf-deep)] text-center">{cat?.name_bn ?? "অন্যান্য"}</h2>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                        {items.map((p) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            categoryName={cat?.name_bn ?? ""}
                            brandName={brands.find((b) => b.id === p.brand_id)?.name_bn ?? ""}
                            qty={cart[p.id] ?? 0}
                            add={add}
                            sub={sub}
                            onBuyNow={() => openCheckout({ [p.id]: Math.max(cart[p.id] ?? 0, 1) })}
                            settings={settings?.product_card}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                  {filtered.map((p) => {
                    const catName = categories.find((c) => c.id === p.category_id)?.name_bn ?? "";
                    const brandName = brands.find((b) => b.id === p.brand_id)?.name_bn ?? "";
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        categoryName={catName}
                        brandName={brandName}
                        qty={cart[p.id] ?? 0}
                        add={add}
                        sub={sub}
                        onBuyNow={() => openCheckout({ [p.id]: Math.max(cart[p.id] ?? 0, 1) })}
                        settings={settings?.product_card}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
            </div>

          </div>
        </div>
      </section>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <aside className="absolute inset-x-3 bottom-3 top-auto max-h-[85vh] rounded-3xl overflow-hidden sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-96 sm:max-h-none sm:rounded-none bg-background flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-bold text-lg">আপনার কার্ট ({cartCount})</span>
              <button onClick={() => setCartOpen(false)}><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 space-y-3">
              {cartCount === 0 && <p className="text-center text-muted-foreground mt-10 text-sm">আপনার কার্ট খালি 🛒</p>}
              {Object.entries(cart).map(([id, q]) => {
                const p = products.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex gap-3 items-center bg-card border border-border rounded-2xl p-2">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name_bn} className="size-14 rounded-xl object-contain" style={{ background: "var(--gradient-warm)" }} />
                    ) : (
                      <div className="size-14 rounded-xl grid place-items-center text-2xl" style={{ background: "var(--gradient-warm)" }}>🛒</div>
                    )}
                    <div className="flex-1 text-sm">
                      <div className="font-semibold leading-tight">{p.name_bn}</div>
                      <div className="text-xs text-muted-foreground">৳{p.price} × {q}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-secondary rounded-lg">
                      <button onClick={() => sub(id)} className="size-7 grid place-items-center"><Minus className="size-3.5" /></button>
                      <span className="text-sm font-bold w-5 text-center">{q}</span>
                      <button onClick={() => add(id)} className="size-7 grid place-items-center"><Plus className="size-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {cartCount > 0 && (
              <div className="p-4 pb-24 md:pb-4 border-t border-border space-y-3 bg-background">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">মোট</span>
                  <span className="font-extrabold text-lg">৳{cartTotal}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); openCheckout(cart); }}
                  className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-pop)]"
                >
                  চেকআউট করুন
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !placing && setCheckoutOpen(false)} />
          <div className="relative bg-background rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            {orderDone ? (
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto size-16 rounded-full grid place-items-center" style={{ background: "var(--gradient-hero)" }}>
                  <CheckCircle2 className="size-9 text-white" />
                </div>
                <h3 className="text-2xl font-extrabold text-[var(--leaf-deep)]">ধন্যবাদ! 🎉</h3>
                <p className="text-sm text-muted-foreground">আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                <button onClick={() => setCheckoutOpen(false)} className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold">বন্ধ করুন</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <span className="font-bold text-lg">চেকআউট</span>
                  <button onClick={() => !placing && setCheckoutOpen(false)}><X className="size-5" /></button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-secondary/50 rounded-2xl p-3 space-y-3">
                    {Object.entries(checkoutItems).map(([id, q]) => {
                      const p = products.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} className="flex gap-3 items-center bg-card border border-border rounded-2xl p-2">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name_bn} className="size-14 rounded-xl object-contain shrink-0" style={{ background: "var(--gradient-warm)" }} />
                          ) : (
                            <div className="size-14 rounded-xl grid place-items-center text-2xl shrink-0" style={{ background: "var(--gradient-warm)" }}>🛒</div>
                          )}
                          <div className="flex-1 min-w-0 text-sm">
                            <div className="font-semibold leading-tight truncate">{p.name_bn}</div>
                            <div className="text-xs text-muted-foreground">৳{p.price} · ৳{p.price * q}</div>
                          </div>
                          <div className="flex items-center gap-1 bg-secondary rounded-lg shrink-0">
                            <button
                              onClick={() =>
                                setCheckoutItems((prev) => {
                                  const next = { ...prev };
                                  const nq = (next[id] ?? 0) - 1;
                                  if (nq <= 0) delete next[id];
                                  else next[id] = nq;
                                  return next;
                                })
                              }
                              className="size-7 grid place-items-center"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="text-sm font-bold w-5 text-center">{q}</span>
                            <button
                              onClick={() => setCheckoutItems((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))}
                              className="size-7 grid place-items-center"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-2 border-t border-border text-sm">
                      <span className="text-muted-foreground">সাবটোটাল</span>
                      <span className="font-semibold">৳{checkoutTotal}</span>
                    </div>
                    {deliveryOptions.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ডেলিভারি{deliveryLabel ? ` (${deliveryLabel})` : ""}</span>
                        <span className="font-semibold">৳{deliveryCharge}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border font-bold">
                      <span>মোট</span>
                      <span className="text-[var(--leaf-deep)]">৳{grandTotal}</span>
                    </div>
                  </div>
                  {deliveryOptions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">ডেলিভারি এলাকা</label>
                      <div className="space-y-2">
                        {deliveryOptions.map((o, i) => (
                          <label key={i} className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition ${deliveryIdx === i ? "border-primary bg-primary/5" : "border-border bg-secondary/40"}`}>
                            <input type="radio" name="delivery-products" checked={deliveryIdx === i} onChange={() => setDeliveryIdx(i)} className="size-4 accent-primary" />
                            <span className="flex-1 text-sm font-semibold">{o.label_bn}</span>
                            <span className="text-sm font-bold text-[var(--leaf-deep)]">৳{o.charge}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">নাম</label>
                    <input
                      value={orderForm.name}
                      onChange={(e) => setOrderForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="আপনার নাম"
                      className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">ফোন নম্বর</label>
                    <input
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="01XXXXXXXXX"
                      type="tel"
                      className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">ঠিকানা</label>
                    <textarea
                      value={orderForm.address}
                      onChange={(e) => setOrderForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="পূর্ণ ঠিকানা লিখুন"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl p-3">
                    <div className="size-5 rounded-full bg-primary grid place-items-center">
                      <div className="size-2 rounded-full bg-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">ক্যাশ অন ডেলিভারি</div>
                      <div className="text-[11px] text-muted-foreground">পণ্য পেয়ে টাকা পরিশোধ করুন</div>
                    </div>
                  </div>
                  {orderError && <p className="text-sm text-[var(--chili)]">{orderError}</p>}
                  <button
                    onClick={placeOrder}
                    disabled={placing || Object.keys(checkoutItems).length === 0}
                    className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold shadow-[var(--shadow-pop)] inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {placing ? <><Loader2 className="size-4 animate-spin" /> অর্ডার হচ্ছে...</> : `অর্ডার নিশ্চিত করুন · ৳${grandTotal}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
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
          <button onClick={() => setCartOpen(true)} className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground hover:text-primary transition min-w-[64px] relative">
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-0.5 size-4 rounded-full bg-[var(--chili)] text-white text-[9px] grid place-items-center font-bold">{cartCount}</span>
            )}
            <span className="text-[10px] font-medium">কার্ট</span>
          </button>
        </div>
      </nav>

    </div>
  );
}

