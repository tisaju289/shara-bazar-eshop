import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, ProductCardData } from "@/components/ProductCard";

export function ProductSlider({
  products,
  categories,
  brands,
  cart,
  add,
  sub,
  onBuyNow,
  settings,
}: {
  products: ProductCardData[];
  categories: { id: string; name_bn: string }[];
  brands: { id: string; name_bn: string }[];
  cart: Record<string, number>;
  add: (id: string) => void;
  sub: (id: string) => void;
  onBuyNow: (id: string) => void;
  settings?: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [products.length]);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (!products.length) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={!canPrev}
        aria-label="prev"
        className="grid absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 md:-translate-x-1/2 z-10 size-9 md:size-10 rounded-full bg-white shadow-[var(--shadow-pop)] border border-border place-items-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={!canNext}
        aria-label="next"
        className="grid absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 md:translate-x-1/2 z-10 size-9 md:size-10 rounded-full bg-white shadow-[var(--shadow-pop)] border border-border place-items-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="size-5" />
      </button>
      <div
        ref={ref}
        className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <div key={p.id} className="snap-start shrink-0 basis-[calc(50%-0.4rem)] sm:basis-[calc(33.33%-0.6rem)] md:basis-[calc(25%-0.6rem)] lg:basis-[calc(20%-0.7rem)]">
            <ProductCard
              product={p}
              categoryName={categories.find((c) => c.id === p.category_id)?.name_bn ?? ""}
              brandName={brands.find((b) => b.id === p.brand_id)?.name_bn ?? ""}
              qty={cart[p.id] ?? 0}
              add={add}
              sub={sub}
              onBuyNow={() => onBuyNow(p.id)}
              settings={settings}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
