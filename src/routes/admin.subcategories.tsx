import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Loader2, ChevronUp, ChevronDown, Search, Copy } from "lucide-react";
import { ImageInput } from "@/components/ImageInput";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subcategories")({
  component: AdminSubcategories,
});

type Category = { id: string; name_bn: string };
type SubCat = {
  id: string;
  category_id: string | null;
  name_bn: string;
  slug: string;
  sort_order: number;
  image_url: string | null;
  keywords: string | null;
};

function AdminSubcategories() {
  const [items, setItems] = useState<SubCat[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubCat | null>(null);
  const [form, setForm] = useState({
    category_id: "",
    name_bn: "",
    slug: "",
    sort_order: 0,
    image_url: "",
    keywords: "",
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("sort_asc");
  const [catFilter, setCatFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [{ data: sc }, { data: cs }] = await Promise.all([
      supabase.from("subcategories").select("*").order("category_id").order("sort_order"),
      supabase.from("categories").select("id,name_bn").order("sort_order"),
    ]);
    setItems((sc as SubCat[]) ?? []);
    setCats((cs as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ category_id: "", name_bn: "", slug: "", sort_order: items.length + 1, image_url: "", keywords: "" });
    setOpen(true);
  };
  const openEdit = (s: SubCat) => {
    setEditing(s);
    setForm({
      category_id: s.category_id ?? "",
      name_bn: s.name_bn,
      slug: s.slug,
      sort_order: s.sort_order,
      image_url: s.image_url ?? "",
      keywords: s.keywords ?? "",
    });
    setOpen(true);
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_id) return toast.error("ক্যাটাগরি বেছে নিন");
    setSaving(true);
    const payload = {
      category_id: form.category_id,
      name_bn: form.name_bn.trim(),
      slug: form.slug.trim() || autoSlug(form.name_bn),
      sort_order: Number(form.sort_order),
      image_url: form.image_url || null,
      keywords: form.keywords.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("subcategories").update(payload).eq("id", editing.id)
      : await supabase.from("subcategories").insert(payload);
    setSaving(false);
    if (error) return toast.error("সেভ ব্যর্থ: " + error.message);
    toast.success(editing ? "সাব-ক্যাটাগরি আপডেট হয়েছে" : "নতুন সাব-ক্যাটাগরি যোগ হয়েছে");
    setOpen(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("সাব-ক্যাটাগরি মুছবেন?")) return;
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) return toast.error("মুছতে ব্যর্থ: " + error.message);
    toast.success("সাব-ক্যাটাগরি মুছে গেছে");
    await load();
  };

  const duplicate = async (s: SubCat) => {
    const payload = {
      category_id: s.category_id,
      name_bn: s.name_bn + " (কপি)",
      slug: s.slug + "-copy-" + Date.now().toString(36),
      sort_order: items.length + 1,
      image_url: s.image_url,
      keywords: s.keywords,
    };
    const { error } = await supabase.from("subcategories").insert(payload);
    if (error) return toast.error("ডুপ্লিকেট ব্যর্থ: " + error.message);
    toast.success("সাব-ক্যাটাগরি ডুপ্লিকেট হয়েছে");
    await load();
  };

  const filtered = items
    .filter((s) => (catFilter === "all" || s.category_id === catFilter))
    .filter((s) => s.name_bn.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return a.name_bn.localeCompare(b.name_bn, "bn");
        case "name_desc": return b.name_bn.localeCompare(a.name_bn, "bn");
        case "sort_desc": return b.sort_order - a.sort_order;
        default: return a.sort_order - b.sort_order;
      }
    });

  const move = async (i: number, dir: -1 | 1) => {
    const visible = items;
    const j = i + dir;
    if (j < 0 || j >= visible.length) return;
    const a = visible[i], b = visible[j];
    const next = items.map((x) => {
      if (x.id === a.id) return { ...x, sort_order: b.sort_order };
      if (x.id === b.id) return { ...x, sort_order: a.sort_order };
      return x;
    });
    setItems(next);
    const [r1, r2] = await Promise.all([
      supabase.from("subcategories").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("subcategories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    if (r1.error || r2.error) { toast.error((r1.error || r2.error)!.message); await load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">সাব-ক্যাটাগরি</h1>
          <p className="text-sm text-muted-foreground mt-1">মোট {items.length}টি সাব-ক্যাটাগরি</p>
        </div>
        <button
          onClick={openNew}
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-soft)]"
        >
          <Plus className="size-4" /> নতুন সাব-ক্যাটাগরি
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 w-full flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="সাব-ক্যাটাগরি খুঁজুন..."
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border outline-none focus:border-primary text-sm" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="shrink-0 h-11 px-3 rounded-xl bg-card border border-border outline-none focus:border-primary text-sm font-medium truncate max-w-[45%] sm:max-w-none">
          <option value="all">সব ক্যাটাগরি</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="shrink-0 h-11 px-3 rounded-xl bg-card border border-border outline-none focus:border-primary text-sm font-medium truncate max-w-[45%] sm:max-w-none">
          <option value="sort_asc">ক্রম ↑</option>
          <option value="sort_desc">ক্রম ↓</option>
          <option value="name_asc">নাম (A-Z)</option>
          <option value="name_desc">নাম (Z-A)</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="size-6 animate-spin inline text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            কোনো সাব-ক্যাটাগরি নেই। উপরের বাটন থেকে নতুন সাব-ক্যাটাগরি যোগ করুন।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="p-3 font-semibold">সাব-ক্যাটাগরি</th>
                  <th className="p-3 font-semibold hidden sm:table-cell">ক্যাটাগরি</th>
                  <th className="p-3 font-semibold hidden md:table-cell">স্লাগ</th>
                  <th className="p-3 font-semibold hidden md:table-cell">ক্রম</th>
                  <th className="p-3 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-10 rounded-lg overflow-hidden grid place-items-center shrink-0"
                          style={{ background: "var(--gradient-warm)" }}
                        >
                          {s.image_url ? (
                            <img src={s.image_url} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="text-lg">📂</span>
                          )}
                        </div>
                        <span className="font-semibold">{s.name_bn}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">
                      {cats.find((c) => c.id === s.category_id)?.name_bn ?? "—"}
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell font-mono text-xs">{s.slug}</td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          className="size-7 rounded hover:bg-secondary grid place-items-center disabled:opacity-30"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <span className="text-xs text-muted-foreground w-5 text-center">{s.sort_order}</span>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === items.length - 1}
                          className="size-7 rounded hover:bg-secondary grid place-items-center disabled:opacity-30"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => duplicate(s)} title="ডুপ্লিকেট" className="size-8 rounded-lg hover:bg-secondary grid place-items-center">
                          <Copy className="size-4" />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="size-8 rounded-lg hover:bg-secondary grid place-items-center"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => remove(s.id)}
                          className="size-8 rounded-lg hover:bg-destructive/10 text-destructive grid place-items-center"
                        >
                          <Trash2 className="size-4" />
                        </button>
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
          <form onSubmit={save} className="relative bg-background rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-background flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">{editing ? "সাব-ক্যাটাগরি আপডেট" : "নতুন সাব-ক্যাটাগরি"}</h2>
              <button type="button" onClick={() => setOpen(false)}><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="ক্যাটাগরি *">
                <select
                  required
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="input"
                >
                  <option value="">— ক্যাটাগরি নির্বাচন করুন —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_bn}</option>
                  ))}
                </select>
              </Field>
              <Field label="সাব-ক্যাটাগরির নাম (বাংলা) *">
                <input
                  required
                  value={form.name_bn}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm({ ...form, name_bn: name, slug: form.slug || autoSlug(name) });
                  }}
                  className="input"
                />
              </Field>
              <Field label="স্লাগ (URL)">
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto-generated"
                  className="input"
                />
              </Field>
              <Field label="ক্রম (sort order)">
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="input"
                />
              </Field>
              <Field label="ছবি">
                <ImageInput
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  folder="subcategories"
                />
              </Field>
              <Field label="কীওয়ার্ড (কমা দিয়ে আলাদা করুন)">
                <input
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="যেমন: fish, মাছ, fresh"
                  className="input"
                />
              </Field>
            </div>
            <div className="sticky bottom-0 bg-background p-5 border-t border-border flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-xl bg-secondary font-semibold"
              >
                বাতিল
              </button>
              <button
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "আপডেট" : "সংরক্ষণ"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`.input{width:100%;height:44px;padding:0 14px;border-radius:12px;background:var(--secondary);border:1px solid transparent;outline:none;font-size:14px}.input:focus{border-color:var(--primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1">{label}</span>
      {children}
    </label>
  );
}
