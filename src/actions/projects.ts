"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProjectInput = {
  client_id: string;
  work_dates: string[];
  costs: number;
  revenue: number;
  note: string | null;
};

export type ProjectActionResult = { error?: string };

function normalizeDates(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

function validate(input: ProjectInput): string | null {
  if (!input.client_id) return "Izberi stranko.";
  if (input.work_dates.length === 0) return "Izberi vsaj en dan.";
  if (input.costs < 0) return "Stroški ne smejo biti negativni.";
  if (input.revenue < 0) return "Priliv ne sme biti negativen.";

  const dates = normalizeDates(input.work_dates);
  const firstMonth = dates[0].slice(0, 7);
  const lastMonth = dates[dates.length - 1].slice(0, 7);
  if (firstMonth !== lastMonth) {
    return "Vsi izbrani dnevi morajo biti v istem mesecu.";
  }

  return null;
}

export async function createProjectAction(
  input: ProjectInput
): Promise<ProjectActionResult> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({
    client_id: input.client_id,
    work_dates: normalizeDates(input.work_dates),
    costs: input.costs,
    revenue: input.revenue,
    note: input.note,
  });

  if (error) {
    return { error: "Napaka pri shranjevanju projekta: " + error.message };
  }

  revalidatePath("/projekti");
  redirect("/projekti");
}

export async function updateProjectAction(
  id: string,
  input: ProjectInput
): Promise<ProjectActionResult> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      client_id: input.client_id,
      work_dates: normalizeDates(input.work_dates),
      costs: input.costs,
      revenue: input.revenue,
      note: input.note,
    })
    .eq("id", id);

  if (error) {
    return { error: "Napaka pri posodabljanju projekta: " + error.message };
  }

  revalidatePath("/projekti");
  redirect("/projekti");
}

export async function deleteProjectAction(
  id: string
): Promise<ProjectActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return { error: "Napaka pri brisanju projekta: " + error.message };
  }

  revalidatePath("/projekti");
  return {};
}
