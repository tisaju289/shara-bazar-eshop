import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryCard } from "@/components/CategoryCard";

type Cat = { id: string; name_bn: string; image_url: string | null };

/**
 * Horizontal row of category cards (shared CategoryCard design — square
 * full-bleed image + pill label straddling the bottom edge). Manual slide only.
 */
export function CategoryMarquee({
  categories,
}: {
  categories: Cat[];
  /** kept for API compatibility — item counts are no longer displayed */
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
        className="flex gap-4 md:gap-5 overflow-x-auto scroll-smooth pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((c, i) => (
          <CategoryCard
            key={`${c.id}-${i}`}
            id={c.id}
            name_bn={c.name_bn}
            image_url={c.image_url}
            className="shrink-0 w-[150px] sm:w-[175px] md:w-[205px] lg:w-[230px]"
          />
        ))}
      </div>
    </div>
  );
}
