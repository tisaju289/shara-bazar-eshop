import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Loader2, Search, Image as ImageIcon, Copy, Upload, Download } from "lucide-react";
import { ImageInput } from "@/components/ImageInput";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Product = {
  id: string;
  slug?: string | null;
  name_bn: string;
  category_id: string | null;
  subcategory_id: string | null;
  brand_id: string | null;
  unit: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  tag: string | null;
  stock: number;
  is_active: boolean;
  keywords: string | null;
  reviews_rating: number | null;
  reviews_count: number | null;
  offer_badge: string | null;
};
type Category = { id: string; name_bn: string };
type Brand = { id: string; name_bn: string };
type SubCat = { id: string; category_id: string | null; name_bn: string };

const emptyForm: Omit<Product, "id"> = {
  name_bn: "", slug: "", category_id: null, subcategory_id: null, brand_id: null, unit: "১ কেজি", price: 0, old_price: null,
  image_url: "", tag: "", stock: 0, is_active: true, keywords: "",
  reviews_rating: 0, reviews_count: 0, offer_badge: "",
};

function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [subCats, setSubCats] = useState<SubCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: cs }, { data: bs }, scResult] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name_bn").order("sort_order"),
      supabase.from("brands").select("id, name_bn").order("sort_order"),
      supabase.from("subcategories").select("id, category_id, name_bn").order("sort_order"),
    ]);
    setItems((ps as Product[]) ?? []);
    setCats((cs as Category[]) ?? []);
    setBrands((bs as Brand[]) ?? []);
    setSubCats((scResult.data as SubCat[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      ...p,
      subcategory_id: p.subcategory_id ?? null,
      old_price: p.old_price ?? null,
      image_url: p.image_url ?? "",
      tag: p.tag ?? "",
      keywords: p.keywords ?? "",
      reviews_rating: p.reviews_rating ?? 0,
      reviews_count: p.reviews_count ?? 0,
      offer_badge: p.offer_badge ?? "",
    });
    setOpen(true);
  };

  const filteredSubCats = form.category_id
    ? subCats.filter((s) => s.category_id === form.category_id)
    : [];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const slugValue = form.slug?.trim();
    const payload = {
      ...form,
      ...(slugValue ? { slug: slugValue } : { slug: undefined }),
      price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null,
      stock: Number(form.stock),
      tag: form.tag || null,
      image_url: form.image_url || null,
      keywords: form.keywords?.trim() || null,
      reviews_rating: Number(form.reviews_rating) || 0,
      reviews_count: Number(form.reviews_count) || 0,
      offer_badge: form.offer_badge?.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error("সেভ ব্যর্থ: " + error.message);
    toast.success(editing ? "পণ্য আপডেট হয়েছে" : "নতুন পণ্য যোগ হয়েছে");
    setOpen(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত? এই পণ্য মুছে যাবে।")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error("মুছতে ব্যর্থ: " + error.message);
    toast.success("পণ্য মুছে গেছে");
    await load();
  };

  const duplicate = async (p: Product) => {
    const { id, slug: _slug, ...rest } = p;
    const payload = {
      ...rest,
      name_bn: p.name_bn + " (কপি)",
      reviews_count: rest.reviews_count ?? 0,
    };
    const { error } = await supabase.from("products").insert(payload);
    if (error) return toast.error("ডুপ্লিকেট ব্যর্থ: " + error.message);
    toast.success("পণ্য ডুপ্লিকেট হয়েছে");
    await load();
  };

  const toggleActive = async (p: Product) => {
    const next = !p.is_active;
    setItems((arr) => arr.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)));
    const { error } = await supabase.from("products").update({ is_active: next }).eq("id", p.id);
    if (error) { toast.error(error.message); await load(); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        const n = new Set(prev);
        ids.forEach((id) => n.delete(id));
        return n;
      }
      const n = new Set(prev);
      ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}টি পণ্য মুছে ফেলবেন?`)) return;
    setBulkDeleting(true);
    const { error } = await supabase.from("products").delete().in("id", Array.from(selected));
    setBulkDeleting(false);
    if (error) return toast.error("মুছতে ব্যর্থ: " + error.message);
    toast.success(`${selected.size}টি পণ্য মুছে গেছে`);
    setSelected(new Set());
    await load();
  };

  // ===== Bulk import (CSV) =====
  const CSV_HEADERS = ["name_bn","category","subcategory","brand","unit","price","old_price","stock","tag","image_url","offer_badge","reviews_rating","reviews_count","keywords","is_active"];

  const downloadTemplate = () => {
    const sample = [
      CSV_HEADERS.join(","),
      `"আলু","সবজি","","","১ কেজি",60,70,100,"নতুন","","10 TK OFF",4.5,20,"aloo, potato",true`,
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): Record<string, string>[] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { cur.push(field); field = ""; }
        else if (c === "\n" || c === "\r") {
          if (field !== "" || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ""; }
          if (c === "\r" && text[i + 1] === "\n") i++;
        } else field += c;
      }
    }
    if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
    if (!rows.length) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).filter((r) => r.some((v) => v.trim() !== "")).map((r) => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
      return o;
    });
  };

  const runBulkImport = async () => {
    if (!bulkCsv.trim()) return toast.error("CSV খালি");
    setBulkImporting(true);
    setBulkResult(null);
    const rows = parseCsv(bulkCsv);
    const catMap = new Map(cats.map((c) => [c.name_bn.trim().toLowerCase(), c.id]));
    const brandMap = new Map(brands.map((b) => [b.name_bn.trim().toLowerCase(), b.id]));
    const subMap = new Map(subCats.map((s) => [s.name_bn.trim().toLowerCase(), s.id]));
    const errors: string[] = [];
    const payload: any[] = [];
    rows.forEach((r, idx) => {
      if (!r.name_bn) { errors.push(`লাইন ${idx + 2}: name_bn নেই`); return; }
      const catId = r.category ? catMap.get(r.category.toLowerCase()) ?? null : null;
      if (r.category && !catId) errors.push(`লাইন ${idx + 2}: ক্যাটাগরি "${r.category}" পাওয়া যায়নি`);
      const brandId = r.brand ? brandMap.get(r.brand.toLowerCase()) ?? null : null;
      if (r.brand && !brandId) errors.push(`লাইন ${idx + 2}: ব্র্যান্ড "${r.brand}" পাওয়া যায়নি`);
      const subId = r.subcategory ? subMap.get(r.subcategory.toLowerCase()) ?? null : null;
      payload.push({
        name_bn: r.name_bn,
        category_id: catId,
        subcategory_id: subId,
        brand_id: brandId,
        unit: r.unit || "১ কেজি",
        price: Number(r.price) || 0,
        old_price: r.old_price ? Number(r.old_price) : null,
        stock: Number(r.stock) || 0,
        tag: r.tag || null,
        image_url: r.image_url || null,
        offer_badge: r.offer_badge || null,
        reviews_rating: r.reviews_rating ? Number(r.reviews_rating) : 0,
        reviews_count: r.reviews_count ? Number(r.reviews_count) : 0,
        keywords: r.keywords || null,
        is_active: r.is_active ? !["false","0","no","না"].includes(r.is_active.toLowerCase()) : true,
      });
    });
    let ok = 0, fail = 0;
    // batch insert 100 at a time
    for (let i = 0; i < payload.length; i += 100) {
      const batch = payload.slice(i, i + 100);
      const { error, data } = await supabase.from("products").insert(batch).select("id");
      if (error) { fail += batch.length; errors.push(`ব্যাচ ${Math.floor(i / 100) + 1}: ${error.message}`); }
      else ok += data?.length ?? batch.length;
    }
    setBulkImporting(false);
    setBulkResult({ ok, fail, errors });
    if (ok) toast.success(`${ok}টি পণ্য যোগ হয়েছে`);
    if (fail || errors.length) toast.error(`${errors.length}টি সমস্যা`);
    await load();
  };

  const onCsvFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setBulkCsv(String(reader.result || ""));
    reader.readAsText(f);
  };

  const filtered = items
    .filter((p) => p.name_bn.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return a.name_bn.localeCompare(b.name_bn, "bn");
        case "name_desc": return b.name_bn.localeCompare(a.name_bn, "bn");
        case "price_asc": return a.price - b.price;
        case "price_desc": return b.price - a.price;
        case "stock_asc": return a.stock - b.stock;
        case "stock_desc": return b.stock - a.stock;
        default: return 0;
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">পণ্য ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground mt-1">মোট {items.length}টি পণ্য</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={bulkDelete} disabled={bulkDeleting}
              className="h-11 px-4 rounded-xl bg-destructive text-destructive-foreground font-semibold inline-flex items-center gap-2 disabled:opacity-60">
              {bulkDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {selected.size}টি মুছুন
            </button>
          )}
          <button onClick={() => { setBulkOpen(true); setBulkResult(null); }} className="h-11 px-4 rounded-xl bg-secondary font-semibold inline-flex items-center gap-2">
            <Upload className="size-4" /> বাল্ক ইম্পোর্ট
          </button>
          <button onClick={openNew} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-soft)]">
            <Plus className="size-4" /> নতুন পণ্য
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="পণ্য খুঁজুন..."
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border outline-none focus:border-primary text-sm" />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="shrink-0 h-11 px-3 max-w-[45%] sm:max-w-none rounded-xl bg-card border border-border outline-none focus:border-primary text-sm font-medium truncate"
        >
          <option value="newest">নতুন আগে</option>
          <option value="name_asc">নাম (A-Z)</option>
          <option value="name_desc">নাম (Z-A)</option>
          <option value="price_asc">দাম ↑</option>
          <option value="price_desc">দাম ↓</option>
          <option value="stock_asc">স্টক ↑</option>
          <option value="stock_desc">স্টক ↓</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="size-6 animate-spin inline text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">কোনো পণ্য নেই। উপরের বাটন থেকে নতুন পণ্য যোগ করুন।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      className="size-4 accent-[color:var(--primary)]"
                      checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
                      onChange={() => toggleSelectAll(filtered.map((p) => p.id))}
                    />
                  </th>
                  <th className="p-3 font-semibold">পণ্য</th>
                  <th className="p-3 font-semibold hidden md:table-cell">একক</th>
                  <th className="p-3 font-semibold">দাম</th>
                  <th className="p-3 font-semibold hidden sm:table-cell">স্টক</th>
                  <th className="p-3 font-semibold">স্ট্যাটাস</th>
                  <th className="p-3 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="size-4 accent-[color:var(--primary)]"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg overflow-hidden bg-secondary grid place-items-center text-muted-foreground">
                          {p.image_url ? <img src={p.image_url} alt="" className="size-full object-cover" /> : <ImageIcon className="size-4" />}
                        </div>
                        <div>
                          <div className="font-semibold">{p.name_bn}</div>
                          {p.tag && <span className="text-[10px] font-bold uppercase bg-[var(--chili)]/15 text-[var(--chili)] px-1.5 py-0.5 rounded">{p.tag}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{p.unit}</td>
                    <td className="p-3">
                      <div className="font-bold">৳{p.price}</div>
                      {p.old_price && <div className="text-xs text-muted-foreground line-through">৳{p.old_price}</div>}
                    </td>
                    <td className="p-3 hidden sm:table-cell">{p.stock}</td>
                    <td className="p-3">
                      <button onClick={() => toggleActive(p)} title={p.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${p.is_active ? "bg-primary" : "bg-muted"}`}>
                        <span className={`inline-block size-5 transform rounded-full bg-white shadow transition ${p.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => duplicate(p)} title="ডুপ্লিকেট" className="size-8 rounded-lg hover:bg-secondary grid place-items-center"><Copy className="size-4" /></button>
                        <button onClick={() => openEdit(p)} className="size-8 rounded-lg hover:bg-secondary grid place-items-center"><Pencil className="size-4" /></button>
                        <button onClick={() => remove(p.id)} className="size-8 rounded-lg hover:bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form onSubmit={save} className="relative bg-background rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-background flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">{editing ? "পণ্য আপডেট" : "নতুন পণ্য"}</h2>
              <button type="button" onClick={() => setOpen(false)}><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="পণ্যের নাম (বাংলা)">
                <input required value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} className="input" />
              </Field>
              <Field label="স্লাগ (URL) — ফাঁকা রাখলে অটো তৈরি হবে">
                <input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" placeholder="auto" />
              </Field>
              <Field label="ক্যাটাগরি">
                <select
                  value={form.category_id ?? ""}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value || null, subcategory_id: null })}
                  className="input"
                >
                  <option value="">— নির্বাচন করুন —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
                </select>
              </Field>
              {filteredSubCats.length > 0 && (
                <Field label="সাব-ক্যাটাগরি">
                  <select
                    value={form.subcategory_id ?? ""}
                    onChange={(e) => setForm({ ...form, subcategory_id: e.target.value || null })}
                    className="input"
                  >
                    <option value="">— নির্বাচন করুন (ঐচ্ছিক) —</option>
                    {filteredSubCats.map((s) => <option key={s.id} value={s.id}>{s.name_bn}</option>)}
                  </select>
                </Field>
              )}
              <Field label="ব্র্যান্ড">
                <select value={form.brand_id ?? ""} onChange={(e) => setForm({ ...form, brand_id: e.target.value || null })} className="input">
                  <option value="">— নির্বাচন করুন —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name_bn}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="দাম (৳)"><input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="input" /></Field>
                <Field label="পুরানো দাম (৳)"><input type="number" min="0" step="0.01" value={form.old_price ?? ""} onChange={(e) => setForm({ ...form, old_price: e.target.value ? Number(e.target.value) : null })} className="input" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="একক"><input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input" /></Field>
                <Field label="স্টক"><input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="input" /></Field>
              </div>
              <Field label="পণ্যের ছবি">
                <ImageInput value={form.image_url ?? ""} onChange={(url) => setForm({ ...form, image_url: url })} folder="products" />
              </Field>
              <Field label="ট্যাগ (যেমন: সিজনাল, নতুন)"><input value={form.tag ?? ""} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="input" /></Field>
              <Field label="অফার ব্যাজ (যেমন: 10 TK OFF)">
                <input value={form.offer_badge ?? ""} onChange={(e) => setForm({ ...form, offer_badge: e.target.value })} placeholder="খালি রাখলে দেখাবে না" className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="রিভিউ রেটিং (0-5)">
                  <input type="number" min="0" max="5" step="0.1" value={form.reviews_rating ?? 0}
                    onChange={(e) => setForm({ ...form, reviews_rating: Number(e.target.value) })} className="input" />
                </Field>
                <Field label="রিভিউ সংখ্যা">
                  <input type="number" min="0" value={form.reviews_count ?? 0}
                    onChange={(e) => setForm({ ...form, reviews_count: Number(e.target.value) })} className="input" />
                </Field>
              </div>
              <Field label="কীওয়ার্ড (সার্চের জন্য, কমা দিয়ে আলাদা করুন)">
                <input value={form.keywords ?? ""} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="যেমন: ilish, hilsa, মাছ" className="input" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 accent-[color:var(--primary)]" />
                সক্রিয় (ক্রেতারা দেখতে পাবে)
              </label>
            </div>
            <div className="sticky bottom-0 bg-background p-5 border-t border-border flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl bg-secondary font-semibold">বাতিল</button>
              <button disabled={saving} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "আপডেট" : "সংরক্ষণ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !bulkImporting && setBulkOpen(false)} />
          <div className="relative bg-background rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-background flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">বাল্ক প্রোডাক্ট ইম্পোর্ট (CSV)</h2>
              <button type="button" onClick={() => !bulkImporting && setBulkOpen(false)}><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>কলাম: <code className="text-xs">{CSV_HEADERS.join(", ")}</code></p>
                <p>ক্যাটাগরি/ব্র্যান্ড/সাব-ক্যাটাগরি অবশ্যই বাংলা নাম ঠিক মিল থাকতে হবে (আগে থেকে তৈরি থাকা দরকার)।</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={downloadTemplate} className="h-10 px-4 rounded-xl bg-secondary font-semibold text-sm inline-flex items-center gap-2">
                  <Download className="size-4" /> টেমপ্লেট ডাউনলোড
                </button>
                <label className="h-10 px-4 rounded-xl bg-secondary font-semibold text-sm inline-flex items-center gap-2 cursor-pointer">
                  <Upload className="size-4" /> CSV ফাইল আপলোড
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onCsvFile(e.target.files[0])} />
                </label>
              </div>
              <textarea value={bulkCsv} onChange={(e) => setBulkCsv(e.target.value)}
                placeholder="এখানে CSV পেস্ট করুন..."
                className="w-full h-56 p-3 rounded-xl bg-secondary border border-transparent focus:border-primary outline-none text-xs font-mono" />
              {bulkResult && (
                <div className="text-sm space-y-1 p-3 rounded-xl bg-secondary/60">
                  <div>✅ সফল: <b>{bulkResult.ok}</b> • ❌ ব্যর্থ: <b>{bulkResult.fail}</b></div>
                  {bulkResult.errors.length > 0 && (
                    <ul className="text-xs text-destructive list-disc pl-5 max-h-32 overflow-y-auto">
                      {bulkResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-background p-5 border-t border-border flex gap-2">
              <button type="button" disabled={bulkImporting} onClick={() => setBulkOpen(false)} className="flex-1 h-11 rounded-xl bg-secondary font-semibold">বন্ধ</button>
              <button disabled={bulkImporting || !bulkCsv.trim()} onClick={runBulkImport}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {bulkImporting && <Loader2 className="size-4 animate-spin" />}
                ইম্পোর্ট শুরু
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;height:44px;padding:0 14px;border-radius:12px;background:var(--secondary);border:1px solid transparent;outline:none;font-size:14px}.input:focus{border-color:var(--primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium block mb-1">{label}</span>{children}</label>;
}