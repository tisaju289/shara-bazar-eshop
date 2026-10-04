import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { migrateImages } from "@/lib/migrate.functions";

function MigrateImagesPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    if (!token.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const report = await migrateImages({ data: { token: token.trim() } });
      setResult("✅ সফল\n\n" + JSON.stringify(report, null, 2));
    } catch (e: any) {
      setResult("❌ ব্যর্থ: " + (e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[60vh] grid place-items-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h1 className="text-lg font-bold">ইমেজ মাইগ্রেশন টুল</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          বাইরের সাইট থেকে আসা প্রোডাক্ট/ক্যাটাগরি/ব্র্যান্ড/হিরো ব্যানারের ছবি নিজের Supabase storage-এ কপি করে।
          আগে মাইগ্রেট হওয়া ছবি আর ছোঁবে না — যতবার খুশি চালানো যায়।
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="মাইগ্রেশন টোকেন"
            className="flex-1 h-11 px-4 rounded-xl bg-secondary border border-transparent focus:border-primary outline-none text-sm"
          />
          <button
            onClick={run}
            disabled={busy || !token.trim()}
            className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? "চলছে..." : "চালান"}
          </button>
        </div>
        {busy && <p className="text-xs text-muted-foreground">প্রতি রানে ১০টা করে ছবি হয় — শেষ না হওয়া পর্যন্ত আবার "চালান" চাপুন।</p>}
        {result && (
          <pre className="text-xs bg-secondary rounded-xl p-3 overflow-auto max-h-72 whitespace-pre-wrap">
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/migrate-images")({
  component: MigrateImagesPage,
});
