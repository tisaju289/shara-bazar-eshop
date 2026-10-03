// Image delivery helpers.
// - Supabase storage images go through Supabase's own render/image CDN
//   (resized + WebP + edge cached).
// - Other remote images are loaded directly from their origin. We previously
//   proxied them through images.weserv.nl, but that free proxy rate-limits
//   and rejects many hosts, which left brand/category images broken. Direct
//   loading is reliable; browsers cache them per-origin.

function isSupabaseStorage(url: string) {
  return url.includes("/storage/v1/object/public/");
}

export function thumb(url: string | null | undefined, width = 400, quality = 70): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  if (isSupabaseStorage(url)) {
    const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    return `${transformed}${transformed.includes("?") ? "&" : "?"}width=${width}&quality=${quality}&resize=contain&format=webp`;
  }

  return url;
}

/** Responsive srcset at 1x/2x for a given base width (Supabase images only). */
export function thumbSrcSet(url: string | null | undefined, width = 400, quality = 80): string | undefined {
  if (!url) return undefined;
  const a = thumb(url, width, quality);
  const b = thumb(url, width * 2, quality);
  if (!a || !b || a === b) return undefined;
  return `${a} 1x, ${b} 2x`;
}
