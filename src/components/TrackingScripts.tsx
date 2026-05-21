import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { trackPageView } from "@/lib/tracking";

// Idempotently injects a <script> by id and runs the given body.
function injectScript(id: string, opts: { src?: string; html?: string; async?: boolean }) {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  if (opts.async) s.async = true;
  if (opts.src) s.src = opts.src;
  if (opts.html) s.text = opts.html;
  document.head.appendChild(s);
}

function injectNoscript(id: string, html: string) {
  if (typeof document === "undefined") return;
  if (document.getElementById(id)) return;
  const n = document.createElement("noscript");
  n.id = id;
  n.innerHTML = html;
  document.body.appendChild(n);
}

function injectRawHtml(containerId: string, html: string, where: "head" | "body") {
  if (typeof document === "undefined") return;
  let host = document.getElementById(containerId);
  if (host) host.innerHTML = "";
  else {
    host = document.createElement("div");
    host.id = containerId;
    host.style.display = "none";
    (where === "head" ? document.head : document.body).appendChild(host);
  }
  // execute any inline <script> tags
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("script").forEach((old) => {
    const s = document.createElement("script");
    for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value);
    s.text = old.textContent ?? "";
    old.replaceWith(s);
  });
  host.appendChild(tpl.content);
}

export function TrackingScripts() {
  const { data } = useSiteSettings();
  const t = data?.tracking;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!t || !t.enabled) return;

    // --- Meta Pixel ---
    if (t.meta_pixel_id) {
      injectScript("fb-pixel-base", {
        html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${t.meta_pixel_id}');`,
      });
      injectNoscript(
        "fb-pixel-ns",
        `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${t.meta_pixel_id}&ev=PageView&noscript=1"/>`,
      );
    }

    // --- GA4 / Google Ads (gtag) ---
    const gtagIds = [t.ga4_id, t.google_ads_id].filter(Boolean);
    if (gtagIds.length > 0) {
      injectScript("gtag-src", { src: `https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`, async: true });
      injectScript("gtag-init", {
        html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js', new Date());${gtagIds
          .map((id) => `gtag('config','${id}');`)
          .join("")}`,
      });
    }

    // --- GTM ---
    if (t.gtm_id) {
      injectScript("gtm-base", {
        html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${t.gtm_id}');`,
      });
      injectNoscript(
        "gtm-ns",
        `<iframe src="https://www.googletagmanager.com/ns.html?id=${t.gtm_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
      );
    }

    // --- TikTok Pixel ---
    if (t.tiktok_pixel_id) {
      injectScript("ttq-base", {
        html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var i=document.createElement("script");i.type="text/javascript";i.async=!0;i.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};ttq.load('${t.tiktok_pixel_id}');ttq.page();}(window,document,'ttq');`,
      });
    }

    // --- Custom HTML ---
    if (t.head_html) injectRawHtml("tracking-head-html", t.head_html, "head");
    if (t.body_html) injectRawHtml("tracking-body-html", t.body_html, "body");

    initialized.current = true;
  }, [t]);

  // PageView on route change (after the initial inject also runs once).
  useEffect(() => {
    if (!t || !t.enabled) return;
    if (lastPath.current === path) return;
    lastPath.current = path;
    // Small delay so async pixel scripts have a tick to initialize.
    const id = window.setTimeout(() => trackPageView(), 50);
    return () => window.clearTimeout(id);
  }, [t, path]);

  return null;
}