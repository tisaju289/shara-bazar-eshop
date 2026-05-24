import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Minus, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useCartDrawerController } from "@/hooks/useCartDrawer";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { trackEvent } from "@/lib/tracking";

type DBProduct = {
  id: string;
  name_bn: string;
  unit: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
};

function useProductsForCart() {
  return useQuery({
    queryKey: ["products", "public", "cart"],
    queryFn: async (): Promise<DBProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name_bn,unit,price,image_url,is_active")
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function CartDrawer() {
  const { open: cartOpen, setOpen: setCartOpen } = useCartDrawerController();
  const [cart, setCart] = useCart();
  const { data: products = [] } = useProductsForCart();
  const { data: settings } = useSiteSettings();
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
  const c = settings?.checkout;
  const t = {
    title: c?.title_bn ?? "চেকআউট",
    deliverySection: c?.delivery_section_title_bn ?? "ডেলিভারি এলাকা",
    subtotal: c?.summary_subtotal_bn ?? "সাবটোটাল",
    delivery: c?.summary_delivery_bn ?? "ডেলিভারি",
    total: c?.summary_total_bn ?? "মোট",
    nameLabel: c?.name_label_bn ?? "নাম",
    namePh: c?.name_placeholder_bn ?? "আপনার নাম",
    phoneLabel: c?.phone_label_bn ?? "ফোন নম্বর",
    phonePh: c?.phone_placeholder_bn ?? "01XXXXXXXXX",
    addressLabel: c?.address_label_bn ?? "ঠিকানা",
    addressPh: c?.address_placeholder_bn ?? "পূর্ণ ঠিকানা লিখুন",
    submit: c?.submit_btn_bn ?? "অর্ডার নিশ্চিত করুন",
    placing: c?.placing_btn_bn ?? "অর্ডার হচ্ছে...",
    required: c?.validation_required_bn ?? "সব তথ্য পূরণ করুন",
    successTitle: c?.success_title_bn ?? "ধন্যবাদ! 🎉",
    successMsg: c?.success_message_bn ?? "আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।",
    successClose: c?.success_close_bn ?? "বন্ধ করুন",
  };

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const { [id]: _, ...rest } = c;
      return n > 0 ? { ...c, [id]: n } : rest;
    });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () => Object.entries(cart).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [cart, products],
  );
  const checkoutTotal = useMemo(
    () => Object.entries(checkoutItems).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [checkoutItems, products],
  );
  const grandTotal = checkoutTotal + deliveryCharge;

  const openCheckout = (items: Record<string, number>) => {
    setCheckoutItems(items);
    setOrderDone(false);
    setOrderError(null);
    setCheckoutOpen(true);
    const ids = Object.keys(items);
    trackEvent("InitiateCheckout", {
      value: ids.reduce((s, id) => s + (products.find((p) => p.id === id)?.price ?? 0) * items[id], 0),
      currency: "BDT",
      content_ids: ids,
      content_type: "product",
      num_items: Object.values(items).reduce((a, b) => a + b, 0),
      contents: ids.map((id) => ({ id, quantity: items[id], item_price: products.find((p) => p.id === id)?.price })),
    });
  };

  const placeOrder = async () => {
    setOrderError(null);
    if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.address.trim()) {
      setOrderError(t.required);
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
        id,
        quantity: q,
        item_price: products.find((p) => p.id === id)?.price,
      })),
      phone: orderForm.phone.trim(),
      external_id: orderForm.phone.trim(),
    });
  };

  return (
    <>
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-background flex flex-col shadow-2xl">
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

      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !placing && setCheckoutOpen(false)} />
          <div className="relative bg-background rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            {orderDone ? (
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto size-16 rounded-full grid place-items-center" style={{ background: "var(--gradient-hero)" }}>
                  <CheckCircle2 className="size-9 text-white" />
                </div>
                <h3 className="text-2xl font-extrabold text-[var(--leaf-deep)]">{t.successTitle}</h3>
                <p className="text-sm text-muted-foreground">{t.successMsg}</p>
                <button onClick={() => setCheckoutOpen(false)} className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold">{t.successClose}</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <span className="font-bold text-lg">{t.title}</span>
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
                            <button onClick={() => setCheckoutItems((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))} className="size-7 grid place-items-center">
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-2 border-t border-border text-sm">
                      <span className="text-muted-foreground">{t.subtotal}</span>
                      <span className="font-semibold">৳{checkoutTotal}</span>
                    </div>
                    {deliveryOptions.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.delivery}{deliveryLabel ? ` (${deliveryLabel})` : ""}</span>
                        <span className="font-semibold">৳{deliveryCharge}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border font-bold">
                      <span>{t.total}</span>
                      <span className="text-[var(--leaf-deep)]">৳{grandTotal}</span>
                    </div>
                  </div>
                  {deliveryOptions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">{t.deliverySection}</label>
                      <div className="space-y-2">
                        {deliveryOptions.map((o, i) => (
                          <label key={i} className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition ${deliveryIdx === i ? "border-primary bg-primary/5" : "border-border bg-secondary/40"}`}>
                            <input type="radio" name="delivery-global" checked={deliveryIdx === i} onChange={() => setDeliveryIdx(i)} className="size-4 accent-primary" />
                            <span className="flex-1 text-sm font-semibold">{o.label_bn}</span>
                            <span className="text-sm font-bold text-[var(--leaf-deep)]">৳{o.charge}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">{t.nameLabel}</label>
                    <input value={orderForm.name} onChange={(e) => setOrderForm((f) => ({ ...f, name: e.target.value }))} placeholder={t.namePh} className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">{t.phoneLabel}</label>
                    <input value={orderForm.phone} onChange={(e) => setOrderForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t.phonePh} type="tel" className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">{t.addressLabel}</label>
                    <textarea value={orderForm.address} onChange={(e) => setOrderForm((f) => ({ ...f, address: e.target.value }))} placeholder={t.addressPh} rows={3} className="w-full px-4 py-3 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </div>
                  {orderError && <p className="text-sm text-[var(--chili)]">{orderError}</p>}
                  <button onClick={placeOrder} disabled={placing || Object.keys(checkoutItems).length === 0} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold shadow-[var(--shadow-pop)] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                    {placing ? <><Loader2 className="size-4 animate-spin" /> {t.placing}</> : `${t.submit} · ৳${grandTotal}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}