import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type PlaceOrderInput = {
  name: string;
  phone: string;
  address: string;
  items: { id: string; qty: number }[];
  delivery_index?: number;
};

function serverClient() {
  return createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_PUBLISHABLE_KEY'] || process.env['SUPABASE_ANON_KEY']!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: PlaceOrderInput) => {
    const name = String(input?.name ?? "").trim();
    const phone = String(input?.phone ?? "").trim();
    const address = String(input?.address ?? "").trim();
    const items = (input?.items ?? [])
      .map((i) => ({ id: String(i.id), qty: Math.max(1, Math.min(999, Math.floor(Number(i.qty) || 0))) }))
      .filter((i) => i.id);
    if (!name || !phone || !address) throw new Error("সব তথ্য পূরণ করুন");
    if (items.length === 0) throw new Error("কার্ট খালি");
    if (items.length > 100) throw new Error("অনেক বেশি আইটেম");
    return {
      name: name.slice(0, 120),
      phone: phone.slice(0, 30),
      address: address.slice(0, 2000),
      items,
      delivery_index: Math.max(0, Math.floor(Number(input?.delivery_index) || 0)),
    };
  })
  .handler(async ({ data }) => {
    const sb = serverClient();

    // Prices always come from the database, never from the browser.
    const ids = [...new Set(data.items.map((i) => i.id))];
    const { data: products, error: pErr } = await sb
      .from("products")
      .select("id,name_bn,unit,price,is_active")
      .in("id", ids)
      .eq("is_active", true);
    if (pErr) throw new Error(pErr.message);

    const byId = new Map((products ?? []).map((p: any) => [p.id, p]));
    const items = data.items
      .filter((i) => byId.has(i.id))
      .map((i) => {
        const p: any = byId.get(i.id);
        return { id: p.id, name_bn: p.name_bn, price: Number(p.price), unit: p.unit, qty: i.qty };
      });
    if (items.length === 0) throw new Error("পণ্য পাওয়া যায়নি");

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

    // Delivery charge is resolved from settings, not from client input.
    let delivery = 0;
    const { data: setting } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", "delivery")
      .maybeSingle();
    const cfg: any = (setting as any)?.value ?? {};
    if (cfg?.enabled) {
      const options = (cfg.options ?? []).filter((o: any) => o?.enabled);
      delivery = Number(options[data.delivery_index]?.charge ?? options[0]?.charge ?? 0) || 0;
    }

    const total = subtotal + delivery;

    const { error } = await sb.from("orders").insert({
      customer_name: data.name,
      phone: data.phone,
      address: data.address,
      items,
      total,
      payment_method: "cod",
    });
    if (error) throw new Error(error.message);

    return { ok: true, total, subtotal, delivery };
  });
