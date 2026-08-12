import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, type SiteSettings, type HomeSection, type HomeSectionType, type HeaderMenu, type CustomField, type CustomFieldType, type ProductCard as ProductCardSettings } from "@/hooks/useSiteSettings";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Plus, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ImageInput } from "@/components/ImageInput";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "সাইট সেটিংস — অ্যাডমিন" }] }),
  component: SettingsPage,
});

type TabKey = "brand" | "seo" | "header_footer" | "home_sections" | "tracking" | "checkout" | "product_card";

const TABS: { key: TabKey; label: string }[] = [
  { key: "brand", label: "ব্র্যান্ড" },
  { key: "seo", label: "SEO / মেটা" },
  { key: "header_footer", label: "হেডার / ফুটার" },
  { key: "home_sections", label: "হোম সেকশন" },
  { key: "product_card", label: "প্রোডাক্ট কার্ড" },
  { key: "tracking", label: "ট্র্যাকিং / পিক্সেল" },
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
      : tab === "checkout"
      ? ["checkout", "delivery"]
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
        {tab === "product_card" && (
          <ProductCardTab v={draft.product_card} on={(v) => update("product_card", v)} />
        )}
        {tab === "tracking" && <TrackingTab v={draft.tracking} on={(v) => update("tracking", v)} />}
        {tab === "checkout" && (
          <CheckoutTab
            v={draft.checkout}
            on={(v) => update("checkout", v)}
            delivery={draft.delivery}
            onDelivery={(v) => update("delivery", v)}
          />
        )}

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

function CheckoutTab({ v, on, delivery, onDelivery }: {
  v: SiteSettings["checkout"];
  on: (v: SiteSettings["checkout"]) => void;
  delivery: SiteSettings["delivery"];
  onDelivery: (v: SiteSettings["delivery"]) => void;
}) {
  const f = <K extends keyof SiteSettings["checkout"]>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => on({ ...v, [k]: e.target.value });
  const fields: CustomField[] = v.custom_fields ?? [];
  const setFields = (next: CustomField[]) => on({ ...v, custom_fields: next });
  const addField = () =>
    setFields([...fields, { id: crypto.randomUUID(), label_bn: "নতুন ফিল্ড", placeholder_bn: "", type: "text", required: false }]);
  const updField = (i: number, patch: Partial<CustomField>) =>
    setFields(fields.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const delField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const moveField = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const n = [...fields];
    [n[i], n[j]] = [n[j], n[i]];
    setFields(n);
  };
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">চেকআউট পপআপের প্রতিটি লেখা/লেবেল/বাটন এখান থেকে কাস্টমাইজ করুন।</p>

      <Section title="ডেলিভারি চার্জ">
        <DeliveryTab v={delivery} on={onDelivery} />
      </Section>

      <Section title="হেডিং ও সেকশন">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="পপআপ টাইটেল"><input className={inputCls} value={v.title_bn} onChange={f("title_bn")} /></Field>
          <Field label="ডেলিভারি এলাকা সেকশন টাইটেল"><input className={inputCls} value={v.delivery_section_title_bn} onChange={f("delivery_section_title_bn")} /></Field>
        </div>
      </Section>

      <Section title="সামারি লেবেল">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="সাবটোটাল লেবেল"><input className={inputCls} value={v.summary_subtotal_bn} onChange={f("summary_subtotal_bn")} /></Field>
          <Field label="ডেলিভারি লেবেল"><input className={inputCls} value={v.summary_delivery_bn} onChange={f("summary_delivery_bn")} /></Field>
          <Field label="মোট লেবেল"><input className={inputCls} value={v.summary_total_bn} onChange={f("summary_total_bn")} /></Field>
        </div>
      </Section>

      <Section title="কাস্টমার ফর্ম">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="নাম — লেবেল"><input className={inputCls} value={v.name_label_bn} onChange={f("name_label_bn")} /></Field>
          <Field label="নাম — প্লেসহোল্ডার"><input className={inputCls} value={v.name_placeholder_bn} onChange={f("name_placeholder_bn")} /></Field>
          <Field label="ফোন — লেবেল"><input className={inputCls} value={v.phone_label_bn} onChange={f("phone_label_bn")} /></Field>
          <Field label="ফোন — প্লেসহোল্ডার"><input className={inputCls} value={v.phone_placeholder_bn} onChange={f("phone_placeholder_bn")} /></Field>
          <Field label="ঠিকানা — লেবেল"><input className={inputCls} value={v.address_label_bn} onChange={f("address_label_bn")} /></Field>
          <Field label="ঠিকানা — প্লেসহোল্ডার"><input className={inputCls} value={v.address_placeholder_bn} onChange={f("address_placeholder_bn")} /></Field>
        </div>
      </Section>

      <Section title="বাটন ও বার্তা">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="অর্ডার বাটন টেক্সট" hint="মোট দাম শেষে অটো যোগ হবে"><input className={inputCls} value={v.submit_btn_bn} onChange={f("submit_btn_bn")} /></Field>
          <Field label="অর্ডার সাবমিট হচ্ছে — টেক্সট"><input className={inputCls} value={v.placing_btn_bn} onChange={f("placing_btn_bn")} /></Field>
          <Field label="ভ্যালিডেশন এরর (ফাঁকা ফিল্ড)"><input className={inputCls} value={v.validation_required_bn} onChange={f("validation_required_bn")} /></Field>
        </div>
      </Section>

      <Section title="অর্ডার সফল স্ক্রিন">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="সফল টাইটেল"><input className={inputCls} value={v.success_title_bn} onChange={f("success_title_bn")} /></Field>
          <Field label="বন্ধ বাটন টেক্সট"><input className={inputCls} value={v.success_close_bn} onChange={f("success_close_bn")} /></Field>
        </div>
        <Field label="সফল বার্তা"><textarea className={areaCls} value={v.success_message_bn} onChange={f("success_message_bn")} /></Field>
      </Section>

      <Section
        title="কাস্টম ফিল্ড"
        right={
          <button onClick={addField} className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            <Plus className="size-4" /> ফিল্ড যোগ
          </button>
        }
      >
        <p className="text-xs text-muted-foreground">এখানে যোগ করা ফিল্ডগুলো চেকআউট ফর্মে দেখা যাবে এবং অর্ডারের ঠিকানার সাথে যুক্ত হবে।</p>
        {fields.length === 0 && <p className="text-xs text-muted-foreground italic">কোনো কাস্টম ফিল্ড যোগ করা হয়নি।</p>}
        <div className="space-y-3">
          {fields.map((cf, i) => (
            <div key={cf.id} className="border border-border rounded-2xl p-3 space-y-3 bg-secondary/30">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="লেবেল"><input className={inputCls} value={cf.label_bn} onChange={(e) => updField(i, { label_bn: e.target.value })} /></Field>
                <Field label="প্লেসহোল্ডার"><input className={inputCls} value={cf.placeholder_bn} onChange={(e) => updField(i, { placeholder_bn: e.target.value })} /></Field>
                <Field label="টাইপ">
                  <select className={inputCls} value={cf.type} onChange={(e) => updField(i, { type: e.target.value as CustomFieldType })}>
                    <option value="text">টেক্সট</option>
                    <option value="textarea">বড় টেক্সট</option>
                    <option value="tel">ফোন</option>
                    <option value="number">সংখ্যা</option>
                    <option value="email">ইমেইল</option>
                  </select>
                </Field>
                <div className="flex items-end gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={cf.required} onChange={(e) => updField(i, { required: e.target.checked })} className="size-4 accent-primary" />
                    আবশ্যিক
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => moveField(i, -1)} className="h-8 px-3 rounded-full border border-border text-xs">↑</button>
                <button onClick={() => moveField(i, 1)} className="h-8 px-3 rounded-full border border-border text-xs">↓</button>
                <button onClick={() => delField(i)} className="h-8 px-3 rounded-full border border-border text-xs inline-flex items-center gap-1 text-[var(--chili)]">
                  <Trash2 className="size-3.5" /> মুছুন
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
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
    } else if (type === "banner_grid") {
      next = { id, enabled: true, type, title_bn: "", columns: 3, items: [{ image_url: "", link: "" }] };
    } else if (type === "feature") {
      next = { id, enabled: true, type, items: [{ image_url: "", title_bn: "দ্রুত ডেলিভারি", subtitle_bn: "৬০ মিনিটে পৌঁছে যাবে" }] };
    } else if (type === "brand") {
      next = { id, enabled: true, type, title_bn: "জনপ্রিয় ব্র্যান্ড", subtitle_bn: "আপনার পছন্দের ব্র্যান্ড বেছে নিন", show_all_link: true };
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
    banner_grid: "ব্যানার গ্রিড", feature: "সুবিধা/ট্রাস্ট", brand: "ব্র্যান্ড",
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

function ProductCardTab({ v, on }: { v: ProductCardSettings; on: (v: ProductCardSettings) => void }) {
  const toggle = (key: keyof ProductCardSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    on({ ...v, [key]: e.target.checked } as ProductCardSettings);
  const set = <K extends keyof ProductCardSettings>(key: K, val: ProductCardSettings[K]) =>
    on({ ...v, [key]: val });

  const sample: ProductCardData = {
    id: "preview",
    name_bn: "কাতল মাছ",
    unit: "১ কেজি",
    price: 330,
    old_price: 350,
    image_url: null,
    tag: "নতুন",
    category_id: null,
    brand_id: null,
    reviews_rating: 4.5,
    reviews_count: 23,
    offer_badge: v.show_offer_badge ? "10 TK OFF" : null,
  };

  const toggles: { key: keyof ProductCardSettings; label: string }[] = [
    { key: "show_category", label: "ক্যাটাগরি" },
    { key: "show_brand", label: "ব্র্যান্ড" },
    { key: "show_unit", label: "একক" },
    { key: "show_name", label: "নাম" },
    { key: "show_price", label: "দাম" },
    { key: "show_old_price", label: "পুরানো দাম" },
    { key: "show_tag", label: "ট্যাগ" },
    { key: "show_offer_badge", label: "অফার ব্যাজ" },
    { key: "show_reviews", label: "রিভিউ স্টার" },
    { key: "show_add_to_cart", label: "কার্ট বাটন" },
    { key: "show_buy_now", label: "কিনুন বাটন" },
    { key: "show_wishlist", label: "উইশলিস্ট আইকন" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">প্রোডাক্ট কার্ডের প্রতিটি ফিচার অন/অফ করুন এবং অফার ব্যাজ কাস্টমাইজ করুন।</p>

      <Section title="ফিচার অন/অফ" defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {toggles.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm bg-card border border-border rounded-xl px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={Boolean(v[t.key])} onChange={toggle(t.key)} className="size-4 accent-primary" />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="বাটন টেক্সট" defaultOpen>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="কার্ট বাটন টেক্সট">
            <input className={inputCls} value={v.add_to_cart_text_bn} onChange={(e) => set("add_to_cart_text_bn", e.target.value)} />
          </Field>
          <Field label="কিনুন বাটন টেক্সট">
            <input className={inputCls} value={v.buy_now_text_bn} onChange={(e) => set("buy_now_text_bn", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="অফার ব্যাজ স্টাইল" defaultOpen>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="ব্যাজ স্টাইল">
            <select className={inputCls} value={v.badge_style} onChange={(e) => set("badge_style", e.target.value as ProductCardSettings["badge_style"])}>
              <option value="starburst">স্টারবার্স্ট (ছবির মতো)</option>
              <option value="ribbon">রিবন</option>
              <option value="pill">পিল</option>
            </select>
          </Field>
          <Field label="ব্যাজ ব্যাকগ্রাউন্ড">
            <input type="color" className="h-11 w-full rounded-xl bg-secondary border-0" value={v.badge_bg} onChange={(e) => set("badge_bg", e.target.value)} />
          </Field>
          <Field label="ব্যাজ টেক্সট রঙ">
            <input type="color" className="h-11 w-full rounded-xl bg-secondary border-0" value={v.badge_color} onChange={(e) => set("badge_color", e.target.value)} />
          </Field>
        </div>
        <p className="text-[11px] text-muted-foreground">প্রতিটি পণ্যের জন্য ব্যাজের টেক্সট (যেমন "10 TK OFF") অ্যাডমিন প্যানেলের পণ্য পেজ থেকে সেট করুন।</p>
      </Section>

      <Section title="লাইভ প্রিভিউ" defaultOpen>
        <div className="max-w-[260px] mx-auto">
          <ProductCard
            product={sample}
            categoryName="মাছ"
            brandName="Fresh Fish"
            qty={0}
            add={() => {}}
            sub={() => {}}
            onBuyNow={() => {}}
            settings={v}
          />
        </div>
      </Section>
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
        <Section title="টাইটেল ও ব্যাজ">
          <Field label="ব্যাজ টেক্সট"><input className={inputCls} value={s.badge_bn} onChange={(e) => setItem({ badge_bn: e.target.value } as any)} /></Field>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="টাইটেল প্রথম অংশ"><input className={inputCls} value={s.title_bn} onChange={(e) => setItem({ title_bn: e.target.value } as any)} /></Field>
            <Field label="হাইলাইট অংশ"><input className={inputCls} value={s.title_highlight_bn} onChange={(e) => setItem({ title_highlight_bn: e.target.value } as any)} /></Field>
            <Field label="শেষ অংশ"><input className={inputCls} value={s.title_suffix_bn} onChange={(e) => setItem({ title_suffix_bn: e.target.value } as any)} /></Field>
          </div>
          <Field label="সাবটাইটেল"><textarea className={areaCls} value={s.subtitle_bn} onChange={(e) => setItem({ subtitle_bn: e.target.value } as any)} /></Field>
        </Section>

        <Section title="বাটন সেটিং">
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
        </Section>

        <Section
          title="স্লাইডার ইমেজ"
          right={
            <button type="button" onClick={() => setImages([...images, ""])}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-secondary text-xs font-semibold">
              <Plus className="size-3.5" /> ইমেজ
            </button>
          }
        >
          <div className="grid md:grid-cols-2 gap-3">
            {images.map((url, i) => (
              <div key={i} className="rounded-xl border border-border p-2 space-y-2 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold">স্লাইড {i + 1}</span>
                  <div className="flex gap-1">
                    <button type="button" disabled={i === 0} onClick={() => { const n = [...images]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setImages(n); }}
                      className="h-6 px-1.5 rounded-md bg-secondary border border-border text-[11px] disabled:opacity-40">↑</button>
                    <button type="button" disabled={i === images.length - 1} onClick={() => { const n = [...images]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setImages(n); }}
                      className="h-6 px-1.5 rounded-md bg-secondary border border-border text-[11px] disabled:opacity-40">↓</button>
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="size-6 rounded-md bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-3" /></button>
                  </div>
                </div>
                <ImageInput value={url} onChange={(u) => { const n = [...images]; n[i] = u; setImages(n); }} folder="hero" />
              </div>
            ))}
          </div>
          <Field label="ফ্যালব্যাক ইমেজ" hint="স্লাইডার খালি থাকলে এটি দেখাবে">
            <ImageInput value={s.image_url} onChange={(url) => setItem({ image_url: url } as any)} folder="hero" />
          </Field>
        </Section>

        <Section title="হিরো লেয়াউট">
          <Field label="হিরো অ্যাসপেক্ট রেশিও (ডেস্কটপ)" hint="যেমন: 21/9 (চিকন), 16/9, 4/3 (লম্বা)। মোবাইলে সবসময় 4/3।">
            <input className={inputCls} value={s.aspect_ratio ?? "21/9"} onChange={(e) => setItem({ aspect_ratio: e.target.value } as any)} placeholder="21/9" />
          </Field>
        </Section>
      </div>
    );
  }
  if (s.type === "category") {
    return (
      <Section title="ক্যাটাগরি সেটিং">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="টাইটেল"><input className={inputCls} value={s.title_bn} onChange={(e) => setItem({ title_bn: e.target.value } as any)} /></Field>
          <Field label="সাবটাইটেল"><input className={inputCls} value={s.subtitle_bn} onChange={(e) => setItem({ subtitle_bn: e.target.value } as any)} /></Field>
        </div>
      </Section>
    );
  }
  if (s.type === "product") {
    return (
      <Section title="পণ্য সেকশন সেটিং">
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
          <Field label="ডিসপ্লে স্টাইল">
            <select className={inputCls} value={(s as any).display ?? "slider"} onChange={(e) => setItem({ display: e.target.value } as any)}>
              <option value="slider">স্লাইডার (অ্যারো সহ)</option>
              <option value="marquee">অটো মার্কি (অ্যারো ছাড়া)</option>
              <option value="grid">গ্রিড (রো × কলাম)</option>
            </select>
          </Field>
          {((s as any).display ?? "slider") === "grid" && (
            <>
              <Field label="রো (লাইন) সংখ্যা">
                <input type="number" min={1} max={10} className={inputCls} value={(s as any).rows ?? 3} onChange={(e) => setItem({ rows: Math.max(1, Number(e.target.value) || 3) } as any)} />
              </Field>
              <Field label="কলাম সংখ্যা (প্রতি লাইনে)">
                <input type="number" min={1} max={8} className={inputCls} value={(s as any).columns ?? 5} onChange={(e) => setItem({ columns: Math.max(1, Number(e.target.value) || 5) } as any)} />
              </Field>
            </>
          )}
        </div>
      </Section>
    );
  }
  if (s.type === "offer") {
    return (
      <Section title="অফার সেটিং">
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
      </Section>
    );
  }
  // banner
  return (
    <Section title="ব্যানার সেটিং">
      <div className="space-y-3">
        <Field label="ব্যানার ইমেজ"><ImageInput value={s.image_url} onChange={(url) => setItem({ image_url: url } as any)} folder="banner" /></Field>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="ক্যাপশন (ঐচ্ছিক)"><input className={inputCls} value={s.caption_bn} onChange={(e) => setItem({ caption_bn: e.target.value } as any)} /></Field>
          <Field label="লিংক (ঐচ্ছিক)" hint="ক্লিক করলে এই URL এ যাবে"><input className={inputCls} value={s.link} onChange={(e) => setItem({ link: e.target.value } as any)} placeholder="/products?cat=…" /></Field>
        </div>
      </div>
    </Section>
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

function Section({ title, defaultOpen = false, right, children }: {
  title: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-border bg-secondary/30 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <ChevronDown className={`size-4 text-[var(--leaf-deep)] transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
          <h3 className="text-sm font-bold text-[var(--leaf-deep)]">{title}</h3>
        </button>
        {right}
      </div>
      {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
    </section>
  );
}

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
      <div className="rounded-2xl border border-border p-3 space-y-3 bg-secondary/30">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={!!v.notice_enabled} onChange={(e) => on({ ...v, notice_enabled: e.target.checked })} className="size-4 accent-primary" />
          <span className="text-sm font-semibold">নোটিশ মার্কি দেখান</span>
        </label>
        <Field label="নোটিশ টেক্সট"><input className={inputCls} value={v.notice_bn ?? ""} onChange={(e) => on({ ...v, notice_bn: e.target.value })} placeholder="যেমন: ঈদ উপলক্ষে ১০% ছাড়! কুপন: EID10" /></Field>
        <Field label="স্ক্রল স্পিড (সেকেন্ড)" hint="কম মান = দ্রুত স্ক্রল">
          <input type="number" min={5} max={120} className={inputCls} value={v.notice_speed ?? 30} onChange={(e) => on({ ...v, notice_speed: Number(e.target.value) || 30 })} />
        </Field>
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
function FooterTab({ v, on }: { v: SiteSettings["footer"]; on: (v: SiteSettings["footer"]) => void }) {
  return (
    <div className="space-y-4">
      <Field label="সংক্ষিপ্ত পরিচিতি"><textarea className={areaCls} value={v.about_bn} onChange={(e) => on({ ...v, about_bn: e.target.value })} /></Field>
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="ফোন"><input className={inputCls} value={v.phone} onChange={(e) => on({ ...v, phone: e.target.value })} /></Field>
        <Field label="ইমেইল"><input className={inputCls} value={v.email} onChange={(e) => on({ ...v, email: e.target.value })} /></Field>
        <Field label="ঠিকানা"><input className={inputCls} value={v.address_bn} onChange={(e) => on({ ...v, address_bn: e.target.value })} /></Field>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="ক্যাটাগরি কলাম হেডিং"><input className={inputCls} value={v.categories_title_bn} onChange={(e) => on({ ...v, categories_title_bn: e.target.value })} /></Field>
        <Field label="যোগাযোগ কলাম হেডিং"><input className={inputCls} value={v.contact_title_bn} onChange={(e) => on({ ...v, contact_title_bn: e.target.value })} /></Field>
      </div>
      <Field label="কপিরাইট টেক্সট ({year} এবং {brand} ব্যবহার করতে পারেন)">
        <input className={inputCls} value={v.copyright_bn} onChange={(e) => on({ ...v, copyright_bn: e.target.value })} />
      </Field>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="ব্যাকগ্রাউন্ড কালার (খালি = ডিফল্ট)"><input type="text" placeholder="#0a4a2a" className={inputCls} value={v.bg_color} onChange={(e) => on({ ...v, bg_color: e.target.value })} /></Field>
        <Field label="টেক্সট কালার (খালি = ডিফল্ট)"><input type="text" placeholder="#ffffff" className={inputCls} value={v.text_color} onChange={(e) => on({ ...v, text_color: e.target.value })} /></Field>
      </div>
      <div className="grid md:grid-cols-2 gap-3 pt-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.show_brand_column} onChange={(e) => on({ ...v, show_brand_column: e.target.checked })} /> ব্র্যান্ড কলাম দেখান</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.show_categories_column} onChange={(e) => on({ ...v, show_categories_column: e.target.checked })} /> ক্যাটাগরি কলাম দেখান</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.show_contact_column} onChange={(e) => on({ ...v, show_contact_column: e.target.checked })} /> যোগাযোগ কলাম দেখান</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.show_copyright} onChange={(e) => on({ ...v, show_copyright: e.target.checked })} /> কপিরাইট দেখান</label>
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
      <Section title="হেডার — টপ বার">
        <TopbarTab v={topbar} on={onTopbar} />
      </Section>

      <Section
        title="হেডার মেনু"
        right={
          <button type="button" onClick={() => setItems([...items, { label_bn: "", url: "/" }])}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            <Plus className="size-3.5" /> মেনু যোগ
          </button>
        }
      >
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
      </Section>

      <Section title="ফুটার">
        <FooterTab v={footer} on={onFooter} />
      </Section>
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

      <Section title="Meta (Facebook) Pixel + Conversions API">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Pixel ID" hint="যেমন: 1234567890"><input className={inputCls} value={v.meta_pixel_id} onChange={(e) => on({ ...v, meta_pixel_id: e.target.value.trim() })} /></Field>
          <Field label="Test Event Code" hint="Events Manager → Test events"><input className={inputCls} value={v.meta_test_event_code} onChange={(e) => on({ ...v, meta_test_event_code: e.target.value.trim() })} /></Field>
        </div>
        <Field label="Conversions API Access Token" hint="Events Manager → Settings → Generate access token। সার্ভার থেকে CAPI ইভেন্ট পাঠাতে এটি লাগবে।">
          <textarea className={areaCls} value={v.meta_capi_token} onChange={(e) => on({ ...v, meta_capi_token: e.target.value.trim() })} />
        </Field>
      </Section>

      <Section title="Google Analytics 4 / Google Ads">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="GA4 Measurement ID" hint="যেমন: G-XXXXXXX"><input className={inputCls} value={v.ga4_id} onChange={(e) => on({ ...v, ga4_id: e.target.value.trim() })} /></Field>
          <Field label="Google Ads ID" hint="যেমন: AW-123456789"><input className={inputCls} value={v.google_ads_id} onChange={(e) => on({ ...v, google_ads_id: e.target.value.trim() })} /></Field>
        </div>
        <Field label="Google Ads Purchase Conversion Label" hint="ঐচ্ছিক"><input className={inputCls} value={v.google_ads_purchase_label} onChange={(e) => on({ ...v, google_ads_purchase_label: e.target.value.trim() })} /></Field>
      </Section>

      <Section title="Google Tag Manager">
        <Field label="GTM Container ID" hint="যেমন: GTM-XXXXXX"><input className={inputCls} value={v.gtm_id} onChange={(e) => on({ ...v, gtm_id: e.target.value.trim() })} /></Field>
      </Section>

      <Section title="TikTok Pixel">
        <Field label="TikTok Pixel ID"><input className={inputCls} value={v.tiktok_pixel_id} onChange={(e) => on({ ...v, tiktok_pixel_id: e.target.value.trim() })} /></Field>
      </Section>

      <Section title="কাস্টম স্ক্রিপ্ট">
        <Field label="Head HTML" hint="<script>...</script> বা যেকোনো verification ট্যাগ"><textarea className={areaCls + " font-mono text-xs"} value={v.head_html} onChange={(e) => on({ ...v, head_html: e.target.value })} /></Field>
        <Field label="Body HTML" hint="<noscript> পিক্সেল / চ্যাট উইজেট ইত্যাদি"><textarea className={areaCls + " font-mono text-xs"} value={v.body_html} onChange={(e) => on({ ...v, body_html: e.target.value })} /></Field>
      </Section>

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
  const moveOpt = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= v.options.length) return;
    const n = [...v.options];
    [n[i], n[j]] = [n[j], n[i]];
    on({ ...v, options: n });
  };
  const addOpt = () => {
    on({ ...v, options: [...v.options, { label_bn: "", charge: 0, enabled: true }] });
  };
  const removeOpt = (i: number) => {
    on({ ...v, options: v.options.filter((_, idx) => idx !== i) });
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
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={o.enabled} onChange={(e) => setOpt(i, { enabled: e.target.checked })} className="size-4 accent-primary" />
                  <span>সক্রিয়</span>
                </label>
                <button type="button" disabled={i === 0} onClick={() => moveOpt(i, -1)} className="h-8 px-2 rounded-md bg-card border border-border text-xs disabled:opacity-40">↑</button>
                <button type="button" disabled={i === v.options.length - 1} onClick={() => moveOpt(i, 1)} className="h-8 px-2 rounded-md bg-card border border-border text-xs disabled:opacity-40">↓</button>
                <button type="button" onClick={() => removeOpt(i)} className="size-8 rounded-md bg-destructive/10 text-destructive grid place-items-center" title="মুছুন"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="লেবেল (বাংলা)"><input className={inputCls} value={o.label_bn} onChange={(e) => setOpt(i, { label_bn: e.target.value })} placeholder="যেমন: ঢাকার ভিতরে" /></Field>
              <Field label="চার্জ (৳)"><input type="number" min={0} className={inputCls} value={o.charge} onChange={(e) => setOpt(i, { charge: Number(e.target.value) || 0 })} /></Field>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addOpt}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-secondary border border-border text-sm font-semibold hover:bg-secondary/80 transition">
        <Plus className="size-4" /> নতুন অপশন যোগ করুন
      </button>
    </div>
  );
}
