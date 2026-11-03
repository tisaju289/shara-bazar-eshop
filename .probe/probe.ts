import { supabase } from "@/integrations/supabase/client";
async function a() { return supabase.from("brands").select("*").eq("id", "x"); }
async function b() { return supabase.from("products").eq("is_active", true); }
async function c() { return supabase.from("products").select("*").order("sort_order"); }
async function d() { return supabase.from("products").select().eq("is_active", true); }
async function e() { return supabase.from("brands").update({ name_bn: "x" }); }
async function f() { return supabase.from("brands").select("*").eq("is_active", true); }
