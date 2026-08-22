---
name: Supabase SSR WebSocket compatibility
description: Supabase client initialization needs an explicit ws transport during Node 20 SSR.
---

Use the ws package as the Supabase Realtime transport when the client is initialized outside the browser.

**Why:** Node 20 does not provide the native WebSocket constructor expected by the current Supabase Realtime client, which can turn otherwise valid SSR routes into HTTP 500 responses.

**How to apply:** Keep the browser transport unchanged and conditionally pass ws only when `window` is unavailable.