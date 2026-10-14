---
name: Cloudflare dependency lockfile portability
description: Cloudflare Worker builds cannot resolve Replit's internal package-firewall URLs.
---

**Rule:** Keep `.npmrc` set to `replace-registry-host=always` and keep Cloudflare's npm lockfile tarball URLs publicly reachable.

**Why:** Cloudflare's `npm clean-install` failed with `ENOTFOUND package-firewall.replit.internal` while fetching a locked `ws` tarball. Replit's npm registry is an internal firewall host, but Cloudflare needs to resolve packages through its own public npm registry.

**How to apply:** Keep the project npm config registry-neutral so Replit uses its configured firewall while Cloudflare uses its configured public registry. Before pushing dependency updates, verify `npm clean-install --progress=false` succeeds and no internal firewall host remains in `package-lock.json`.
