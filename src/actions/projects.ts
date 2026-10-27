"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CostItem, DayHours, DayKm } from "@/lib/types/database.types";

export type ProjectInput = {
  name: string;
  client_id: string;
  work_dates: string[];
  cost_items: CostItem[];
  /** Dodatne storitve - že vštete v revenue. */
  extra_items: CostItem[];
  day_hours: DayHours;
  hourly_rate: number | null;
  day_km: DayKm;
  fuel_consumption: number | null;
  fuel_price: number | null;
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

// Obdrži vrednosti (ure/km) samo za izbrane dni projekta in samo vnose > 0.
function cleanPerDay(values: Record<string, number>, workDates: string[]): Record<string, number> {
  const dates = new Set(workDates);
  const result: Record<string, number> = {};
  for (const [date, value] of Object.entries(values ?? {})) {
    if (dates.has(date) && value > 0) result[date] = value;
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
  if (input.extra_items.some((item) => !(item.amount >= 0))) {
    return "Znesek dodatne storitve ne sme biti negativen.";
  }
  if (input.revenue < 0) return "Priliv ne sme biti negativen.";
  if (input.hourly_rate !== null && !(input.hourly_rate >= 0)) {
    return "Cena na uro ne sme biti negativna.";
  }
  if (Object.values(input.day_km ?? {}).some((km) => !(km >= 0))) {
    return "Kilometri ne smejo biti negativni.";
  }
  if (
    [input.fuel_consumption, input.fuel_price].some((v) => v !== null && !(v >= 0))
  ) {
    return "Poraba in cena goriva ne smeta biti negativni.";
  }
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
    extra_items: cleanCostItems(input.extra_items),
    day_hours: cleanPerDay(input.day_hours, input.work_dates),
    hourly_rate: input.hourly_rate,
    day_km: cleanPerDay(input.day_km, input.work_dates),
    fuel_consumption: input.fuel_consumption,
    fuel_price: input.fuel_price,
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
      extra_items: cleanCostItems(input.extra_items),
      day_hours: cleanPerDay(input.day_hours, input.work_dates),
      hourly_rate: input.hourly_rate,
      day_km: cleanPerDay(input.day_km, input.work_dates),
      fuel_consumption: input.fuel_consumption,
      fuel_price: input.fuel_price,
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
