import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const c1 = createClient<Database, { PostgrestVersion: "14.5" }>("https://x.supabase.co", "k");
const c2 = createClient<Database, { PostgrestVersion: "14.5" }>("https://x.supabase.co", "k", { auth: { persistSession: false } });
const c3 = createClient<Database, { PostgrestVersion: "14.5" }>("https://x.supabase.co", "k", { global: { fetch: fetch }, auth: { persistSession: false } });
const c4 = createClient<Database, { PostgrestVersion: "14.5" }>("https://x.supabase.co", "k", { realtime: { transport: undefined } });
async function a() { return c1.from("brands").select("*").eq("id", "x"); }
async function b() { return c2.from("brands").select("*").eq("id", "x"); }
async function c() { return c3.from("brands").select("*").eq("id", "x"); }
async function d() { return c4.from("brands").select("*").eq("id", "x"); }
