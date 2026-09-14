import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { thumb } from "@/lib/img";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ff_install_dismissed_at";
const HIDE_DAYS = 7;

export function InstallAppPrompt() {
  const { data: settings } = useSiteSettings();
  const brand = settings?.brand;
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    // Don't nag: hide for a week after dismissal
    const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (last && Date.now() - last < HIDE_DAYS * 864e5) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setTimeout(() => setOpen(true), 1500);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari has no beforeinstallprompt — show manual instructions
    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|Android/i.test(ua);
    if (isIos && isSafari) {
      setIosHint(true);
      setTimeout(() => setOpen(true), 2000);
    }

    const onInstalled = () => {
      setOpen(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-4 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card shadow-[var(--shadow-pop)] p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <img
          src={brand?.logo_url ? thumb(brand.logo_url, 96) : "/app-icon-192.png"}
          alt={brand?.name_bn ?? "App"}
          width={48}
          height={48}
          className="size-12 rounded-xl object-contain bg-white p-1 border border-border shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground">
            {brand?.name_bn ?? "ফ্রেশ ফেনী"} অ্যাপ ইনস্টল করুন
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {iosHint
              ? "শেয়ার বাটনে ট্যাপ করে “Add to Home Screen” সিলেক্ট করুন।"
              : "দ্রুত অর্ডার করুন, হোম স্ক্রিন থেকেই সরাসরি ওপেন হবে।"}
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            {iosHint ? (
              <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-secondary text-xs font-semibold text-foreground">
                <Share className="size-4" /> শেয়ার → Add to Home Screen
              </span>
            ) : (
              <button
                onClick={install}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90"
              >
                <Download className="size-4" /> ইনস্টল করুন
              </button>
            )}
            <button onClick={dismiss} className="h-9 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary">
              পরে
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="close" className="size-7 grid place-items-center rounded-full text-muted-foreground hover:bg-secondary shrink-0">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
