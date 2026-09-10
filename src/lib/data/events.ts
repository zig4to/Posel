import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CalendarEvent } from "@/lib/types/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

/** Vsi dogodki za dani mesečni razpon. */
export async function getEventsInRange(
  supabase: TypedSupabaseClient,
  from: string,
  to: string
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("event_date", from)
    .lte("event_date", to)
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}
