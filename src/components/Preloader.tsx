import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const BRAND_CACHE_KEY = "ff_brand_cache_v1";

function readCachedBrand(): { name_bn?: string; logo_url?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BRAND_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Full-screen preloader shown while site settings (brand/logo) load on
 * the very first paint. Fades out once data is ready.
 */
export function Preloader() {
  const { data, isLoading } = useSiteSettings();
  const [hidden, setHidden] = useState(false);
  const [fading, setFading] = useState(false);
  const [cachedBrand] = useState(() => readCachedBrand());

  useEffect(() => {
    if (data?.brand) {
      try {
        window.localStorage.setItem(
          BRAND_CACHE_KEY,
          JSON.stringify({ name_bn: data.brand.name_bn, logo_url: data.brand.logo_url }),
        );
      } catch {}
    }
  }, [data]);

  useEffect(() => {
    const minDelay = setTimeout(() => {
      if (!isLoading) setFading(true);
    }, 600);
    return () => clearTimeout(minDelay);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setFading(true), 400);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  useEffect(() => {
    if (fading) {
      const t = setTimeout(() => setHidden(true), 500);
      return () => clearTimeout(t);
    }
  }, [fading]);

  if (hidden) return null;
  const brand = data?.brand ?? cachedBrand;

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-500 ${fading ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-3xl blur-2xl opacity-60 animate-pulse"
            style={{ background: "var(--gradient-hero)" }}
          />
          {brand?.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.name_bn || "logo"}
              className="relative size-20 rounded-3xl object-contain bg-white p-2 shadow-[var(--shadow-pop)] animate-[scale-in_0.4s_ease-out]"
            />
          ) : (
            <div
              className="relative size-20 rounded-3xl grid place-items-center text-primary-foreground shadow-[var(--shadow-pop)]"
              style={{ background: "var(--gradient-hero)" }}
            >
              <Leaf className="size-10" />
            </div>
          )}
        </div>
        {brand?.name_bn && (
          <div className="text-lg font-[family-name:var(--font-display)] font-extrabold text-[var(--leaf-deep)]">
            {brand.name_bn}
          </div>
        )}
        <div className="flex gap-1.5 mt-1">
          <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}