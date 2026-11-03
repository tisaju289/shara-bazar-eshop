import { supabase } from "@/integrations/supabase/client";
async function probe() { return supabase.from("brands").select("*"); }
export type ProbeData = Awaited<ReturnType<typeof probe>>["data"];
