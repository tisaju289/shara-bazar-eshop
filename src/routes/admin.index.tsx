import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Tags, TrendingUp, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, categories: 0, active: 0, inactive: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: p }, { count: c }, { count: a }, { count: i }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", false),
      ]);
      setStats({ products: p ?? 0, categories: c ?? 0, active: a ?? 0, inactive: i ?? 0 });
    })();
  }, []);

  const cards = [
    { label: "মোট পণ্য", value: stats.products, icon: Package, color: "var(--leaf)" },
    { label: "ক্যাটাগরি", value: stats.categories, icon: Tags, color: "var(--mango)" },
    { label: "সক্রিয় পণ্য", value: stats.active, icon: Eye, color: "var(--primary-glow)" },
    { label: "নিষ্ক্রিয় পণ্য", value: stats.inactive, icon: EyeOff, color: "var(--chili)" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground text-sm mt-1">আপনার দোকানের সর্বশেষ অবস্থা এক নজরে</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-5 hover:shadow-[var(--shadow-soft)] transition">
            <div className="size-10 rounded-xl grid place-items-center text-white" style={{ background: c.color }}>
              <c.icon className="size-5" />
            </div>
            <div className="mt-4 text-3xl font-extrabold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <TrendingUp className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg">দ্রুত শুরু করুন</h2>
            <p className="text-sm text-muted-foreground">নতুন পণ্য যোগ করুন বা বিদ্যমান পণ্য আপডেট করুন।</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link to="/admin/products" className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center">পণ্য ম্যানেজ করুন</Link>
          <Link to="/admin/categories" className="h-11 px-5 rounded-xl bg-secondary text-secondary-foreground font-semibold inline-flex items-center">ক্যাটাগরি ম্যানেজ করুন</Link>
        </div>
      </div>
    </div>
  );
}