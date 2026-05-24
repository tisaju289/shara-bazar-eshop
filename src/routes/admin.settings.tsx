import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, type SiteSettings, type HomeSection, type HomeSectionType, type HeaderMenu } from "@/hooks/useSiteSettings";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageInput } from "@/components/ImageInput";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "সাইট সেটিংস — অ্যাডমিন" }] }),
  component: SettingsPage,
});

type TabKey = "brand" | "seo" | "header_footer" | "home_sections" | "features" | "tracking" | "delivery" | "checkout";

const TABS: { key: TabKey; label: string }[] = [
  { key: "brand", label: "ব্র্যান্ড" },
  { key: "seo", label: "SEO / মেটা" },
  { key: "header_footer", label: "হেডার / ফুটার" },
  { key: "home_sections", label: "হোম সেকশন" },
  { key: "features", label: "ফিচার" },
  { key: "tracking", label: "ট্র্যাকিং / পিক্সেল" },
  { key: "delivery", label: "ডেলিভারি চার্জ" },
  { key: "checkout", label: "চেকআউট" },
];

function SettingsPage() {
  const { data, isLoading } = useSiteSettings();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("brand");
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setDraft(JSON.parse(JSON.stringify(data))); }, [data]);

  if (isLoading || !draft) {
    return <div className="grid place-items-center h-64"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const saveTab = async () => {
    if (!draft) return;
    setSaving(true);
    const keys = tab === "header_footer"
      ? ["topbar", "header_menu", "footer"]
      : [tab];
    const rows = keys.map((k) => ({ key: k, value: (draft as any)[k] }));
    const { error } = await (supabase as any)
      .from("site_settings")
      .upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error("সেভ ব্যর্থ: " + error.message);
    toast.success("সেভ হয়েছে");
    qc.invalidateQueries({ queryKey: ["site_settings"] });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">সাইট সেটিংস</h1>
        <p className="text-sm text-muted-foreground mt-1">সাইটের নাম, লোগো, SEO, হিরো, অফার — সব এখান থেকে কাস্টমাইজ করুন</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === t.key ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "bg-card border border-border hover:border-primary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-3xl p-5 md:p-7 space-y-5">
        {tab === "brand" && <BrandTab v={draft.brand} on={(v) => update("brand", v)} />}
        {tab === "seo" && <SeoTab v={draft.seo} on={(v) => update("seo", v)} />}
        {tab === "header_footer" && (
          <HeaderFooterTab
            topbar={draft.topbar}
            onTopbar={(v) => update("topbar", v)}
            menu={draft.header_menu}
            onMenu={(v) => update("header_menu", v)}
            footer={draft.footer}
            onFooter={(v) => update("footer", v)}
          />
        )}
        {tab === "home_sections" && (
          <HomeSectionsTab v={draft.home_sections} on={(v) => update("home_sections", v)} />
        )}
        {tab === "features" && <FeaturesTab v={draft.features} on={(v) => update("features", v)} />}
        {tab === "tracking" && <TrackingTab v={draft.tracking} on={(v) => update("tracking", v)} />}
        {tab === "delivery" && <DeliveryTab v={draft.delivery} on={(v) => update("delivery", v)} />}
        {tab === "checkout" && <CheckoutTab v={draft.checkout} on={(v) => update("checkout", v)} />}

        <div className="pt-3 flex justify-end">
          <button onClick={saveTab} disabled={saving}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            সেভ করুন
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeSectionsTab({ v, on }: {
  v: HomeSection[];
  on: (v: HomeSection[]) => void;
}) {
  const { data: cats = [] } = useQuery({
    queryKey: ["categories", "admin-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name_bn").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const setItem = (i: number, patch: Partial<HomeSection>) => {
    on(v.map((s, idx) => (idx === i ? ({ ...s, ...patch } as HomeSection) : s)));
  };
  const addItem = (type: HomeSectionType) => {
    const id = crypto.randomUUID();
    let next: HomeSection;
    if (type === "hero") {
      next = { id, enabled: true, type, badge_bn: "", title_bn: "", title_highlight_bn: "", title_suffix_bn: "", subtitle_bn: "", cta_primary_bn: "অর্ডার করুন", cta_primary_enabled: true, cta_secondary_bn: "দেখুন", cta_secondary_enabled: true, image_url: "", images: [] };
    } else if (type === "category") {
      next = { id, enabled: true, type, title_bn: "জনপ্রিয় ক্যাটাগরি", subtitle_bn: "" };
    } else if (type === "product") {
      next = { id, enabled: true, type, title_bn: "নতুন পণ্য সেকশন", subtitle_bn: "", category_id: "", limit: 8 };
    } else if (type === "offer") {
      next = { id, enabled: true, type, label_bn: "অফার", title_bn: "", subtitle_bn: "", coupon_code: "", min_order_bn: "", cta_bn: "অর্ডার করুন" };
    } else {
      next = { id, enabled: true, type: "banner", image_url: "", link: "", caption_bn: "" };
    }
    on([...v, next]);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= v.length) return;
    const n = [...v];
    [n[i], n[j]] = [n[j], n[i]];
    on(n);
  };
  const TYPE_LABEL: Record<HomeSectionType, string> = {
    hero: "হিরো", category: "ক্যাটাগরি", product: "পণ্য", offer: "অফার", banner: "ব্যানার",
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-md">হোম পেজে যেকোনো সেকশন যোগ/বাদ দিন। প্রতিটা সেকশন আলাদাভাবে অন/অফ করা যাবে, উপরে-নিচে সরানো যাবে।</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABEL) as HomeSectionType[]).map((t) => (
            <button key={t} type="button" onClick={() => addItem(t)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              <Plus className="size-3.5" /> {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      {v.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-6">কোনো সেকশন নেই — উপরের বাটন থেকে টাইপ বেছে যোগ করুন</p>}
      <div className="space-y-4">
        {v.map((s, i) => (
          <div key={s.id} className="rounded-2xl border border-border p-4 space-y-3 bg-secondary/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted-foreground">সেকশন {i + 1} · {TYPE_LABEL[s.type]}</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => setItem(i, { enabled: e.target.checked })} className="size-4 accent-primary" />
                  <span>সক্রিয়</span>
                </label>
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="h-8 px-2 rounded-md bg-card border border-border text-xs disabled:opacity-40">↑</button>
                <button type="button" disabled={i === v.length - 1} onClick={() => move(i, 1)} className="h-8 px-2 rounded-md bg-card border border-border text-xs disabled:opacity-40">↓</button>
                <button type="button" onClick={() => on(v.filter((_, j) => j !== i))} className="size-8 rounded-md bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
            <SectionEditor section={s} setItem={(p) => setItem(i, p)} cats={cats as { id: string; name_bn: string }[]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionEditor({ section: s, setItem, cats }: {
  section: HomeSection;
  setItem: (p: Partial<HomeSection>) => void;
  cats: { id: string; name_bn: string }[];
}) {
  if (s.type === "hero") {
    const images = s.images ?? [];
    const setImages = (next: string[]) => setItem({ images: next } as any);
    return (
      <div className="space-y-3">
        <Field label="ব্যাজ টেক্সট"><input className={inputCls} value={s.badge_bn} onChange={(e) => setItem({ badge_bn: e.target.value } as any)} /></Field>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="টাইটেল প্রথম অংশ"><input className={inputCls} value={s.title_bn} onChange={(e) => setItem({ title_bn: e.target.value } as any)} /></Field>
          <Field label="হাইলাইট অংশ"><input className={inputCls} value={s.title_highlight_bn} onChange={(e) => setItem({ title_highlight_bn: e.target.value } as any)} /></Field>
          <Field label="শেষ অংশ"><input className={inputCls} value={s.title_suffix_bn} onChange={(e) => setItem({ title_suffix_bn: e.target.value } as any)} /></Field>
        </div>
        <Field label="সাবটাইটেল"><textarea className={areaCls} value={s.subtitle_bn} onChange={(e) => setItem({ subtitle_bn: e.target.value } as any)} /></Field>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Field label="প্রাইমারি বাটন"><input className={inputCls} value={s.cta_primary_bn} onChange={(e) => setItem({ cta_primary_bn: e.target.value } as any)} /></Field>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={s.cta_primary_enabled} onChange={(e) => setItem({ cta_primary_enabled: e.target.checked } as any)} className="size-4 accent-primary" />
              দেখান
            </label>
          </div>
          <div className="space-y-2">
            <Field label="সেকেন্ডারি বাটন"><input className={inputCls} value={s.cta_secondary_bn} onChange={(e) => setItem({ cta_secondary_bn: e.target.value } as any)} /></Field>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={s.cta_secondary_enabled} onChange={(e) => setItem({ cta_secondary_enabled: e.target.checked } as any)} className="size-4 accent-primary" />
              দেখান
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">স্লাইডার ইমেজ</span>
            <button type="button" onClick={() => setImages([...images, ""])}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-secondary text-xs font-semibold">
              <Plus className="size-3.5" /> ইমেজ
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {images.map((url, i) => (
              <div key={i} className="rounded-xl border border-border p-2 space-y-2 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold">স্লাইড {i + 1}</span>
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="size-6 rounded-md bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-3" /></button>
                </div>
                <ImageInput value={url} onChange={(u) => { const n = [...images]; n[i] = u; setImages(n); }} folder="hero" />
              </div>
            ))}
          </div>
          <Field label="ফ্যালব্যাক ইমেজ" hint="স্লাইডার খালি থাকলে এটি দেখাবে">
            <ImageInput value={s.image_url} onChange={(url) => setItem({ image_url: url } as any)} folder="hero" />
          </Field>
        </div>
      </div>
    );
  }
  if (s.type === "category") {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="টাইটেল"><input className={inputCls} value={s.title_bn} onChange={(e) => setItem({ title_bn: e.target.value } as any)} /></Field>
        <Field label="সাবটাইটেল"><input className={inputCls} value={s.subtitle_bn} onChange={(e) => setItem({ subtitle_bn: e.target.value } as any)} /></Field>
      </div>
    );
  }
  if (s.type === "product") {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="টাইটেল"><input className={inputCls} value={s.title_bn} onChange={(e) => setItem({ title_bn: e.target.value } as any)} /></Field>
        <Field label="সাবটাইটেল"><input className={inputCls} value={s.subtitle_bn} onChange={(e) => setItem({ subtitle_bn: e.target.value } as any)} /></Field>
        <Field label="ক্যাটাগরি">
          <select className={inputCls} value={s.category_id} onChange={(e) => setItem({ category_id: e.target.value } as any)}>
            <option value="">— সব ক্যাটাগরি —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
          </select>
        </Field>
        <Field label="সর্বোচ্চ পণ্য সংখ্যা">
          <input type="number" min={1} max={50} className={inputCls} value={s.limit} onChange={(e) => setItem({ limit: Math.max(1, Number(e.target.value) || 8) } as any)} />
        </Field>
      </div>
    );
  }
  if (s.type === "offer") {
    return (
      <div className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="লেবেল"><input className={inputCls} value={s.label_bn} onChange={(e) => setItem({ label_bn: e.target.value } as any)} /></Field>
          <Field label="কুপন কোড"><input className={inputCls} value={s.coupon_code} onChange={(e) => setItem({ coupon_code: e.target.value } as any)} /></Field>
        </div>
        <Field label="টাইটেল"><input className={inputCls} value={s.title_bn} onChange={(e) => setItem({ title_bn: e.target.value } as any)} /></Field>
        <Field label="সাবটাইটেল"><input className={inputCls} value={s.subtitle_bn} onChange={(e) => setItem({ subtitle_bn: e.target.value } as any)} /></Field>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="মিনিমাম অর্ডার টেক্সট"><input className={inputCls} value={s.min_order_bn} onChange={(e) => setItem({ min_order_bn: e.target.value } as any)} /></Field>
          <Field label="বাটন টেক্সট"><input className={inputCls} value={s.cta_bn} onChange={(e) => setItem({ cta_bn: e.target.value } as any)} /></Field>
        </div>
      </div>
    );
  }
  // banner
  return (
    <div className="space-y-3">
      <Field label="ব্যানার ইমেজ"><ImageInput value={s.image_url} onChange={(url) => setItem({ image_url: url } as any)} folder="banner" /></Field>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="ক্যাপশন (ঐচ্ছিক)"><input className={inputCls} value={s.caption_bn} onChange={(e) => setItem({ caption_bn: e.target.value } as any)} /></Field>
        <Field label="লিংক (ঐচ্ছিক)" hint="ক্লিক করলে এই URL এ যাবে"><input className={inputCls} value={s.link} onChange={(e) => setItem({ link: e.target.value } as any)} placeholder="/products?cat=…" /></Field>
      </div>
    </div>
  );
}

/* ---------- Reusable inputs ---------- */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full h-11 px-4 rounded-xl bg-secondary border border-transparent focus:border-primary outline-none text-sm";
const areaCls = "w-full min-h-[90px] p-3 rounded-xl bg-secondary border border-transparent focus:border-primary outline-none text-sm";

/* ---------- Tabs ---------- */
function BrandTab({ v, on }: { v: SiteSettings["brand"]; on: (v: SiteSettings["brand"]) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="সাইটের নাম (বাংলা)"><input className={inputCls} value={v.name_bn} onChange={(e) => on({ ...v, name_bn: e.target.value })} /></Field>
      <Field label="ট্যাগলাইন"><input className={inputCls} value={v.tagline_bn} onChange={(e) => on({ ...v, tagline_bn: e.target.value })} /></Field>
      <div className="md:col-span-2">
        <Field label="লোগো" hint="URL দিন অথবা ছবি ড্র্যাগ/আপলোড করুন">
          <ImageInput value={v.logo_url} onChange={(url) => on({ ...v, logo_url: url })} folder="brand" />
        </Field>
      </div>
    </div>
  );
}
function SeoTab({ v, on }: { v: SiteSettings["seo"]; on: (v: SiteSettings["seo"]) => void }) {
  return (
    <div className="space-y-4">
      <Field label="পেজ টাইটেল" hint="৬০ অক্ষরের মধ্যে রাখুন"><input className={inputCls} value={v.title} onChange={(e) => on({ ...v, title: e.target.value })} /></Field>
      <Field label="মেটা ডেসক্রিপশন" hint="১৬০ অক্ষরের মধ্যে রাখুন"><textarea className={areaCls} value={v.description} onChange={(e) => on({ ...v, description: e.target.value })} /></Field>
      <Field label="কীওয়ার্ডস" hint="কমা দিয়ে আলাদা করুন"><input className={inputCls} value={v.keywords} onChange={(e) => on({ ...v, keywords: e.target.value })} /></Field>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="OG ইমেজ" hint="সোশ্যাল মিডিয়ায় শেয়ার ইমেজ">
          <ImageInput value={v.og_image} onChange={(url) => on({ ...v, og_image: url })} folder="seo" />
        </Field>
        <Field label="ফেভিকন">
          <ImageInput value={v.favicon_url} onChange={(url) => on({ ...v, favicon_url: url })} folder="seo" />
        </Field>
      </div>
    </div>
  );
}
function TopbarTab({ v, on }: { v: SiteSettings["topbar"]; on: (v: SiteSettings["topbar"]) => void }) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={v.enabled} onChange={(e) => on({ ...v, enabled: e.target.checked })} className="size-4 accent-primary" />
        <span className="text-sm font-semibold">টপ বার দেখান</span>
      </label>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="ডেলিভারি এরিয়া টেক্সট"><input className={inputCls} value={v.location_bn} onChange={(e) => on({ ...v, location_bn: e.target.value })} /></Field>
        <Field label="হটলাইন নাম্বার"><input className={inputCls} value={v.phone} onChange={(e) => on({ ...v, phone: e.target.value })} /></Field>
      </div>
    </div>
  );
}
function HeroTab({ v, on }: { v: SiteSettings["hero"]; on: (v: SiteSettings["hero"]) => void }) {
  const images = v.images ?? [];
  const setImages = (next: string[]) => on({ ...v, images: next });
  return (
    <div className="space-y-4">
      <Field label="ব্যাজ টেক্সট"><input className={inputCls} value={v.badge_bn} onChange={(e) => on({ ...v, badge_bn: e.target.value })} /></Field>
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="টাইটেল প্রথম অংশ"><input className={inputCls} value={v.title_bn} onChange={(e) => on({ ...v, title_bn: e.target.value })} /></Field>
        <Field label="হাইলাইট অংশ"><input className={inputCls} value={v.title_highlight_bn} onChange={(e) => on({ ...v, title_highlight_bn: e.target.value })} /></Field>
        <Field label="শেষ অংশ"><input className={inputCls} value={v.title_suffix_bn} onChange={(e) => on({ ...v, title_suffix_bn: e.target.value })} /></Field>
      </div>
      <Field label="সাবটাইটেল"><textarea className={areaCls} value={v.subtitle_bn} onChange={(e) => on({ ...v, subtitle_bn: e.target.value })} /></Field>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Field label="প্রাইমারি বাটন"><input className={inputCls} value={v.cta_primary_bn} onChange={(e) => on({ ...v, cta_primary_bn: e.target.value })} /></Field>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={v.cta_primary_enabled} onChange={(e) => on({ ...v, cta_primary_enabled: e.target.checked })} className="size-4 accent-primary" />
            <span className="text-sm font-semibold">প্রাইমারি বাটন দেখান</span>
          </label>
        </div>
        <div className="space-y-2">
          <Field label="সেকেন্ডারি বাটন"><input className={inputCls} value={v.cta_secondary_bn} onChange={(e) => on({ ...v, cta_secondary_bn: e.target.value })} /></Field>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={v.cta_secondary_enabled} onChange={(e) => on({ ...v, cta_secondary_enabled: e.target.checked })} className="size-4 accent-primary" />
            <span className="text-sm font-semibold">সেকেন্ডারি বাটন দেখান</span>
          </label>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">হিরো স্লাইডার ইমেজ</span>
          <button type="button" onClick={() => setImages([...images, ""])}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-secondary text-xs font-semibold">
            <Plus className="size-3.5" /> ইমেজ যোগ
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">একাধিক ইমেজ যোগ করলে হোম পেজে স্লাইডার হিসেবে দেখাবে। খালি থাকলে নিচের ডিফল্ট ইমেজ দেখাবে।</p>
        {images.length === 0 && <p className="text-xs text-muted-foreground italic">কোনো স্লাইড নেই — "ইমেজ যোগ" চাপুন</p>}
        <div className="grid md:grid-cols-2 gap-3">
          {images.map((url, i) => (
            <div key={i} className="rounded-2xl border border-border p-3 space-y-2 bg-secondary/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">স্লাইড {i + 1}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={i === 0} onClick={() => { const n = [...images]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setImages(n); }}
                    className="h-7 px-2 rounded-md bg-card border border-border text-xs disabled:opacity-40">↑</button>
                  <button type="button" disabled={i === images.length - 1} onClick={() => { const n = [...images]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setImages(n); }}
                    className="h-7 px-2 rounded-md bg-card border border-border text-xs disabled:opacity-40">↓</button>
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="size-7 rounded-md bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
              <ImageInput value={url} onChange={(u) => { const n = [...images]; n[i] = u; setImages(n); }} folder="hero" />
            </div>
          ))}
        </div>
      </div>
      <Field label="ডিফল্ট হিরো ইমেজ (ফ্যালব্যাক)" hint="যখন স্লাইডারে কোনো ইমেজ থাকবে না, তখন এটি দেখাবে">
        <ImageInput value={v.image_url} onChange={(url) => on({ ...v, image_url: url })} folder="hero" />
      </Field>
    </div>
  );
}
function OfferTab({ v, on }: { v: SiteSettings["offer"]; on: (v: SiteSettings["offer"]) => void }) {
  return _OfferTabImpl(v, on);
}
function _OfferTabImpl(v: SiteSettings["offer"], on: (v: SiteSettings["offer"]) => void) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={v.enabled} onChange={(e) => on({ ...v, enabled: e.target.checked })} className="size-4 accent-primary" />
        <span className="text-sm font-semibold">অফার ব্যানার দেখান</span>
      </label>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="লেবেল"><input className={inputCls} value={v.label_bn} onChange={(e) => on({ ...v, label_bn: e.target.value })} /></Field>
        <Field label="কুপন কোড"><input className={inputCls} value={v.coupon_code} onChange={(e) => on({ ...v, coupon_code: e.target.value })} /></Field>
      </div>
      <Field label="টাইটেল"><input className={inputCls} value={v.title_bn} onChange={(e) => on({ ...v, title_bn: e.target.value })} /></Field>
      <Field label="সাবটাইটেল"><input className={inputCls} value={v.subtitle_bn} onChange={(e) => on({ ...v, subtitle_bn: e.target.value })} /></Field>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="মিনিমাম অর্ডার টেক্সট"><input className={inputCls} value={v.min_order_bn} onChange={(e) => on({ ...v, min_order_bn: e.target.value })} /></Field>
        <Field label="বাটন টেক্সট"><input className={inputCls} value={v.cta_bn} onChange={(e) => on({ ...v, cta_bn: e.target.value })} /></Field>
      </div>
    </div>
  );
}
function FeaturesTab({ v, on }: { v: SiteSettings["features"]; on: (v: SiteSettings["features"]) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">আইকন অপশন: <code>truck, shield, clock, leaf, star</code></p>
      {v.map((f, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className={inputCls + " flex-1"} placeholder="আইকন" value={f.icon} onChange={(e) => { const n = [...v]; n[i] = { ...n[i], icon: e.target.value }; on(n); }} />
          <input className={inputCls + " flex-[2]"} placeholder="টেক্সট" value={f.text_bn} onChange={(e) => { const n = [...v]; n[i] = { ...n[i], text_bn: e.target.value }; on(n); }} />
          <button onClick={() => on(v.filter((_, j) => j !== i))} className="size-11 rounded-xl bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <button onClick={() => on([...v, { icon: "leaf", text_bn: "" }])} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-secondary text-sm font-semibold"><Plus className="size-4" /> ফিচার যোগ</button>
    </div>
  );
}
function FooterTab({ v, on }: { v: SiteSettings["footer"]; on: (v: SiteSettings["footer"]) => void }) {
  return (
    <div className="space-y-4">
      <Field label="সংক্ষিপ্ত পরিচিতি"><textarea className={areaCls} value={v.about_bn} onChange={(e) => on({ ...v, about_bn: e.target.value })} /></Field>
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="ফোন"><input className={inputCls} value={v.phone} onChange={(e) => on({ ...v, phone: e.target.value })} /></Field>
        <Field label="ইমেইল"><input className={inputCls} value={v.email} onChange={(e) => on({ ...v, email: e.target.value })} /></Field>
        <Field label="ঠিকানা"><input className={inputCls} value={v.address_bn} onChange={(e) => on({ ...v, address_bn: e.target.value })} /></Field>
      </div>
    </div>
  );
}

function HeaderFooterTab({ topbar, onTopbar, menu, onMenu, footer, onFooter }: {
  topbar: SiteSettings["topbar"];
  onTopbar: (v: SiteSettings["topbar"]) => void;
  menu: HeaderMenu;
  onMenu: (v: HeaderMenu) => void;
  footer: SiteSettings["footer"];
  onFooter: (v: SiteSettings["footer"]) => void;
}) {
  const items = menu.items ?? [];
  const setItems = (next: { label_bn: string; url: string }[]) => onMenu({ ...menu, items: next });
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--leaf-deep)]">হেডার — টপ বার</h3>
        <TopbarTab v={topbar} on={onTopbar} />
      </section>

      <section className="space-y-3 pt-5 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--leaf-deep)]">হেডার মেনু</h3>
          <button type="button" onClick={() => setItems([...items, { label_bn: "", url: "/" }])}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            <Plus className="size-3.5" /> মেনু যোগ
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">হেডারে দেখানোর জন্য মেনু আইটেম যোগ করুন (যেমন: হোম → /, ক্যাটাগরি → /categories, প্রোডাক্টস → /products)</p>
        {items.length === 0 && <p className="text-xs text-muted-foreground italic py-2">কোনো মেনু নেই — উপরের বাটন থেকে যোগ করুন</p>}
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={inputCls + " flex-1"} placeholder="লেবেল (বাংলা)" value={it.label_bn}
                onChange={(e) => { const n = [...items]; n[i] = { ...n[i], label_bn: e.target.value }; setItems(n); }} />
              <input className={inputCls + " flex-1"} placeholder="URL (যেমন /products)" value={it.url}
                onChange={(e) => { const n = [...items]; n[i] = { ...n[i], url: e.target.value }; setItems(n); }} />
              <button type="button" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setItems(n); }}
                className="h-9 px-2 rounded-md bg-card border border-border text-xs disabled:opacity-40">↑</button>
              <button type="button" disabled={i === items.length - 1} onClick={() => { const n = [...items]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setItems(n); }}
                className="h-9 px-2 rounded-md bg-card border border-border text-xs disabled:opacity-40">↓</button>
              <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))}
                className="size-9 rounded-md bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 pt-5 border-t border-border">
        <h3 className="text-sm font-bold text-[var(--leaf-deep)]">ফুটার</h3>
        <FooterTab v={footer} on={onFooter} />
      </section>
    </div>
  );
}
function TrackingTab({ v, on }: { v: SiteSettings["tracking"]; on: (v: SiteSettings["tracking"]) => void }) {
  return (
    <div className="space-y-6">
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={v.enabled} onChange={(e) => on({ ...v, enabled: e.target.checked })} className="size-4 accent-primary" />
        <span className="text-sm font-semibold">সব ট্র্যাকিং চালু করুন (মাস্টার সুইচ)</span>
      </label>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--leaf-deep)]">Meta (Facebook) Pixel + Conversions API</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Pixel ID" hint="যেমন: 1234567890"><input className={inputCls} value={v.meta_pixel_id} onChange={(e) => on({ ...v, meta_pixel_id: e.target.value.trim() })} /></Field>
          <Field label="Test Event Code" hint="Events Manager → Test events"><input className={inputCls} value={v.meta_test_event_code} onChange={(e) => on({ ...v, meta_test_event_code: e.target.value.trim() })} /></Field>
        </div>
        <Field label="Conversions API Access Token" hint="Events Manager → Settings → Generate access token। সার্ভার থেকে CAPI ইভেন্ট পাঠাতে এটি লাগবে।">
          <textarea className={areaCls} value={v.meta_capi_token} onChange={(e) => on({ ...v, meta_capi_token: e.target.value.trim() })} />
        </Field>
      </div>

      <div className="space-y-3 pt-3 border-t border-border">
        <h3 className="text-sm font-bold text-[var(--leaf-deep)]">Google Analytics 4 / Google Ads</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="GA4 Measurement ID" hint="যেমন: G-XXXXXXX"><input className={inputCls} value={v.ga4_id} onChange={(e) => on({ ...v, ga4_id: e.target.value.trim() })} /></Field>
          <Field label="Google Ads ID" hint="যেমন: AW-123456789"><input className={inputCls} value={v.google_ads_id} onChange={(e) => on({ ...v, google_ads_id: e.target.value.trim() })} /></Field>
        </div>
        <Field label="Google Ads Purchase Conversion Label" hint="ঐচ্ছিক"><input className={inputCls} value={v.google_ads_purchase_label} onChange={(e) => on({ ...v, google_ads_purchase_label: e.target.value.trim() })} /></Field>
      </div>

      <div className="space-y-3 pt-3 border-t border-border">
        <h3 className="text-sm font-bold text-[var(--leaf-deep)]">Google Tag Manager</h3>
        <Field label="GTM Container ID" hint="যেমন: GTM-XXXXXX"><input className={inputCls} value={v.gtm_id} onChange={(e) => on({ ...v, gtm_id: e.target.value.trim() })} /></Field>
      </div>

      <div className="space-y-3 pt-3 border-t border-border">
        <h3 className="text-sm font-bold text-[var(--leaf-deep)]">TikTok Pixel</h3>
        <Field label="TikTok Pixel ID"><input className={inputCls} value={v.tiktok_pixel_id} onChange={(e) => on({ ...v, tiktok_pixel_id: e.target.value.trim() })} /></Field>
      </div>

      <div className="space-y-3 pt-3 border-t border-border">
        <h3 className="text-sm font-bold text-[var(--leaf-deep)]">কাস্টম স্ক্রিপ্ট</h3>
        <Field label="Head HTML" hint="<script>...</script> বা যেকোনো verification ট্যাগ"><textarea className={areaCls + " font-mono text-xs"} value={v.head_html} onChange={(e) => on({ ...v, head_html: e.target.value })} /></Field>
        <Field label="Body HTML" hint="<noscript> পিক্সেল / চ্যাট উইজেট ইত্যাদি"><textarea className={areaCls + " font-mono text-xs"} value={v.body_html} onChange={(e) => on({ ...v, body_html: e.target.value })} /></Field>
      </div>

      <div className="rounded-2xl bg-secondary/60 p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground">কীভাবে কাজ করে:</p>
        <p>• সেভ করার সাথে সাথে পুরো সাইটে স্ক্রিপ্ট অটো লোড হবে — কোনো রিডিপ্লয় লাগবে না।</p>
        <p>• প্রতি পেজে <b>PageView</b>, কার্টে যোগে <b>AddToCart</b>, চেকআউট খুললে <b>InitiateCheckout</b>, অর্ডার সফলে <b>Purchase</b> ইভেন্ট ফায়ার হবে।</p>
        <p>• Meta CAPI সার্ভার-সাইড থেকে duplicate <code>event_id</code> সহ ফায়ার হয় (iOS 14+ এ accuracy বাড়ায়)।</p>
      </div>
    </div>
  );
}

function DeliveryTab({ v, on }: { v: SiteSettings["delivery"]; on: (v: SiteSettings["delivery"]) => void }) {
  const setOpt = (i: number, patch: Partial<SiteSettings["delivery"]["options"][number]>) => {
    const next = v.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    on({ ...v, options: next });
  };
  return (
    <div className="space-y-6">
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={v.enabled} onChange={(e) => on({ ...v, enabled: e.target.checked })} className="size-4 accent-primary" />
        <span className="text-sm font-semibold">ডেলিভারি চার্জ অপশন চালু করুন</span>
      </label>
      <p className="text-xs text-muted-foreground">চেকআউট পপআপে এই অপশনগুলো রেডিও আকারে দেখানো হবে। কাস্টমার একটি বেছে নিতে পারবে এবং চার্জ মোট অর্ডারে যুক্ত হবে।</p>
      <div className="space-y-4">
        {v.options.map((o, i) => (
          <div key={i} className="rounded-2xl border border-border p-4 space-y-3 bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">অপশন {i + 1}</span>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={o.enabled} onChange={(e) => setOpt(i, { enabled: e.target.checked })} className="size-4 accent-primary" />
                <span>সক্রিয়</span>
              </label>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="লেবেল (বাংলা)"><input className={inputCls} value={o.label_bn} onChange={(e) => setOpt(i, { label_bn: e.target.value })} placeholder="যেমন: ঢাকার ভিতরে" /></Field>
              <Field label="চার্জ (৳)"><input type="number" min={0} className={inputCls} value={o.charge} onChange={(e) => setOpt(i, { charge: Number(e.target.value) || 0 })} /></Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
