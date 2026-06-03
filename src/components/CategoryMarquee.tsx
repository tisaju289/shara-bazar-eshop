import { Link } from "@tanstack/react-router";

type Cat = { id: string; name_bn: string; image_url: string | null };

/**
 * Continuous slow horizontal marquee of category circles.
 * Used on the home page and on top of the products page.
 */
export function CategoryMarquee({
  categories,
  catCounts,
  speedSec = 50,
}: {
  categories: Cat[];
  catCounts?: Record<string, number>;
  speedSec?: number;
}) {
  if (!categories.length) return null;
  const loop = [...categories, ...categories];
  return (
    <div className="brand-marquee">
      <div className="brand-marquee-track" style={{ animationDuration: `${speedSec}s` }}>
        {loop.map((c, i) => (
          <Link
            key={`${c.id}-${i}`}
            to="/cat/$catId"
            params={{ catId: c.id }}
            aria-hidden={i >= categories.length ? true : undefined}
            className="group shrink-0 flex flex-col items-center gap-2 mr-3 md:mr-4 w-[88px] md:w-[110px]"
          >
            <div
              className="size-16 md:size-20 rounded-full grid place-items-center overflow-hidden border-2 border-border group-hover:border-primary group-hover:scale-105 transition shadow-sm"
              style={{ background: "var(--gradient-warm)" }}
            >
              {c.image_url ? (
                <img src={c.image_url} alt={c.name_bn} className="size-full object-cover" />
              ) : (
                <span className="text-2xl">🛒</span>
              )}
            </div>
            <div className="text-[11px] md:text-xs font-semibold text-center leading-tight line-clamp-2">{c.name_bn}</div>
            {catCounts && (
              <div className="text-[10px] text-muted-foreground">{catCounts[c.id] ?? 0} আইটেম</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}