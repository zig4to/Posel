"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CostItem, DayHours } from "@/lib/types/database.types";

export type ProjectInput = {
  name: string;
  client_id: string;
  work_dates: string[];
  cost_items: CostItem[];
  day_hours: DayHours;
  revenue: number;
  note: string | null;
};

export type ProjectActionResult = { error?: string };

function normalizeDates(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

// Odstrani prazne postavke (brez zneska in brez opombe), ki jih je uporabnik
// pustil neizpolnjene po kliku na "+".
function cleanCostItems(items: CostItem[]): CostItem[] {
  return items.filter((item) => item.amount > 0 || (item.note && item.note.trim()));
}

// Obdrži ure samo za izbrane dni projekta in samo vnose z urami > 0.
function cleanDayHours(dayHours: DayHours, workDates: string[]): DayHours {
  const dates = new Set(workDates);
  const result: DayHours = {};
  for (const [date, hours] of Object.entries(dayHours ?? {})) {
    if (dates.has(date) && hours > 0) result[date] = hours;
  }
  return result;
}

function validate(input: ProjectInput): string | null {
  if (!input.name.trim()) return "Vnesi ime projekta.";
  if (!input.client_id) return "Izberi partnerja.";
  if (input.work_dates.length === 0) return "Izberi vsaj en dan.";
  if (input.cost_items.some((item) => item.amount < 0)) {
    return "Stroški ne smejo biti negativni.";
  }
  if (input.revenue < 0) return "Priliv ne sme biti negativen.";
  if (Object.values(input.day_hours ?? {}).some((h) => !(h >= 0 && h <= 24))) {
    return "Ure na dan morajo biti med 0 in 24.";
  }

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
    name: input.name.trim(),
    client_id: input.client_id,
    work_dates: normalizeDates(input.work_dates),
    cost_items: cleanCostItems(input.cost_items),
    day_hours: cleanDayHours(input.day_hours, input.work_dates),
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
      name: input.name.trim(),
      client_id: input.client_id,
      work_dates: normalizeDates(input.work_dates),
      cost_items: cleanCostItems(input.cost_items),
      day_hours: cleanDayHours(input.day_hours, input.work_dates),
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
