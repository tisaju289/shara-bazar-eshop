/**
 * ক্যাশড Supabase REST GET — worker-এর ভেতরে যেখান থেকেই ডাকা হোক
 * (SSR ফেচ বা /api/rest প্রক্সি) একই ৩-স্তরের ক্যাশ ব্যবহার করে:
 *
 *   ১) isolate মেমরি (৬০ সেকেন্ড)
 *   ২) Cloudflare Cache API — এজ ক্যাশ (৫ মিনিট)
 *   ৩) upstream Supabase (anon key, RLS-অনুরূপ)
 *
 * রাইট/auth/storage কল কখনো এখানে আসে না।
 */

const SUPABASE_URL = "https://cdctsoahehjohgfndsua.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY3Rzb2FoZWhqb2hnZm5kc3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzY2NjAsImV4cCI6MjA5NDgxMjY2MH0.ugKYoL6XP9i_TAqiAFFGQpsKXz4585oduL7-2c8oARU";

export const REST_PREFIX = `${SUPABASE_URL}/rest/v1/`;
export const ANON_BEARER = `Bearer ${SUPABASE_ANON_KEY}`;

const MEM_TTL_MS = 60_000; // স্তর ১: isolate মেমরি
const EDGE_TTL_S = 300; // স্তর ২+ব্রাউজার: ৫ মিনিট
const STORE_TTL_S = 86_400; // Cache API এনভেলপ স্টোর (বয়স আলাদা করে চেক হয়)

type Envelope = {
  t: number;
  status: number;
  contentType: string;
  contentRange: string | null;
  body: string;
};

const mem = new Map<string, Envelope>();

function respond(env: Envelope, extraHeaders?: Record<string, string>): Response {
  return new Response(env.body, {
    status: env.status,
    headers: {
      "content-type": env.contentType,
      ...(env.contentRange ? { "content-range": env.contentRange } : {}),
      "cache-control": `public, max-age=${EDGE_TTL_S}`,
      ...extraHeaders,
    },
  });
}

/**
 * anon-key GET রিড ক্যাশসহ আনে। `fromProxy=true` হলে রেসপন্সে x-cache
 * হেডার যোগ হয় (ডিবাগিং সুবিধার জন্য)।
 */
export async function cachedRestGet(
  target: string,
  init: { accept?: string; prefer?: string; acceptProfile?: string; fromProxy?: boolean } = {},
): Promise<Response> {
  const key = `cached-rest:${init.prefer ?? ""}|${init.acceptProfile ?? ""}|${target}`;

  // ১) মেমরি ক্যাশ
  const m = mem.get(key);
  if (m && Date.now() - m.t < MEM_TTL_MS) {
    return respond(m, init.fromProxy ? { "x-cache": "mem" } : undefined);
  }

  // ২) Cloudflare Cache API (এজ)
  const edgeCache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  if (edgeCache) {
    try {
      const hit = await edgeCache.match(new Request(key, { method: "GET" }));
      if (hit) {
        const env = JSON.parse(await hit.text()) as Envelope;
        if (env?.body && Date.now() - env.t < EDGE_TTL_S * 1000) {
          mem.set(key, env);
          return respond(env, init.fromProxy ? { "x-cache": "edge" } : undefined);
        }
      }
    } catch {
      /* ক্যাশ মিস হিসেবে ধরা হয় */
    }
  }

  // ৩) upstream Supabase
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    authorization: ANON_BEARER,
    accept: init.accept || "application/json",
  };
  if (init.prefer) headers.prefer = init.prefer;
  if (init.acceptProfile) headers["accept-profile"] = init.acceptProfile;

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers, signal: AbortSignal.timeout(10_000) });
  } catch {
    return new Response(JSON.stringify({ message: "upstream timeout" }), {
      status: 504,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  const env: Envelope = {
    t: Date.now(),
    status: upstream.status,
    contentType: upstream.headers.get("content-type") || "application/json",
    contentRange: upstream.headers.get("content-range"),
    body: await upstream.text(),
  };

  if (upstream.ok) {
    mem.set(key, env);
    if (edgeCache) {
      try {
        await edgeCache.put(
          new Request(key, { method: "GET" }),
          new Response(JSON.stringify(env), {
            headers: {
              "content-type": "application/json",
              "cache-control": `public, max-age=${STORE_TTL_S}`,
            },
          }),
        );
      } catch {
        /* ক্যাশ রাইট ফেইল হলে সরাসরি সার্ভ হয় */
      }
    }
  }
  return respond(env, init.fromProxy ? { "x-cache": "miss" } : undefined);
}
