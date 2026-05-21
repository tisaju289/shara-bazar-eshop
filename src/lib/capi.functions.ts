import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

type CapiInput = {
  event_name: string;
  event_id: string;
  event_source_url?: string;
  user_agent?: string;
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  contents?: { id: string; quantity: number; item_price?: number }[];
  num_items?: number;
  email?: string;
  phone?: string;
  external_id?: string;
  fbp?: string;
  fbc?: string;
};

function sha256(v?: string) {
  if (!v) return undefined;
  return createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

export const sendMetaCapi = createServerFn({ method: "POST" })
  .inputValidator((input: CapiInput) => input)
  .handler(async ({ data }) => {
    // Load tracking config from site_settings (publishable key is fine; the
    // row is publicly readable but the token only powers server-side calls).
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, key);
    const { data: row } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", "tracking")
      .maybeSingle();
    const cfg = (row?.value ?? {}) as {
      enabled?: boolean;
      meta_pixel_id?: string;
      meta_capi_token?: string;
      meta_test_event_code?: string;
    };
    if (!cfg.enabled || !cfg.meta_pixel_id || !cfg.meta_capi_token) {
      return { ok: false, skipped: true };
    }

    const req = (globalThis as { request?: Request }).request;
    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req?.headers.get("cf-connecting-ip") ||
      undefined;

    const payload = {
      data: [
        {
          event_name: data.event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: data.event_id,
          event_source_url: data.event_source_url,
          action_source: "website",
          user_data: {
            em: data.email ? [sha256(data.email)] : undefined,
            ph: data.phone ? [sha256(data.phone.replace(/\D/g, ""))] : undefined,
            external_id: data.external_id ? [sha256(data.external_id)] : undefined,
            client_ip_address: ip,
            client_user_agent: data.user_agent,
            fbp: data.fbp,
            fbc: data.fbc,
          },
          custom_data: {
            value: data.value,
            currency: data.currency,
            content_ids: data.content_ids,
            content_name: data.content_name,
            content_type: data.content_type,
            contents: data.contents,
            num_items: data.num_items,
          },
        },
      ],
      ...(cfg.meta_test_event_code ? { test_event_code: cfg.meta_test_event_code } : {}),
    };

    const endpoint = `https://graph.facebook.com/v19.0/${cfg.meta_pixel_id}/events?access_token=${encodeURIComponent(
      cfg.meta_capi_token,
    )}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Meta CAPI error", res.status, body);
      return { ok: false, error: body };
    }
    return { ok: true, response: body };
  });