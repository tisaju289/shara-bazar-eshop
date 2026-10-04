import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, ProductCardData } from "@/components/ProductCard";

export function ProductSlider(props: Parameters<typeof SliderRow>[0]) {
  const { display = "slider", rows = 1, products } = props;
  if (display === "grid" || rows <= 1 || products.length === 0) return <SliderRow {...props} />;
  const per = Math.ceil(products.length / rows);
  const chunks = Array.from({ length: rows }, (_, i) => products.slice(i * per, (i + 1) * per)).filter((c) => c.length);
  return (
    <div className="space-y-4">
      {chunks.map((c, i) => <SliderRow key={i} {...props} products={c} />)}
    </div>
  );
}

const BASIS: Record<number, string> = {
  2: "lg:basis-[calc(50%-0.5rem)]", 3: "lg:basis-[calc(33.33%-0.7rem)]", 4: "lg:basis-[calc(25%-0.75rem)]",
  5: "lg:basis-[calc(20%-0.8rem)]", 6: "lg:basis-[calc(16.66%-0.85rem)]", 7: "lg:basis-[calc(14.28%-0.86rem)]", 8: "lg:basis-[calc(12.5%-0.875rem)]",
};

function SliderRow({
  products,
  categories,
  brands,
  cart,
  add,
  sub,
  onBuyNow,
  settings,
  display = "slider",
  rows = 3,
  columns = 5,
}: {
  products: ProductCardData[];
  categories: { id: string; name_bn: string }[];
  brands: { id: string; name_bn: string }[];
  cart: Record<string, number>;
  add: (id: string) => void;
  sub: (id: string) => void;
  onBuyNow: (id: string) => void;
  settings?: any;
  display?: "slider" | "marquee" | "grid";
  rows?: number;
  columns?: number;
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

  // Grid mode: rows × columns, no arrows.
  if (display === "grid") {
    const limited = products.slice(0, rows * columns);
    const colsClass = (() => {
      const c = Math.max(1, Math.min(8, columns));
      // explicit map so tailwind can pick them up
      const map: Record<number, string> = {
        1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3",
        4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6",
        7: "lg:grid-cols-7", 8: "lg:grid-cols-8",
      };
      return map[c] ?? "lg:grid-cols-5";
    })();
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${colsClass} gap-3 md:gap-4`}>
        {limited.map((p, index) => (
          <ProductCard
            key={p.id}
            product={p}
            categoryName={categories.find((c) => c.id === p.category_id)?.name_bn ?? ""}
            brandName={brands.find((b) => b.id === p.brand_id)?.name_bn ?? ""}
            qty={cart[p.id] ?? 0}
            add={add}
            sub={sub}
            onBuyNow={() => onBuyNow(p.id)}
            settings={settings}
            priority={index < 6}
          />
        ))}
      </div>
    );
  }

  // Marquee mode: auto continuous horizontal scroll (CSS animation), no arrows.
  if (display === "marquee") {
    const loop = [...products, ...products];
    return (
      <div className="brand-marquee">
        <div className="brand-marquee-track gap-3 md:gap-4" style={{ animationDuration: `${Math.max(20, products.length * 4)}s` }}>
          {loop.map((p, i) => (
            <div key={`${p.id}-${i}`} className="shrink-0 w-[180px] sm:w-[200px] md:w-[220px] mr-3 md:mr-4">
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
        {products.map((p, index) => (
          <div key={p.id} className={`snap-start shrink-0 basis-[calc(50%-0.4rem)] sm:basis-[calc(33.33%-0.6rem)] md:basis-[calc(25%-0.6rem)] ${BASIS[Math.max(2, Math.min(8, columns))]}`}>
            <ProductCard
              product={p}
              categoryName={categories.find((c) => c.id === p.category_id)?.name_bn ?? ""}
              brandName={brands.find((b) => b.id === p.brand_id)?.name_bn ?? ""}
              qty={cart[p.id] ?? 0}
              add={add}
              sub={sub}
              onBuyNow={() => onBuyNow(p.id)}
              settings={settings}
              priority={index < 4}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
