import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProjectWithClient } from "@/lib/types/database.types";
import { eachDateInRange } from "@/lib/utils/date";

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

/**
 * Projekti, katerih vsaj en dan pade v dani razpon (za prikaz na koledarju).
 * `work_dates` je array, zato uporabimo prekrivanje (`ov`) z vsemi dnevi razpona.
 */
export async function getProjectsInRange(
  supabase: TypedSupabaseClient,
  from: string,
  to: string
): Promise<ProjectWithClient[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(id, company_name, color)")
    .overlaps("work_dates", eachDateInRange(from, to))
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ProjectWithClient[];
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
