import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const c1 = createClient<Database, { PostgrestVersion: "14.5" }>("https://x.supabase.co", "k");
async function a() { return c1.from("brands").select("*").eq("id", "x"); }
export type D1 = Awaited<ReturnType<typeof a>>["data"];
