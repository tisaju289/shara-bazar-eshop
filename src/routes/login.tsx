import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "লগইন — তাজা বাজার অ্যাডমিন" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        setMsg("অ্যাকাউন্ট তৈরি হয়েছে! এখন লগইন করুন।");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (e: any) {
      setErr(e.message || "কিছু ভুল হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="size-10 rounded-2xl bg-white/20 grid place-items-center"><Leaf className="size-5" /></div>
          <span className="font-extrabold text-xl">তাজা বাজার</span>
        </Link>
        <div className="relative z-10 space-y-3 max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">অ্যাডমিন প্যানেলে স্বাগতম</h2>
          <p className="text-primary-foreground/85">আপনার দোকান, পণ্য, এবং অর্ডার এক জায়গায় ম্যানেজ করুন।</p>
        </div>
        <p className="text-xs text-primary-foreground/70 relative z-10">© তাজা বাজার</p>
        <div className="absolute -bottom-20 -right-20 size-96 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">
              {mode === "login" ? "লগইন করুন" : "অ্যাকাউন্ট তৈরি করুন"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "অ্যাডমিন প্যানেলে প্রবেশ করুন" : "প্রথম ইউজার স্বয়ংক্রিয়ভাবে admin হয়ে যাবে"}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">ইমেইল</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-11 px-4 rounded-xl bg-secondary border border-transparent focus:border-primary outline-none"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">পাসওয়ার্ড</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-11 px-4 rounded-xl bg-secondary border border-transparent focus:border-primary outline-none"
                placeholder="••••••••"
              />
            </div>
            {err && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{err}</div>}
            {msg && <div className="text-sm text-primary bg-primary/10 p-3 rounded-lg">{msg}</div>}
            <button disabled={loading} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "লগইন" : "সাইনআপ"}
            </button>
          </form>
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(null); setMsg(null); }} className="text-sm text-primary w-full text-center hover:underline">
            {mode === "login" ? "নতুন? অ্যাকাউন্ট তৈরি করুন" : "ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন"}
          </button>
          <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">← হোমে ফিরে যান</Link>
        </div>
      </div>
    </div>
  );
}