import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { TrackingScripts } from "@/components/TrackingScripts";
import { useEffect } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";

async function loadSeo() {
  try {
    const { data } = await (supabase as any)
      .from("site_settings")
      .select("key,value")
      .in("key", ["seo", "brand"]);
    const map: any = {};
    for (const row of (data ?? []) as { key: string; value: any }[]) {
      map[row.key] = row.value;
    }
    return {
      title: map.seo?.title || map.brand?.name_bn || "",
      description: map.seo?.description || map.brand?.tagline_bn || "",
      keywords: map.seo?.keywords || "",
      og_image: map.seo?.og_image || "",
      favicon_url: map.seo?.favicon_url || "",
    };
  } catch {
    return { title: "", description: "", keywords: "", og_image: "", favicon_url: "" };
  }
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => loadSeo(),
  head: ({ loaderData }) => {
    const d = loaderData ?? { title: "", description: "", keywords: "", og_image: "", favicon_url: "" };
    const title = d.title || "Lovable App";
    const description = d.description || "Lovable Generated Project";
    const meta: Array<Record<string, string>> = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: title },
      { name: "twitter:card", content: d.og_image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (d.keywords) meta.push({ name: "keywords", content: d.keywords });
    if (d.og_image) {
      meta.push({ property: "og:image", content: d.og_image });
      meta.push({ name: "twitter:image", content: d.og_image });
    }
    const links: Array<Record<string, string>> = [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://images.weserv.nl", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://images.weserv.nl" },
    ];

    if (d.favicon_url) links.push({ rel: "icon", href: d.favicon_url });
    return { meta, links };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicHead />
      <TrackingScripts />
      <Outlet />
      <CartDrawer />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

function DynamicHead() {
  const { data } = useSiteSettings();
  useEffect(() => {
    if (!data) return;
    if (data.seo.title) document.title = data.seo.title;
    const setMeta = (sel: string, attr: string, name: string, content: string) => {
      if (!content) return;
      let el = document.head.querySelector(sel) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('meta[name="description"]', "name", "description", data.seo.description);
    setMeta('meta[name="keywords"]', "name", "keywords", data.seo.keywords);
    setMeta('meta[property="og:title"]', "property", "og:title", data.seo.title);
    setMeta('meta[property="og:description"]', "property", "og:description", data.seo.description);
    if (data.seo.og_image) setMeta('meta[property="og:image"]', "property", "og:image", data.seo.og_image);
    if (data.seo.favicon_url) {
      let link = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = data.seo.favicon_url;
    }
  }, [data]);
  return null;
}
