// Deljenje strank z enim uporabnikom (Domen) - samo ogled.
// ID uporabnika je v okolju (`SHARE_VIEWER_ID`, najdeš ga v Supabase
// Dashboard -> Authentication -> Users). Samo na strežniku.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/** Ime osebe, s katero se deli (za oznake v UI). */
export const SHARE_VIEWER_NAME = "Domen";

export function shareViewerId(): string | null {
  return process.env.SHARE_VIEWER_ID?.trim() || null;
}

/**
 * Ali je prijavljeni uporabnik gledalec deljenih strank (samo ogled).
 * Gledalec vidi deljene stranke in njihove projekte, urejati ne more.
 */
export async function isReadOnlyViewer(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const viewerId = shareViewerId();
  if (!viewerId) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id === viewerId;
}
