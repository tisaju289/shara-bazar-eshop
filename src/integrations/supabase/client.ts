import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { cachedRestGet, REST_PREFIX, ANON_BEARER } from '@/lib/rest-cache';

const SUPABASE_URL = "https://cdctsoahehjohgfndsua.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY3Rzb2FoZWhqb2hnZm5kc3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzY2NjAsImV4cCI6MjA5NDgxMjY2MH0.ugKYoL6XP9i_TAqiAFFGQpsKXz4585oduL7-2c8oARU";

/**
 * পাবলিক (anon, লগইন-বিহীন) GET রিড ক্যাশড পথে যায়:
 *  - ব্রাউজারে: worker-এর /api/rest প্রক্সি দিয়ে (এজ ক্যাশ)
 *  - SSR-এ (সার্ভারে): সরাসরি cachedRestGet() (একই এজ ক্যাশ)
 * ফলে লাখ লাখ ভিউতেও Supabase-এ প্রতি কোয়েরিতে ৫ মিনিটে ১টা upstream কল যায়।
 *
 * লগইন সেশন (admin), রাইট, auth, storage কল সরাসরি Supabase-এ যায় —
 * admin সবসময় ফ্রেশ ডেটা দেখে।
 */
function smartFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (
      init?.method ??
        (typeof input === "object" && !(input instanceof URL) ? (input as Request).method : "GET") ??
        "GET"
    ).toUpperCase();
    const headers = new Headers((init?.headers ?? undefined) as HeadersInit | undefined);
    const auth = headers.get("authorization");
    const isAnon = !auth || auth === ANON_BEARER;

    if (method === "GET" && isAnon && url.startsWith(REST_PREFIX)) {
      if (typeof window === "undefined") {
        // SSR: ক্যাশ লজিক সরাসরি ফাংশন কলে (একই worker isolate)
        return cachedRestGet(url, {
          accept: headers.get("accept") || "application/json",
          prefer: headers.get("prefer") ?? undefined,
          acceptProfile: headers.get("accept-profile") ?? undefined,
        }).then((res) => new Response(res.body, res));
      }
      // ব্রাউজার: ক্যাশড প্রক্সি রুট দিয়ে
      const proxy = new URL("/api/rest", window.location.origin);
      proxy.searchParams.set("u", url);
      const prefer = headers.get("prefer");
      if (prefer) proxy.searchParams.set("prefer", prefer);
      const profile = headers.get("accept-profile");
      if (profile) proxy.searchParams.set("accept-profile", profile);

      // Authorization হেডার বাদ — না হলে ব্রাউজার HTTP-ক্যাশ করবে না
      const clean = new Headers();
      const accept = headers.get("accept");
      if (accept) clean.set("accept", accept);
      return fetch(proxy, { method: "GET", headers: clean, signal: init?.signal });
    }
  } catch {
    /* কিছু গরমিল হলে সরাসরি Supabase-এ ফেচ */
  }
  return fetch(input, init);
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: smartFetch },
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
  }
});
