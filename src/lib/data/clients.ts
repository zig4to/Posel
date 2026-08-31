import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

export async function getClients(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("company_name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getClientById(
  supabase: TypedSupabaseClient,
  id: string
) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getClientCount(supabase: TypedSupabaseClient) {
  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}
