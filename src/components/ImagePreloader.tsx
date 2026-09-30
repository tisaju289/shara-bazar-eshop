import { useEffect } from "react";
import { thumb } from "@/lib/img";

type Props = {
  imageUrls: string[];
  priority?: number;
};

export function ImagePreloader({ imageUrls, priority = 4 }: Props) {
  useEffect(() => {
    const urlsToPreload = imageUrls.slice(0, priority).filter(Boolean);

    urlsToPreload.forEach((url) => {
      const img = new Image();
      img.src = thumb(url, 150) || url;
    });
  }, [imageUrls, priority]);

  return null;
}
