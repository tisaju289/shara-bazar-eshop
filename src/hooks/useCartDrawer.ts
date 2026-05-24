import { useEffect, useState } from "react";

const CART_DRAWER_EVENT = "tajabazar:cart-drawer-open";

export function openCartDrawer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_DRAWER_EVENT));
}

export function useCartDrawerController() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener(CART_DRAWER_EVENT, handleOpen);
    return () => window.removeEventListener(CART_DRAWER_EVENT, handleOpen);
  }, []);

  return { open, setOpen };
}