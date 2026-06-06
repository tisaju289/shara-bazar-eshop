import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Cat = { id: string; name_bn: string; image_url: string | null };

/**
 * Horizontal row of category circles with prev/next arrows.
 * Manual slide only — no auto marquee.
 */
export function CategoryMarquee({
  categories,
  catCounts,
}: {
  categories: Cat[];
  catCounts?: Record<string, number>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  if (!categories.length) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="prev"
        className="grid absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 md:-translate-x-1/2 z-10 size-9 md:size-10 rounded-full bg-white shadow-[var(--shadow-pop)] border border-border place-items-center hover:bg-secondary"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="next"
        className="grid absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 md:translate-x-1/2 z-10 size-9 md:size-10 rounded-full bg-white shadow-[var(--shadow-pop)] border border-border place-items-center hover:bg-secondary"
      >
        <ChevronRight className="size-5" />
      </button>
      <div
        ref={ref}
        className="flex overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((c, i) => (
          <Link
            key={`${c.id}-${i}`}
            to="/cat/$catId"
            params={{ catId: c.id }}
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