import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Loader2, ChevronUp, ChevronDown, Search, Copy } from "lucide-react";
import { ImageInput } from "@/components/ImageInput";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/brands")({
  component: AdminBrands,
});

type Cat = { id: string; name_bn: string; slug: string; sort_order: number; image_url: string | null; keywords: string | null; is_active: boolean };

function AdminBrands() {
  const [items, setItems] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [form, setForm] = useState({ name_bn: "", slug: "", sort_order: 0, image_url: "", keywords: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("sort_asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("brands").select("*").order("sort_order");
    setItems((data as Cat[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name_bn: "", slug: "", sort_order: items.length + 1, image_url: "", keywords: "" }); setOpen(true); };
  const openEdit = (c: Cat) => { setEditing(c); setForm({ name_bn: c.name_bn, slug: c.slug, sort_order: c.sort_order, image_url: c.image_url ?? "", keywords: c.keywords ?? "" }); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, image_url: form.image_url || null, keywords: form.keywords.trim() || null };
    const { error } = editing
      ? await supabase.from("brands").update(payload).eq("id", editing.id)
      : await supabase.from("brands").insert(payload);
    setSaving(false);
    if (error) return toast.error("সেভ ব্যর্থ: " + error.message);
    toast.success(editing ? "ব্র্যান্ড আপডেট হয়েছে" : "নতুন ব্র্যান্ড যোগ হয়েছে");
    setOpen(false); await load();
  };

  const remove = async (id: string) => {
    if (!confirm("ব্র্যান্ড মুছবেন?")) return;
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) return toast.error("মুছতে ব্যর্থ: " + error.message);
    toast.success("ব্র্যান্ড মুছে গেছে");
    await load();
  };

  const toggleActive = async (c: Cat) => {
    const next = !c.is_active;
    setItems((arr) => arr.map((x) => (x.id === c.id ? { ...x, is_active: next } : x)));
    const { error } = await supabase.from("brands").update({ is_active: next }).eq("id", c.id);
    if (error) { toast.error(error.message); await load(); }
  };

  const toggleSelect = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = (ids: string[]) => setSelected((p) => {
    const all = ids.every((id) => p.has(id));
    const n = new Set(p);
    if (all) ids.forEach((id) => n.delete(id)); else ids.forEach((id) => n.add(id));
    return n;
  });
  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`${selected.size}টি ব্র্যান্ড মুছবেন?`)) return;
    setBulkDeleting(true);
    const { error } = await supabase.from("brands").delete().in("id", Array.from(selected));
    setBulkDeleting(false);
    if (error) return toast.error("মুছতে ব্যর্থ: " + error.message);
    toast.success(`${selected.size}টি মুছে গেছে`);
    setSelected(new Set());
    await load();
  };

  const duplicate = async (c: Cat) => {
    const payload = {
      name_bn: c.name_bn + " (কপি)",
      slug: c.slug + "-copy-" + Date.now().toString(36),
      sort_order: items.length + 1,
      image_url: c.image_url,
      keywords: c.keywords,
    };
    const { error } = await supabase.from("brands").insert(payload);
    if (error) return toast.error("ডুপ্লিকেট ব্যর্থ: " + error.message);
    toast.success("ব্র্যান্ড ডুপ্লিকেট হয়েছে");
    await load();
  };

  const filtered = items
    .filter((c) => c.name_bn.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()))
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
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[i], b = items[j];
    // swap sort_order
    const next = [...items];
    next[i] = { ...a, sort_order: b.sort_order };
    next[j] = { ...b, sort_order: a.sort_order };
    setItems(next.sort((x, y) => x.sort_order - y.sort_order));
    const [r1, r2] = await Promise.all([
      supabase.from("brands").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("brands").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    if (r1.error || r2.error) { toast.error((r1.error || r2.error)!.message); await load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">ব্র্যান্ড</h1>
          <p className="text-sm text-muted-foreground mt-1">মোট {items.length}টি ব্র্যান্ড</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={bulkDelete} disabled={bulkDeleting}
              className="h-11 px-4 rounded-xl bg-destructive text-destructive-foreground font-semibold inline-flex items-center gap-2 disabled:opacity-60">
              {bulkDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {selected.size}টি মুছুন
            </button>
          )}
          <button onClick={openNew} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-soft)]">
            <Plus className="size-4" /> নতুন ব্র্যান্ড
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ব্র্যান্ড খুঁজুন..."
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border outline-none focus:border-primary text-sm" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="shrink-0 h-11 px-3 max-w-[45%] sm:max-w-none rounded-xl bg-card border border-border outline-none focus:border-primary text-sm font-medium truncate">
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
          <div className="p-12 text-center text-muted-foreground text-sm">কোনো ব্র্যান্ড নেই।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="p-3 w-10">
                    <input type="checkbox" className="size-4 accent-[color:var(--primary)]"
                      checked={filtered.length > 0 && filtered.every((c) => selected.has(c.id))}
                      onChange={() => toggleSelectAll(filtered.map((c) => c.id))} />
                  </th>
                  <th className="p-3 font-semibold">ব্র্যান্ড</th>
                  <th className="p-3 font-semibold hidden md:table-cell">Slug</th>
                  <th className="p-3 font-semibold hidden sm:table-cell">Sort</th>
                  <th className="p-3 font-semibold">স্ট্যাটাস</th>
                  <th className="p-3 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-3">
                      <input type="checkbox" className="size-4 accent-[color:var(--primary)]"
                        checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg grid place-items-center text-2xl overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
                          {c.image_url ? <img src={c.image_url} alt="" className="size-full object-cover" /> : "🛒"}
                        </div>
                        <div className="font-semibold">{c.name_bn}</div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">/{c.slug}</td>
                    <td className="p-3 hidden sm:table-cell">{c.sort_order}</td>
                    <td className="p-3">
                      <button onClick={() => toggleActive(c)} title={c.is_active ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${c.is_active ? "bg-primary" : "bg-muted"}`}>
                        <span className={`inline-block size-5 transform rounded-full bg-white shadow transition ${c.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="size-8 rounded-lg hover:bg-secondary grid place-items-center disabled:opacity-30 disabled:hover:bg-transparent" title="উপরে"><ChevronUp className="size-4" /></button>
                        <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="size-8 rounded-lg hover:bg-secondary grid place-items-center disabled:opacity-30 disabled:hover:bg-transparent" title="নিচে"><ChevronDown className="size-4" /></button>
                        <button onClick={() => duplicate(c)} title="ডুপ্লিকেট" className="size-8 rounded-lg hover:bg-secondary grid place-items-center"><Copy className="size-4" /></button>
                        <button onClick={() => openEdit(c)} className="size-8 rounded-lg hover:bg-secondary grid place-items-center"><Pencil className="size-4" /></button>
                        <button onClick={() => remove(c.id)} className="size-8 rounded-lg hover:bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-4" /></button>
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
              <h2 className="font-bold text-lg">{editing ? "ব্র্যান্ড আপডেট" : "নতুন ব্র্যান্ড"}</h2>
              <button type="button" onClick={() => setOpen(false)}><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block"><span className="text-sm font-medium block mb-1">নাম (বাংলা)</span>
                <input required value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
              </label>
              <label className="block"><span className="text-sm font-medium block mb-1">Slug</span>
                <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
              </label>
              <label className="block"><span className="text-sm font-medium block mb-1">Sort Order</span>
                <input required type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
              </label>
              <div>
                <span className="text-sm font-medium block mb-1">ব্র্যান্ড লোগো (ঐচ্ছিক)</span>
                <ImageInput value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} folder="brands" />
              </div>
              <label className="block"><span className="text-sm font-medium block mb-1">কীওয়ার্ড (সার্চের জন্য, কমা দিয়ে আলাদা করুন)</span>
                <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="যেমন: pran, acme, ব্র্যান্ড" className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
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
    </div>
  );
}