---
name: Bun lockfile for Cloudflare
description: Cloudflare deployment requires the Bun lockfile to match the package manifest.
---

**Rule:** Treat `bun.lock` as the deployment lockfile and keep it synchronized with `package.json` whenever dependencies change.

**Why:** Cloudflare installs with `bun install --frozen-lockfile`, which fails before the build when the manifest and lockfile diverge.

**How to apply:** After changing packages through npm or Replit tooling, regenerate `bun.lock` with Bun, then verify with `bun install --frozen-lockfile` and `bun run build` before pushing.
