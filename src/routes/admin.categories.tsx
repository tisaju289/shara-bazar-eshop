import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

type Cat = { id: string; name_bn: string; slug: string; emoji: string; sort_order: number };

function AdminCategories() {
  const [items, setItems] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [form, setForm] = useState({ name_bn: "", slug: "", emoji: "🛒", sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setItems((data as Cat[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name_bn: "", slug: "", emoji: "🛒", sort_order: items.length + 1 }); setOpen(true); };
  const openEdit = (c: Cat) => { setEditing(c); setForm({ name_bn: c.name_bn, slug: c.slug, emoji: c.emoji, sort_order: c.sort_order }); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = editing
      ? await supabase.from("categories").update(form).eq("id", editing.id)
      : await supabase.from("categories").insert(form);
    setSaving(false);
    if (error) return alert(error.message);
    setOpen(false); await load();
  };

  const remove = async (id: string) => {
    if (!confirm("ক্যাটাগরি মুছবেন?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return alert(error.message);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">ক্যাটাগরি</h1>
          <p className="text-sm text-muted-foreground mt-1">মোট {items.length}টি ক্যাটাগরি</p>
        </div>
        <button onClick={openNew} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-soft)]">
          <Plus className="size-4" /> নতুন ক্যাটাগরি
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="size-6 animate-spin inline text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-[var(--shadow-soft)] transition">
              <div className="size-14 rounded-2xl grid place-items-center text-3xl" style={{ background: "var(--gradient-warm)" }}>{c.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{c.name_bn}</div>
                <div className="text-xs text-muted-foreground truncate">/{c.slug} · order {c.sort_order}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="size-8 rounded-lg hover:bg-secondary grid place-items-center"><Pencil className="size-4" /></button>
                <button onClick={() => remove(c.id)} className="size-8 rounded-lg hover:bg-destructive/10 text-destructive grid place-items-center"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form onSubmit={save} className="relative bg-background rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">{editing ? "ক্যাটাগরি আপডেট" : "নতুন ক্যাটাগরি"}</h2>
              <button type="button" onClick={() => setOpen(false)}><X /></button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block"><span className="text-sm font-medium block mb-1">নাম (বাংলা)</span>
                <input required value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block col-span-1"><span className="text-sm font-medium block mb-1">ইমোজি</span>
                  <input required value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary text-center text-xl" />
                </label>
                <label className="block col-span-2"><span className="text-sm font-medium block mb-1">Slug</span>
                  <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
                </label>
              </div>
              <label className="block"><span className="text-sm font-medium block mb-1">Sort Order</span>
                <input required type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full h-11 px-4 rounded-xl bg-secondary outline-none focus:ring-2 focus:ring-primary" />
              </label>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
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