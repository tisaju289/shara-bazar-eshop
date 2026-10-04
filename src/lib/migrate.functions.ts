import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * এককালীন ইমেজ মাইগ্রেশন: বাইরের (hotlink) image_url গুলো ডাউনলোড করে
 * নিজের Supabase "site-images" বাকেটে তুলে row আপডেট করে।
 *
 * ফলে ছবি আর তৃতীয় পক্ষের (ibb/daraz/google/pinimg...) রহমতে থাকে না —
 * gstatic expire বা hotlink ব্লক হলেও সাইটের ছবি ভাঙবে না।
 *
 * সুরক্ষা: MIGRATION_TOKEN সিক্রেট ছাড়া চলে না। আইডেম্পোটেন্ট — ইতিমধ্যে
 * মাইগ্রেট হয়ে যাওয়া (Supabase) URL গুলো স্কিপ হয়, তাই বারবার চালানো যায়।
 */

type TableReport = {
  scanned: number;
  migrated: number;
  skipped: number;
  failed: { id: string; url: string; reason: string }[];
};

type MigrateReport = { tables: Record<string, TableReport>; note?: string };

const TABLES = ["products", "categories", "subcategories", "brands"] as const;
// Cloudflare free plan: এক invocation-এ সর্বোচ্চ ৫০ subrequest।
// প্রতি ইউনিক URL-এ ~২-৩টা (ডাউনলোড+আপলোড) + প্রতি row-তে ১টা আপডেট লাগে,
// তাই নিরাপদ ব্যাচ ১০। বাকিগুলো পরের রানে — টুলটা idempotent।
const MAX_URLS_PER_RUN = 10;
const CONCURRENCY = 4;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

function extFromUrl(url: string): string | null {
  const m = /\.(jpe?g|png|webp|gif|svg|avif)(?:[?#]|$)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

/** site_settings-এর JSON-এ থাকা ছবি URL চেনার জন্য (hero banner, section image ইত্যাদি) */
function isExternalImageUrl(u: string): boolean {
  if (!/^https?:\/\//i.test(u) || u.includes("supabase.co")) return false;
  return (
    /\.(jpe?g|png|webp|gif|svg|avif)(?:[?#]|$)/i.test(u) ||
    /gstatic|pinimg|ibb\.co|daraz|postimg|unsplash/i.test(u)
  );
}

function collectImageUrls(v: unknown, out: Set<string>): void {
  if (typeof v === "string") {
    if (isExternalImageUrl(v)) out.add(v);
  } else if (Array.isArray(v)) {
    v.forEach((x) => collectImageUrls(x, out));
  } else if (v && typeof v === "object") {
    Object.values(v).forEach((x) => collectImageUrls(x, out));
  }
}

function replaceUrls(v: unknown, map: Map<string, string>): unknown {
  if (typeof v === "string") return map.get(v) ?? v;
  if (Array.isArray(v)) return v.map((x) => replaceUrls(x, map));
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = replaceUrls(x, map);
    return o;
  }
  return v;
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** ছবি ডাউনলোড: আগে সরাসরি, fail হলে weserv প্রক্সি (TLS-সমস্যার হোস্টের জন্য)। */
async function fetchImage(url: string): Promise<{ blob: Blob; ext: string; type: string } | null> {
  // ১) সরাসরি (সার্ভার ফেচে Referer যায় না — hotlink ব্লক এড়ানো যায়)
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { accept: "image/*" },
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 1_000 && blob.size < 12_000_000) {
        const type = (blob.type || res.headers.get("content-type") || "").split(";")[0];
        const ext = EXT_BY_TYPE[type] || extFromUrl(url) || "jpg";
        const useType = EXT_BY_TYPE[type] ? type : type.startsWith("image/") ? type : "image/jpeg";
        return { blob, ext, type: useType };
      }
    }
  } catch {
    /* নিচের ফলব্যাকে যাওয়া হয় */
  }
  // ২) weserv (webp রি-এনকোড করে ছোট করে দেয়)
  try {
    const w = `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//i, ""))}&w=1200&output=webp&q=85`;
    const res = await fetch(w, { signal: AbortSignal.timeout(20_000) });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 1_000 && blob.size < 12_000_000) {
        return { blob, ext: "webp", type: "image/webp" };
      }
    }
  } catch {
    /* ফেইল হিসেবে রিপোর্ট হবে */
  }
  return null;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(runners);
  return out;
}

export const migrateImages = createServerFn({ method: "POST" })
  .validator((input: { token?: string }) => input)
  .handler(async ({ data }) => {
    const token = process.env.MIGRATION_TOKEN;
    if (!token || data?.token !== token) throw new Error("অননুমোদিত");

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY সেট করা নেই");
    const sb = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false },
    });

    const report: MigrateReport = { tables: {} };
    let urlBudget = MAX_URLS_PER_RUN;

    for (const table of TABLES) {
      const t: TableReport = { scanned: 0, migrated: 0, skipped: 0, failed: [] };
      let rows: { id: string; image_url: string | null }[] | null = null;
      try {
        const r = await sb.from(table).select("id,image_url").limit(1000);
        rows = r.data as { id: string; image_url: string | null }[] | null;
      } catch {
        // টেবিল/কলাম না থাকলে স্কিপ
        report.tables[table] = t;
        continue;
      }

      // একই URL একবারই ডাউনলোড/আপলোড হয় (একাধিক প্রোডাক্টে একই ছবি থাকতে পারে)
      const byUrl = new Map<string, { id: string; image_url: string }[]>();
      for (const row of rows ?? []) {
        const u = row.image_url;
        if (typeof u !== "string" || !/^https?:\/\//i.test(u) || u.includes("supabase.co")) continue;
        const list = byUrl.get(u) ?? [];
        list.push({ id: row.id, image_url: u });
        byUrl.set(u, list);
      }
      t.scanned = byUrl.size;
      if (byUrl.size === 0) {
        t.skipped = 0;
        report.tables[table] = t;
        continue;
      }

      // এক রানে সীমিত সংখ্যা — subrequest সীমা এড়াতে; বাকিগুলো পরের রানে
      const batch = [...byUrl.entries()].slice(0, Math.max(0, urlBudget));
      t.skipped = byUrl.size - batch.length;
      urlBudget -= batch.length;

      await mapLimit(batch, CONCURRENCY, async ([url, rowList]) => {
        const img = await fetchImage(url);
        if (!img) {
          for (const row of rowList) t.failed.push({ id: row.id, url: url.slice(0, 120), reason: "ডাউনলোড ব্যর্থ" });
          return;
        }
        const path = `migrated/${table}/${rowList[0].id}.${img.ext}`;
        const up = await sb.storage
          .from("site-images")
          .upload(path, img.blob, { upsert: true, contentType: img.type });
        if (up.error) {
          for (const row of rowList) t.failed.push({ id: row.id, url: url.slice(0, 120), reason: up.error.message });
          return;
        }
        const pub = sb.storage.from("site-images").getPublicUrl(path).data.publicUrl;
        const upd = await sb.from(table).update({ image_url: pub }).in("id", rowList.map((r) => r.id));
        if (upd.error) {
          for (const row of rowList) t.failed.push({ id: row.id, url: url.slice(0, 120), reason: upd.error.message });
          return;
        }
        t.migrated += rowList.length;
      });

      report.tables[table] = t;
      if (urlBudget <= 0) break;
    }

    // site_settings: hero banner / home section-এর ছবি JSON-এর ভেতরে থাকে
    if (urlBudget > 0) {
      const t: TableReport = { scanned: 0, migrated: 0, skipped: 0, failed: [] };
      try {
        const r = await sb.from("site_settings").select("key,value").limit(200);
        const rows = (r.data ?? []) as { key: string; value: unknown }[];

        const byUrl = new Map<string, string[]>(); // url -> কোন কোন key-তে আছে
        for (const row of rows) {
          const urls = new Set<string>();
          collectImageUrls(row.value, urls);
          for (const u of urls) {
            const list = byUrl.get(u) ?? [];
            list.push(row.key);
            byUrl.set(u, list);
          }
        }
        t.scanned = byUrl.size;

        if (byUrl.size > 0) {
          const batch = [...byUrl.entries()].slice(0, urlBudget);
          t.skipped = byUrl.size - batch.length;
          urlBudget -= batch.length;

          const urlMap = new Map<string, string>(); // old -> new public url
          await mapLimit(batch, CONCURRENCY, async ([url, keys]) => {
            const img = await fetchImage(url);
            if (!img) {
              for (const k of keys) t.failed.push({ id: k, url: url.slice(0, 120), reason: "ডাউনলোড ব্যর্থ" });
              return;
            }
            const path = `migrated/settings/${keys[0].replace(/[^a-z0-9_-]/gi, "_")}/${hashStr(url)}.${img.ext}`;
            const up = await sb.storage
              .from("site-images")
              .upload(path, img.blob, { upsert: true, contentType: img.type });
            if (up.error) {
              for (const k of keys) t.failed.push({ id: k, url: url.slice(0, 120), reason: up.error.message });
              return;
            }
            urlMap.set(url, sb.storage.from("site-images").getPublicUrl(path).data.publicUrl);
          });

          // যেসব row-তে replace হয়েছে সেগুলো আপডেট
          if (urlMap.size > 0) {
            for (const row of rows) {
              const urls = new Set<string>();
              collectImageUrls(row.value, urls);
              if (![...urls].some((u) => urlMap.has(u))) continue;
              const upd = await sb
                .from("site_settings")
                .update({ value: replaceUrls(row.value, urlMap) })
                .eq("key", row.key);
              if (upd.error) {
                for (const u of urls) {
                  if (urlMap.has(u)) t.failed.push({ id: row.key, url: u.slice(0, 120), reason: upd.error.message });
                }
              }
            }
            t.migrated = urlMap.size;
          }
        }
      } catch {
        /* site_settings না থাকলে স্কিপ */
      }
      report.tables["site_settings"] = t;
    }

    if (urlBudget <= 0) {
      report.note = "সীমা পূর্ণ — বাকি আছে, আবার চালান";
    }
    return report;
  });
