import { Link } from "@tanstack/react-router";
import { thumb } from "@/lib/img";

type CategoryCardProps = {
  id: string;
  name_bn: string;
  image_url: string | null;
  /** extra sizing classes for the square wrapper (e.g. w-full or fixed widths) */
  className?: string;
};

/**
 * Category card — square full-bleed image with a dark-brown pill label
 * centered on the card's bottom edge (the pill half-hangs below the image).
 * Shared by the home page marquee and the "সব ক্যাটাগরি" page.
 */
export function CategoryCard({ id, name_bn, image_url, className = "" }: CategoryCardProps) {
  return (
    <Link
      to="/cat/$catId"
      params={{ catId: id }}
      className={`group relative block aspect-square ${className}`}
    >
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{ background: "var(--gradient-warm)" }}
      >
        {image_url ? (
          <img
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            src={thumb(image_url, 480)}
            alt={name_bn}
            className="size-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-4xl">🛒</span>
        )}
      </div>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[78%] truncate whitespace-nowrap text-center rounded-full bg-[#4E2506] text-white font-bold text-xs md:text-sm px-2.5 py-1.5 md:py-2">
        {name_bn}
      </span>
    </Link>
  );
}
