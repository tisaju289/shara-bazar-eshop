import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** PNG rendition of a remote/storage image at a given square size. */
function icon(url: string, size: number): string {
  if (url.includes("/storage/v1/object/public/")) {
    const t = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    return `${t}${t.includes("?") ? "&" : "?"}width=${size}&height=${size}&quality=85&resize=contain`;
  }
  if (/^https?:\/\//i.test(url)) {
    const src = url.replace(/^https?:\/\//i, "");
    return `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=${size}&h=${size}&fit=contain&cbg=white&output=png`;
  }
  return url;
}

export const Route = createFileRoute("/api/public/manifest")({
  server: {
    handlers: {
      GET: async () => {
        let name = "তাজা বাজার";
        let short = name;
        let description = "";
        let logo = "";

        try {
          const { data } = await (supabase as any)
            .from("site_settings")
            .select("key,value")
            .in("key", ["brand", "seo"]);
          const map: any = {};
          for (const row of (data ?? []) as { key: string; value: any }[]) map[row.key] = row.value;
          name = map.seo?.title || map.brand?.name_bn || name;
          short = map.brand?.name_bn || name;
          description = map.seo?.description || map.brand?.tagline_bn || "";
          logo = map.brand?.logo_url || map.seo?.favicon_url || map.seo?.og_image || "";
        } catch {
          /* fall back to defaults */
        }

        const icons = logo
          ? [
              { src: icon(logo, 192), sizes: "192x192", type: "image/png", purpose: "any" },
              { src: icon(logo, 512), sizes: "512x512", type: "image/png", purpose: "any" },
              { src: icon(logo, 512), sizes: "512x512", type: "image/png", purpose: "maskable" },
            ]
          : [
              { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
              { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
              { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ];

        const manifest = {
          name,
          short_name: short.length > 12 ? short.slice(0, 12) : short,
          description,
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#ffffff",
          theme_color: "#16a34a",
          icons,
        };

        return new Response(JSON.stringify(manifest), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "public, max-age=300, s-maxage=300",
          },
        });
      },
    },
  },
});
