import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, type SiteSettings } from "@/hooks/useSiteSettings";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageInput } from "@/components/ImageInput";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "সাইট সেটিংস — অ্যাডমিন" }] }),
  component: SettingsPage,
});

type TabKey = "brand" | "seo" | "topbar" | "hero" | "offer" | "features" | "footer";

const TABS: { key: TabKey; label: string }[] = [
  { key: "brand", label: "ব্র্যান্ড" },
  { key: "seo", label: "SEO / মেটা" },
  { key: "topbar", label: "টপ বার" },
  { key: "hero", label: "হিরো সেকশন" },
  { key: "offer", label: "অফার ব্যানার" },
  { key: "features", label: "ফিচার" },
  { key: "footer", label: "ফুটার" },
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

  const update = <K extends TabKey>(key: K, value: SiteSettings[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const saveTab = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("site_settings")
      .upsert({ key: tab, value: draft[tab] }, { onConflict: "key" });
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
        {tab === "topbar" && <TopbarTab v={draft.topbar} on={(v) => update("topbar", v)} />}
        {tab === "hero" && <HeroTab v={draft.hero} on={(v) => update("hero", v)} />}
        {tab === "offer" && <OfferTab v={draft.offer} on={(v) => update("offer", v)} />}
        {tab === "features" && <FeaturesTab v={draft.features} on={(v) => update("features", v)} />}
        {tab === "footer" && <FooterTab v={draft.footer} on={(v) => update("footer", v)} />}

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
        <Field label="প্রাইমারি বাটন"><input className={inputCls} value={v.cta_primary_bn} onChange={(e) => on({ ...v, cta_primary_bn: e.target.value })} /></Field>
        <Field label="সেকেন্ডারি বাটন"><input className={inputCls} value={v.cta_secondary_bn} onChange={(e) => on({ ...v, cta_secondary_bn: e.target.value })} /></Field>
      </div>
      <Field label="হিরো ইমেজ" hint="খালি রাখলে ডিফল্ট ইমেজ দেখাবে">
        <ImageInput value={v.image_url} onChange={(url) => on({ ...v, image_url: url })} folder="hero" />
      </Field>
    </div>
  );
}
function OfferTab({ v, on }: { v: SiteSettings["offer"]; on: (v: SiteSettings["offer"]) => void }) {
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