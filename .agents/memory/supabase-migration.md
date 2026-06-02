---
name: Supabase DDL migration approach
description: How to apply schema migrations on this project's hosted Supabase instance
---

The Supabase project (ref: cdctsoahehjohgfndsua) cannot have DDL run against it via:
- PostgREST REST API (no raw SQL endpoint)
- Supabase Management API (needs personal access token, not service role key)
- Direct pg connection from Replit sandbox (IPv6 only, blocked by sandbox)
- Supabase session pooler with JWT as password (not supported)

**How to apply migrations:** User must open the Supabase dashboard → SQL Editor → paste and run the SQL manually.

Migration files live in `supabase/migrations/` for documentation, but are NOT auto-applied.

**Why:** The Replit sandbox blocks outbound IPv6, and the Supabase REST API only serves CRUD, not DDL.

**How to apply:** Direct user to https://supabase.com → their project → SQL Editor → New query → paste → Run.
