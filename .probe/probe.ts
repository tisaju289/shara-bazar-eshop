import { supabase } from "@/integrations/supabase/client";
async function p1() { return supabase.from("brands").select("*").order("sort_order"); }
async function p2() { return supabase.from("products").select("*").eq("is_active", true); }
async function p3() { return supabase.from("brands").update({ name_bn: "x" }).eq("id", "x"); }
async function p4() { return supabase.from("user_roles").select("role").eq("user_id", "x").eq("role", "admin"); }
async function p5() { return supabase.from("brands").insert({ name_bn: "x", slug: "x" }); }
async function p6() { return supabase.from("products").select("*, categories(name_bn)").limit(1); }
export type D1 = Awaited<ReturnType<typeof p1>>["data"];
export type D6 = Awaited<ReturnType<typeof p6>>["data"];
