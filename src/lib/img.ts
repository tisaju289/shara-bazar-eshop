// Image delivery helpers.
// - Supabase storage images go through Supabase's own render/image CDN.
// - Any other remote image is proxied through images.weserv.nl, a free global
//   image CDN that resizes + converts to WebP and caches aggressively.
// Both paths give us small, cached, modern-format images instead of the
// multi-megabyte originals.

const WESERV = "https://images.weserv.nl/?url=";

function isSupabaseStorage(url: string) {
  return url.includes("/storage/v1/object/public/");
}

export function thumb(url: string | null | undefined, width = 400, quality = 75): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  if (isSupabaseStorage(url)) {
    const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    return `${transformed}${transformed.includes("?") ? "&" : "?"}width=${width}&quality=${quality}&resize=contain`;
  }

  if (/^https?:\/\//i.test(url)) {
    const src = url.replace(/^https?:\/\//i, "");
    return `${WESERV}${encodeURIComponent(src)}&w=${width}&q=${quality}&output=webp&we&il`;
  }

  return url;
}

/** Responsive srcset at 1x/2x for a given base width. */
export function thumbSrcSet(url: string | null | undefined, width = 400, quality = 75): string | undefined {
  if (!url) return undefined;
  const a = thumb(url, width, quality);
  const b = thumb(url, width * 2, quality);
  if (!a || !b || a === b) return undefined;
  return `${a} 1x, ${b} 2x`;
}
