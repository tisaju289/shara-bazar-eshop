import { supabase } from "@/integrations/supabase/client";
async function a() { return supabase.from("brands").select("*").eq("id", "x"); }
async function b() { return supabase.from("products").select("*").eq("is_active", true); }
export type D1 = Awaited<ReturnType<typeof a>>["data"];
