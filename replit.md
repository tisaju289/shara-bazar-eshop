# FreshFeni (তাজা বাজার)

A Bengali e-commerce grocery web application built with TanStack Start (React SSR), Vite, and Supabase.

## Tech Stack

- **Framework**: TanStack Start (React 19 + SSR)
- **Build Tool**: Vite 7 via `@lovable.dev/vite-tanstack-config`
- **Package Manager**: Bun
- **Styling**: Tailwind CSS 4 + shadcn/ui (Radix UI)
- **Database/Auth**: Supabase (hosted, credentials in `.env` and env vars)
- **Routing**: TanStack Router (file-based routes in `src/routes/`)
- **State**: TanStack Query for data fetching

## Development

```bash
bun install       # Install dependencies
bun run dev       # Start dev server on port 5000
```

The dev server runs on `0.0.0.0:5000` with `allowedHosts: true` for Replit proxy compatibility.

## Project Structure

```
src/
  routes/         # File-based routes (index, products, categories, admin/*, login)
  components/     # React components (ui/ = shadcn base components)
  hooks/          # Custom hooks (useCart, useAuth, useSiteSettings)
  integrations/
    supabase/     # Supabase client + generated types
  lib/            # Utilities (tracking, error handling)
supabase/
  migrations/     # SQL schema migrations
```

## Key Notes

- The Supabase client disables Realtime/WebSocket in SSR context (Node.js 20 lacks native WebSocket)
- The `@lovable.dev/vite-tanstack-config` wraps Vite + TanStack Start + Cloudflare plugin; do NOT add duplicate plugins manually
- The app is multilingual with Bengali (BN) as primary language

## User Preferences

- Keep existing project structure and conventions
