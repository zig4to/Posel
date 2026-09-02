import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProjectWithClient } from "@/lib/types/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Vsi projekti (z barvo/imenom stranke), razvrščeni po prvem dnevu padajoče.
 * Ni `.order()` na `work_dates` (array stolpca PostgREST ne zna urejati),
 * zato razvrstimo v JS.
 */
export async function getProjects(
  supabase: TypedSupabaseClient
): Promise<ProjectWithClient[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(id, company_name, color)");

  if (error) throw error;

  const projects = (data ?? []) as unknown as ProjectWithClient[];
  return projects.sort((a, b) => b.work_dates[0].localeCompare(a.work_dates[0]));
}

export async function getProjectById(
  supabase: TypedSupabaseClient,
  id: string
): Promise<ProjectWithClient> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(id, company_name, color)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as ProjectWithClient;
}
