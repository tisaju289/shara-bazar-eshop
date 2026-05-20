import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Loader2, Search, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Product = {
  id: string;
  name_bn: string;
  category_id: string | null;
  unit: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  tag: string | null;
  stock: number;
  is_active: boolean;
};
type Category = { id: string; name_bn: string; emoji: string };

const emptyForm: Omit<Product, "id"> = {
  name_bn: "", category_id: null, unit: "১ কেজি", price: 0, old_price: null,
  image_url: "", tag: "", stock: 0, is_active: true,
};

function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: cs }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name_bn, emoji").order("sort_order"),
    ]);
    setItems((ps as Product[]) ?? []);
    setCats((cs as Category[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ ...p, old_price: p.old_price ?? null, image_url: p.image_url ?? "", tag: p.tag ?? "" });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null,
      stock: Number(form.stock),
      tag: form.tag || null,
      image_url: form.image_url || null,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    setOpen(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত? এই পণ্য মুছে যাবে।")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return alert(error.message);
    await load();
  };

  const filtered = items.filter((p) => p.name_bn.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">পণ্য ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground mt-1">মোট {items.length}টি পণ্য</p>
        </div>
        <button onClick={openNew} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-soft)]">
          <Plus className="size-4" /> নতুন পণ্য
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="পণ্য খুঁজুন..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border outline-none focus:border-primary" />
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
                  <th className="p-3 font-semibold">পণ্য</th>
                  <th className="p-3 font-semibold hidden md:table-cell">একক</th>
                  <th className="p-3 font-semibold">দাম</th>
                  <th className="p-3 font-semibold hidden sm:table-cell">স্টক</th>
                  <th className="p-3 font-semibold">স্ট্যাটাস</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
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
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {p.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
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
              <Field label="ক্যাটাগরি">
                <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className="input">
                  <option value="">— নির্বাচন করুন —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name_bn}</option>)}
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
              <Field label="ছবি URL"><input type="url" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" placeholder="https://..." /></Field>
              <Field label="ট্যাগ (যেমন: সিজনাল, নতুন)"><input value={form.tag ?? ""} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="input" /></Field>
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

      <style>{`.input{width:100%;height:44px;padding:0 14px;border-radius:12px;background:var(--secondary);border:1px solid transparent;outline:none;font-size:14px}.input:focus{border-color:var(--primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium block mb-1">{label}</span>{children}</label>;
}