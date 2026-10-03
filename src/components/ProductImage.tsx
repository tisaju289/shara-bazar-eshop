import { useState } from "react";
import { thumb, thumbSrcSet } from "@/lib/img";

/** বাইরের ইমেজ weserv প্রক্সি দিয়ে আনার URL বানায়। */
function proxied(url: string, width: number): string {
  return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//i, ""))}&w=${width}&output=webp&we&il`;
}

/**
 * প্রোডাক্ট ইমেজ — সব জায়গায় (কার্ড, ডিটেইল পেজ, কার্ট, চেকআউট) এটা ব্যবহার হয়।
 *
 * নির্ভরযোগ্য লোডিং নিশ্চিত করার জন্য ধাপে ধাপে ফলব্যাক:
 * 1. অপ্টিমাইজড URL (Supabase render CDN / সরাসরি external) — referrer যায় না,
 *    তাই হটলিংক-ব্লক করা হোস্টও সরাসরি লোড হয়।
 * 2. লোড ব্যর্থ হলে weserv প্রক্সি দিয়ে আবার চেষ্টা — ব্রাউজার থেকে যেসব হোস্টে
 *    সরাসরি যাওয়া যায় না (TLS/হটলিংক সমস্যা) সেগুলোর জন্য।
 * 3. সব ব্যর্থ হলে সুন্দর 🛒 placeholder — কোনো ফাঁকা/ভাঙা বক্স দেখায় না।
 */
type Props = {
  url: string | null | undefined;
  alt: string;
  /** রেন্ডার প্রস্থ — থাম্বনেইল সাইজ বের করতেও ব্যবহৃত হয় */
  width?: number;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  /** url নেই বা ইমেজ লোড ব্যর্থ হলে যা দেখাবে (ডিফল্ট: 🛒 placeholder) */
  fallback?: React.ReactNode;
};

export function ProductImage({
  url,
  alt,
  width = 150,
  className,
  style,
  sizes,
  loading = "lazy",
  fetchPriority,
  fallback,
}: Props) {
  // 0 = অপ্টিমাইজড URL, 1 = ফলব্যাক URL, 2 = সম্পূর্ণ ব্যর্থ → placeholder
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  if (!url || stage === 2) {
    return (
      <>
        {fallback ?? (
          <div className={`${className ?? ""} grid place-items-center text-2xl`} style={style}>
            🛒
          </div>
        )}
      </>
    );
  }

  const optimized = thumb(url, width) ?? url;
  // Supabase হলে মূল object URL, বাইরের হলে weserv প্রক্সি
  const isSupabase = url.includes("/storage/v1/");
  const fb = isSupabase
    ? url.replace("/storage/v1/render/image/public/", "/storage/v1/object/public/")
    : proxied(url, width);
  const src = stage === 0 ? optimized : fb;

  return (
    <img
      src={src}
      srcSet={stage === 0 ? thumbSrcSet(url, width) : undefined}
      sizes={sizes}
      width={width}
      height={width}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      {...(fetchPriority ? { fetchPriority } : {})}
      className={className}
      style={style}
      onError={() => setStage((s) => (s === 0 ? 1 : 2))}
    />
  );
}
