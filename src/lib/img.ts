// Serve smaller images through Supabase's image transform CDN when possible.
// Falls back to the original URL for non-Supabase (external) images.
export function thumb(url: string | null | undefined, width = 400): string | undefined {
  if (!url) return undefined;
  if (!url.includes("/storage/v1/object/public/")) return url;
  const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  return `${transformed}${transformed.includes("?") ? "&" : "?"}width=${width}&quality=75`;
}
