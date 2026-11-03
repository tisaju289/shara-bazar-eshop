import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import ws from "ws";
const URL_ = "https://cdctsoahehjohgfndsua.supabase.co";
const KEY_ = "k";
const c1 = createClient<Database, { PostgrestVersion: "14.5" }>(URL_, KEY_, {
  global: { fetch: fetch },
  auth: { storage: undefined, persistSession: false, autoRefreshToken: true },
  realtime: { transport: ws as any },
});
async function a() { return supabase.from("brands").select("*").eq("id", "x"); }
async function b() { return c1.from("brands").select("*").eq("id", "x"); }
