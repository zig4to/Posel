import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Leave } from "@/lib/types/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

/** Vsi dopusti, ki se vsaj deloma prekrivajo z danim mesečnim razponom. */
export async function getLeavesInRange(
  supabase: TypedSupabaseClient,
  from: string,
  to: string
): Promise<Leave[]> {
  const { data, error } = await supabase
    .from("leaves")
    .select("*")
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Leave[];
}
