import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WorkEntryWithClient } from "@/lib/types/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

/** Vsi delovni vnosi za dani mesečni razpon (vključno z barvo/imenom stranke). */
export async function getWorkEntriesInRange(
  supabase: TypedSupabaseClient,
  from: string,
  to: string
): Promise<WorkEntryWithClient[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*, clients(id, company_name, color)")
    .gte("work_date", from)
    .lte("work_date", to)
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data ?? []) as unknown as WorkEntryWithClient[];
}

export async function getWorkEntriesForDay(
  supabase: TypedSupabaseClient,
  dateKey: string
): Promise<WorkEntryWithClient[]> {
  const { data, error } = await supabase
    .from("work_entries")
    .select("*, clients(id, company_name, color)")
    .eq("work_date", dateKey)
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data ?? []) as unknown as WorkEntryWithClient[];
}
