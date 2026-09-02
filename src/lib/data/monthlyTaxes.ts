import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MonthlyTax } from "@/lib/types/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

export async function getMonthlyTaxes(
  supabase: TypedSupabaseClient
): Promise<MonthlyTax[]> {
  const { data, error } = await supabase.from("monthly_taxes").select("*");

  if (error) throw error;
  return data ?? [];
}

export async function getMonthlyTax(
  supabase: TypedSupabaseClient,
  year: number,
  month: number
): Promise<MonthlyTax | null> {
  const { data, error } = await supabase
    .from("monthly_taxes")
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (error) throw error;
  return data;
}
