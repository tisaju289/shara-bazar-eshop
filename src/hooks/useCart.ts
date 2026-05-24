import { useEffect, useState, useCallback } from "react";

type Cart = Record<string, number>;
const KEY = "cart:v1";
const listeners = new Set<(c: Cart) => void>();
let current: Cart = {};
let loaded = false;

function load(): Cart {
  if (loaded || typeof window === "undefined") return current;
  try {
    const raw = window.localStorage.getItem(KEY);
    current = raw ? (JSON.parse(raw) as Cart) : {};
  } catch {
    current = {};
  }
  loaded = true;
  return current;
}

function emit(next: Cart) {
  current = next;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }
  listeners.forEach((l) => l(next));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      current = e.newValue ? (JSON.parse(e.newValue) as Cart) : {};
    } catch {
      current = {};
    }
    listeners.forEach((l) => l(current));
  });
}

export function useCart(): [Cart, (updater: Cart | ((prev: Cart) => Cart)) => void] {
  const [cart, setLocal] = useState<Cart>(() => (typeof window === "undefined" ? {} : load()));

  useEffect(() => {
    setLocal(load());
    const l = (c: Cart) => setLocal(c);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const setCart = useCallback((updater: Cart | ((prev: Cart) => Cart)) => {
    const next = typeof updater === "function" ? (updater as (p: Cart) => Cart)(current) : updater;
    emit(next);
  }, []);

  return [cart, setCart];
}