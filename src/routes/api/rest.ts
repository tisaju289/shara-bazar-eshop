import { createFileRoute } from "@tanstack/react-router";
import { cachedRestGet, REST_PREFIX } from "@/lib/rest-cache";

/**
 * ক্যাশড Supabase REST প্রক্সি।
 *
 * ব্রাউজারের পাবলিক (anon key) GET রিডগুলো এখান দিয়ে যায়:
 *   /api/rest?u=<encoded supabase rest url>
 *
 * ফলে হাজার হাজার ভিজিটর থাকলেও Supabase-এ একই কোয়েরি প্রতি ৫ মিনিটে
 * মাত্র ১বার যায় — বাকিটা Cloudflare এজ ক্যাশ + ব্রাউজার ক্যাশ সার্ভ করে।
 * ক্যাশ লজিক src/lib/rest-cache.ts-এ — SSR ফেচও একই লজিক ব্যবহার করে।
 *
 * শুধু নিজের Supabase REST URL-ই প্রক্সি হয় — ওপেন প্রক্সি না।
 */

export const Route = createFileRoute("/api/rest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const target = u.searchParams.get("u") ?? "";
        if (!target.startsWith(REST_PREFIX)) {
          return new Response("bad request", { status: 400, headers: { "cache-control": "no-store" } });
        }
        return cachedRestGet(target, {
          accept: request.headers.get("accept") || "application/json",
          prefer: u.searchParams.get("prefer") ?? undefined,
          acceptProfile: u.searchParams.get("accept-profile") ?? undefined,
          fromProxy: true,
        });
      },
    },
  },
});
