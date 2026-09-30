import { useState } from "react";
import { thumb, thumbSrcSet } from "@/lib/img";

type Props = {
  url: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function OptimizedImage({ url, alt, width = 240, height = 240, className, sizes = "(max-width: 768px) 45vw, 180px", priority = false }: Props) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!url) {
    return <div className={`grid place-items-center text-5xl ${className}`}>🛒</div>;
  }

  if (error) {
    return <div className={`grid place-items-center text-5xl ${className}`}>🖼️</div>;
  }

  const optimizedSrc = thumb(url, width, 80);
  const srcSet = thumbSrcSet(url, width, 80);

  return (
    <div className="relative">
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M0 0h10v10H0zM10 10h10v10H10z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "20px 20px",
          }}
        />
      )}
      <img
        src={optimizedSrc || url}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        // @ts-expect-error fetchpriority is valid HTML
        fetchpriority={priority ? "high" : "auto"}
        decoding="async"
        className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"} ${className}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
