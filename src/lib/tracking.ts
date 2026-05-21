// Client-side tracking dispatcher.
// Fires events to Meta Pixel (fbq), GA4/Google Ads (gtag), GTM dataLayer,
// and TikTok Pixel (ttq). Also calls Meta Conversions API via server fn
// for high-value events (Purchase, InitiateCheckout, AddToCart, Lead).

import { sendMetaCapi } from "./capi.functions";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (name: string, data?: unknown) => void; page: () => void };
    dataLayer?: unknown[];
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxxxxxx4xxxyxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getFbp(): string | undefined {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
  return m?.[1];
}
function getFbc(): string | undefined {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/);
  if (m) return m[1];
  // fallback: build from ?fbclid=
  const url = new URL(window.location.href);
  const fbclid = url.searchParams.get("fbclid");
  if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
}

export type EventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead"
  | "Search";

export type EventPayload = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: "product" | "product_group";
  contents?: { id: string; quantity: number; item_price?: number }[];
  num_items?: number;
  search_string?: string;
  // user data (for CAPI hashing server-side)
  email?: string;
  phone?: string;
  external_id?: string;
};

const TTQ_MAP: Record<string, string> = {
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
  ViewContent: "ViewContent",
  Lead: "SubmitForm",
  Search: "Search",
  PageView: "Pageview",
};

export function trackEvent(name: EventName, data: EventPayload = {}) {
  if (typeof window === "undefined") return;
  const eventId = uuid();
  const currency = data.currency ?? "BDT";
  const value = data.value;

  // Meta Pixel
  try {
    if (window.fbq) {
      window.fbq("track", name, { ...data, currency, value }, { eventID: eventId });
    }
  } catch (e) { console.warn("fbq error", e); }

  // GA4 / Google Ads via gtag
  try {
    if (window.gtag) {
      const gaMap: Record<string, string> = {
        Purchase: "purchase",
        AddToCart: "add_to_cart",
        InitiateCheckout: "begin_checkout",
        ViewContent: "view_item",
        Search: "search",
        Lead: "generate_lead",
        PageView: "page_view",
      };
      const gaName = gaMap[name] ?? name.toLowerCase();
      window.gtag("event", gaName, {
        currency,
        value,
        transaction_id: name === "Purchase" ? eventId : undefined,
        items: data.contents?.map((c) => ({
          item_id: c.id, quantity: c.quantity, price: c.item_price,
        })),
      });
    }
  } catch (e) { console.warn("gtag error", e); }

  // TikTok Pixel
  try {
    if (window.ttq) {
      const tt = TTQ_MAP[name] ?? name;
      window.ttq.track(tt, { value, currency, contents: data.contents });
    }
  } catch (e) { console.warn("ttq error", e); }

  // GTM dataLayer
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, eventId, ...data, currency, value });
  } catch (e) { console.warn("dataLayer error", e); }

  // Meta CAPI (server-side) — fire for high-value events
  const CAPI_EVENTS: EventName[] = ["Purchase", "InitiateCheckout", "AddToCart", "Lead", "ViewContent"];
  if (CAPI_EVENTS.includes(name)) {
    const fbp = getFbp();
    const fbc = getFbc();
    sendMetaCapi({
      data: {
        event_name: name,
        event_id: eventId,
        event_source_url: window.location.href,
        user_agent: navigator.userAgent,
        value, currency,
        content_ids: data.content_ids,
        content_name: data.content_name,
        content_type: data.content_type,
        contents: data.contents,
        num_items: data.num_items,
        email: data.email,
        phone: data.phone,
        external_id: data.external_id,
        fbp, fbc,
      },
    }).catch((e) => console.warn("CAPI error", e));
  }
}

export function trackPageView() {
  trackEvent("PageView");
}