import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, ShoppingCart, MapPin, Phone, Menu, X, Plus, Minus,
  Truck, ShieldCheck, Clock, Leaf, Star, ChevronRight, Heart,
} from "lucide-react";
import heroImg from "@/assets/hero-grocery.jpg";
import pMango from "@/assets/p-mango.jpg";
import pRice from "@/assets/p-rice.jpg";
import pTomato from "@/assets/p-tomato.jpg";
import pDal from "@/assets/p-dal.jpg";
import pIlish from "@/assets/p-ilish.jpg";
import pChili from "@/assets/p-chili.jpg";
import pOil from "@/assets/p-oil.jpg";
import pEgg from "@/assets/p-egg.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "তাজা বাজার — অনলাইনে তাজা গ্রোসারি অর্ডার করুন" },
      { name: "description", content: "ঘরে বসেই অর্ডার করুন তাজা শাকসবজি, মাছ, চাল, ডাল, তেল ও মসলা। ১ ঘণ্টায় দ্রুত হোম ডেলিভারি — সারা ঢাকা জুড়ে।" },
    ],
  }),
  component: Index,
});

type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  old?: number;
  img: string;
  tag?: string;
  cat: string;
};

const products: Product[] = [
  { id: "mango", name: "হিমসাগর আম", unit: "১ কেজি", price: 180, old: 220, img: pMango, tag: "সিজনাল", cat: "ফল" },
  { id: "rice", name: "মিনিকেট চাল (প্রিমিয়াম)", unit: "৫ কেজি", price: 480, old: 540, img: pRice, tag: "বেস্টসেলার", cat: "চাল ও ডাল" },
  { id: "tomato", name: "তাজা টমেটো", unit: "১ কেজি", price: 60, img: pTomato, cat: "সবজি" },
  { id: "dal", name: "মসুর ডাল (দেশি)", unit: "১ কেজি", price: 135, old: 150, img: pDal, cat: "চাল ও ডাল" },
  { id: "ilish", name: "পদ্মার ইলিশ মাছ", unit: "১ কেজি (৮০০g+)", price: 1450, img: pIlish, tag: "নতুন", cat: "মাছ ও মাংস" },
  { id: "chili", name: "কাঁচা মরিচ", unit: "২৫০ গ্রাম", price: 35, img: pChili, cat: "সবজি" },
  { id: "oil", name: "সরিষার তেল (খাঁটি)", unit: "১ লিটার", price: 320, old: 360, img: pOil, cat: "তেল ও মসলা" },
  { id: "egg", name: "দেশি মুরগির ডিম", unit: "১২ পিস", price: 165, img: pEgg, cat: "ডিম ও দুগ্ধ" },
];

const categories = [
  { name: "শাকসবজি", emoji: "🥬", count: 48 },
  { name: "ফলমূল", emoji: "🥭", count: 26 },
  { name: "মাছ", emoji: "🐟", count: 18 },
  { name: "মাংস", emoji: "🍗", count: 12 },
  { name: "চাল ও ডাল", emoji: "🌾", count: 22 },
  { name: "তেল ও মসলা", emoji: "🫙", count: 34 },
  { name: "ডিম ও দুগ্ধ", emoji: "🥚", count: 14 },
  { name: "বেকারি", emoji: "🥖", count: 19 },
];

function Index() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const { [id]: _, ...rest } = c;
      return n > 0 ? { ...c, [id]: n } : rest;
    });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(
    () => Object.entries(cart).reduce((sum, [id, q]) => sum + (products.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [cart],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top utility bar */}
      <div className="hidden md:block bg-[var(--leaf-deep)] text-primary-foreground/90 text-xs">
        <div className="container mx-auto px-4 flex justify-between py-2">
          <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> ঢাকার সব এলাকায় ডেলিভারি</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> ১৬২৪৭</span>
            <span>সাহায্য</span>
            <span>আমার অর্ডার</span>
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 md:gap-6">
          <button className="md:hidden p-2 -ml-2" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="size-6" />
          </button>
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="size-10 rounded-2xl grid place-items-center text-primary-foreground shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-hero)" }}>
              <Leaf className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="font-[family-name:var(--font-display)] font-extrabold text-lg text-[var(--leaf-deep)]">তাজা বাজার</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5 hidden sm:block">তাজা · বিশ্বস্ত · দ্রুত</div>
            </div>
          </a>

          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <div className="relative">
              <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="খুঁজুন: ইলিশ, আম, মিনিকেট চাল..."
                className="w-full h-12 pl-12 pr-4 rounded-full bg-secondary border border-transparent focus:border-primary outline-none transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <a href="#shop" className="hover:text-primary">দোকান</a>
            <a href="#categories" className="hover:text-primary">ক্যাটাগরি</a>
            <a href="#offer" className="hover:text-primary">অফার</a>
          </nav>

          <button onClick={() => setCartOpen(true)} className="relative inline-flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-primary-foreground hover:opacity-95 transition shadow-[var(--shadow-soft)]">
            <ShoppingCart className="size-5" />
            <span className="hidden sm:inline text-sm font-semibold">৳{cartTotal}</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-[var(--chili)] text-white text-[11px] grid place-items-center font-bold">{cartCount}</span>
            )}
          </button>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="খুঁজুন তাজা পণ্য..."
              className="w-full h-11 pl-12 pr-4 rounded-full bg-secondary outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">মেনু</span>
              <button onClick={() => setMobileOpen(false)}><X /></button>
            </div>
            {["হোম", "দোকান", "ক্যাটাগরি", "অফার", "আমার অর্ডার", "সাহায্য"].map((m) => (
              <a key={m} href="#" className="py-2 border-b border-border text-sm">{m}</a>
            ))}
          </aside>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="space-y-6 order-2 md:order-1">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--cream)] text-[var(--leaf-deep)] text-xs font-semibold border border-border">
              <Leaf className="size-3.5" /> ১০০% তাজা · কৃষক থেকে সরাসরি
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] text-[var(--leaf-deep)]">
              ঘরে বসেই পান <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
                বাজারের সব তাজা
              </span>{" "}
              পণ্য
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-lg">
              শাকসবজি, মাছ-মাংস, চাল-ডাল, তেল-মসলা — সব কিছু এক জায়গায়। অর্ডারের ৬০ মিনিটের মধ্যে আপনার দরজায় পৌঁছে যাবে।
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#shop" className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-pop)] hover:opacity-95">
                এখনই অর্ডার করুন <ChevronRight className="size-4" />
              </a>
              <a href="#categories" className="h-12 px-6 rounded-full bg-secondary text-secondary-foreground font-semibold inline-flex items-center hover:bg-secondary/80">
                ক্যাটাগরি দেখুন
              </a>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm">
              <div className="flex items-center gap-2"><Truck className="size-5 text-primary" /> ৬০ মিনিটে ডেলিভারি</div>
              <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> ১০০% গ্যারান্টি</div>
              <div className="flex items-center gap-2"><Clock className="size-5 text-primary" /> ২৪/৭ সাপোর্ট</div>
            </div>
          </div>

          <div className="relative order-1 md:order-2">
            <div className="absolute -inset-6 rounded-[3rem] blur-3xl opacity-40" style={{ background: "var(--gradient-hero)" }} />
            <div className="relative rounded-[2rem] overflow-hidden shadow-[var(--shadow-pop)] border border-border">
              <img src={heroImg} alt="তাজা শাকসবজি ও গ্রোসারি" width={1536} height={1024} className="w-full h-auto" />
            </div>
            <div className="absolute -bottom-4 -left-4 md:-left-8 bg-card rounded-2xl shadow-[var(--shadow-soft)] p-3 pr-5 flex items-center gap-3 border border-border">
              <div className="size-10 rounded-xl bg-[var(--mango)]/20 grid place-items-center text-xl">🥭</div>
              <div className="text-xs">
                <div className="font-bold">সিজনাল আম</div>
                <div className="text-muted-foreground">২০% ছাড়ে</div>
              </div>
            </div>
            <div className="absolute -top-3 -right-3 md:-right-6 bg-card rounded-2xl shadow-[var(--shadow-soft)] p-3 pr-5 flex items-center gap-3 border border-border">
              <div className="size-10 rounded-xl bg-primary/15 grid place-items-center"><Star className="size-5 text-[var(--mango)] fill-[var(--mango)]" /></div>
              <div className="text-xs">
                <div className="font-bold">৪.৯ রেটিং</div>
                <div className="text-muted-foreground">৫০ হাজার+ ক্রেতা</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">জনপ্রিয় ক্যাটাগরি</h2>
              <p className="text-muted-foreground text-sm mt-1">যেটি দরকার, এক ক্লিকেই খুঁজে নিন</p>
            </div>
            <a href="#" className="text-sm font-semibold text-primary hidden sm:inline-flex items-center gap-1">সব দেখুন <ChevronRight className="size-4" /></a>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
            {categories.map((c) => (
              <button key={c.name} className="group flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-[var(--shadow-soft)] transition">
                <div className="size-12 md:size-16 rounded-2xl grid place-items-center text-2xl md:text-3xl group-hover:scale-110 transition" style={{ background: "var(--gradient-warm)" }}>
                  {c.emoji}
                </div>
                <div className="text-[11px] md:text-sm font-semibold text-center leading-tight">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.count} আইটেম</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Offer banner */}
      <section id="offer" className="py-6 md:py-10">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl p-6 md:p-10 relative overflow-hidden text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative max-w-xl space-y-3">
              <span className="inline-block text-xs font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full">সাপ্তাহিক ডিল</span>
              <h3 className="text-2xl md:text-4xl font-extrabold leading-tight">প্রথম অর্ডারে পান ১৫০ টাকা ছাড়!</h3>
              <p className="text-primary-foreground/85 text-sm md:text-base">কুপন কোড ব্যবহার করুন — <span className="font-bold tracking-wider">TAJA150</span> · সর্বনিম্ন অর্ডার ৫০০৳</p>
              <a href="#shop" className="inline-flex items-center gap-2 mt-2 h-11 px-6 rounded-full bg-white text-[var(--leaf-deep)] font-semibold">এখনই কিনুন <ChevronRight className="size-4" /></a>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="shop" className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--leaf-deep)]">আজকের তাজা পণ্য</h2>
              <p className="text-muted-foreground text-sm mt-1">সরাসরি কৃষক থেকে সংগ্রহ করা</p>
            </div>
            <div className="hidden md:flex gap-2">
              {["সব", "সবজি", "ফল", "মাছ", "চাল ও ডাল"].map((t, i) => (
                <button key={t} className={`px-4 py-2 rounded-full text-sm font-medium border transition ${i === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {products.map((p) => {
              const qty = cart[p.id] ?? 0;
              return (
                <article key={p.id} className="group rounded-3xl bg-card border border-border overflow-hidden hover:shadow-[var(--shadow-pop)] hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-square overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
                    <img src={p.img} alt={p.name} loading="lazy" width={512} height={512} className="w-full h-full object-contain p-3 group-hover:scale-110 transition duration-500" />
                    {p.tag && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wide uppercase bg-[var(--chili)] text-white px-2 py-1 rounded-full">{p.tag}</span>
                    )}
                    <button className="absolute top-3 right-3 size-8 rounded-full bg-background/80 grid place-items-center backdrop-blur hover:text-[var(--chili)]" aria-label="Wishlist">
                      <Heart className="size-4" />
                    </button>
                  </div>
                  <div className="p-3 md:p-4 space-y-2">
                    <div className="text-[11px] text-muted-foreground">{p.cat} · {p.unit}</div>
                    <h3 className="font-semibold text-sm md:text-base leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                    <div className="flex items-end justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg md:text-xl font-extrabold text-[var(--leaf-deep)]">৳{p.price}</span>
                        {p.old && <span className="text-xs text-muted-foreground line-through">৳{p.old}</span>}
                      </div>
                      {qty === 0 ? (
                        <button onClick={() => add(p.id)} className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center hover:opacity-90 shadow-[var(--shadow-soft)]" aria-label="Add">
                          <Plus className="size-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-primary rounded-xl text-primary-foreground">
                          <button onClick={() => sub(p.id)} className="size-9 grid place-items-center"><Minus className="size-4" /></button>
                          <span className="text-sm font-bold w-5 text-center">{qty}</span>
                          <button onClick={() => add(p.id)} className="size-9 grid place-items-center"><Plus className="size-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-10 md:py-16 bg-[var(--cream)]/60">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-[var(--leaf-deep)]">কেন তাজা বাজার?</h2>
          <p className="text-center text-muted-foreground mt-2 text-sm max-w-xl mx-auto">আপনার পরিবারের জন্য সেরা পণ্য নিশ্চিত করতে আমরা প্রতিশ্রুতিবদ্ধ।</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mt-8">
            {[
              { i: Truck, t: "দ্রুত ডেলিভারি", d: "৬০ মিনিটে আপনার দরজায়" },
              { i: Leaf, t: "তাজা পণ্য", d: "কৃষক থেকে সরাসরি সংগ্রহ" },
              { i: ShieldCheck, t: "মানের গ্যারান্টি", d: "পছন্দ না হলে রিফান্ড" },
              { i: Clock, t: "২৪/৭ সাপোর্ট", d: "যেকোনো সময় কল করুন" },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="bg-card border border-border rounded-3xl p-5 hover:shadow-[var(--shadow-soft)] transition">
                <div className="size-12 rounded-2xl grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-4 font-bold">{t}</h3>
                <p className="text-sm text-muted-foreground mt-1">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--leaf-deep)] text-primary-foreground/90 pt-12 pb-6 mt-8">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-2xl grid place-items-center bg-white/10"><Leaf className="size-5" /></div>
              <span className="font-extrabold text-lg">তাজা বাজার</span>
            </div>
            <p className="text-sm text-primary-foreground/70">বাংলাদেশের আস্থা ও বিশ্বস্ত অনলাইন গ্রোসারি — তাজা, দ্রুত, সাশ্রয়ী।</p>
          </div>
          <div>
            <h4 className="font-bold mb-3">দোকান</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/75">
              <li>শাকসবজি</li><li>ফলমূল</li><li>মাছ ও মাংস</li><li>চাল ও ডাল</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3">সাহায্য</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/75">
              <li>আমার অর্ডার</li><li>ডেলিভারি তথ্য</li><li>রিফান্ড নীতি</li><li>যোগাযোগ</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3">যোগাযোগ</h4>
            <p className="text-sm text-primary-foreground/75 flex items-center gap-2"><Phone className="size-4" /> ১৬২৪৭ (২৪/৭)</p>
            <p className="text-sm text-primary-foreground/75 mt-2 flex items-center gap-2"><MapPin className="size-4" /> ধানমন্ডি, ঢাকা</p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-10 pt-6 border-t border-white/10 text-xs text-primary-foreground/60 text-center">
          © {new Date().getFullYear()} তাজা বাজার — সর্বস্বত্ব সংরক্ষিত
        </div>
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-background flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-bold text-lg">আপনার কার্ট ({cartCount})</span>
              <button onClick={() => setCartOpen(false)}><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartCount === 0 && <p className="text-center text-muted-foreground mt-10 text-sm">আপনার কার্ট খালি 🛒</p>}
              {Object.entries(cart).map(([id, q]) => {
                const p = products.find((x) => x.id === id)!;
                return (
                  <div key={id} className="flex gap-3 items-center bg-card border border-border rounded-2xl p-2">
                    <img src={p.img} alt={p.name} className="size-14 rounded-xl object-contain" style={{ background: "var(--gradient-warm)" }} />
                    <div className="flex-1 text-sm">
                      <div className="font-semibold leading-tight">{p.name}</div>
                      <div className="text-xs text-muted-foreground">৳{p.price} × {q}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-secondary rounded-lg">
                      <button onClick={() => sub(id)} className="size-7 grid place-items-center"><Minus className="size-3.5" /></button>
                      <span className="text-sm font-bold w-5 text-center">{q}</span>
                      <button onClick={() => add(id)} className="size-7 grid place-items-center"><Plus className="size-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {cartCount > 0 && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">মোট</span>
                  <span className="font-extrabold text-lg">৳{cartTotal}</span>
                </div>
                <button className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-pop)]">চেকআউট করুন</button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
