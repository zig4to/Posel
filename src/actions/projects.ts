"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hourlyRevenue,
  hoursBetween,
  isValidTime,
  moveProjectDay,
  removeProjectDay,
} from "@/lib/utils/projectDays";
import type {
  CostItem,
  DayHours,
  DayKm,
  DayNotes,
  DayTimes,
} from "@/lib/types/database.types";

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
  /** Dnevi z deljenim stroškom goriva (½). */
  fuel_shared_dates: string[];
  /** Čas od-do po dnevih. */
  day_times: DayTimes;
  /** Opomba po dnevih. */
  day_notes: DayNotes;
  revenue: number;
  /** Mesec obračuna "YYYY-MM"; null = mesec zadnjega delovnega dne. */
  billing_month: string | null;
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

// Deljeni dnevi goriva: samo dnevi projekta, ki imajo vpisane km.
function cleanSharedDates(input: ProjectInput): string[] {
  const dates = new Set(input.work_dates);
  return normalizeDates(
    (input.fuel_shared_dates ?? []).filter((d) => dates.has(d) && (input.day_km?.[d] ?? 0) > 0)
  );
}

// Čas od-do samo za dneve projekta in samo, če je vpisan vsaj en čas.
function cleanDayTimes(values: DayTimes, workDates: string[]): DayTimes {
  const dates = new Set(workDates);
  const result: DayTimes = {};
  for (const [date, time] of Object.entries(values ?? {})) {
    const start = isValidTime(time?.start) ? time.start : null;
    const end = isValidTime(time?.end) ? time.end : null;
    if (dates.has(date) && (start || end)) result[date] = { start, end };
  }
  return result;
}

// Opombe samo za dneve projekta in samo neprazne.
function cleanDayNotes(values: DayNotes, workDates: string[]): DayNotes {
  const dates = new Set(workDates);
  const result: DayNotes = {};
  for (const [date, note] of Object.entries(values ?? {})) {
    const text = typeof note === "string" ? note.trim() : "";
    if (dates.has(date) && text) result[date] = text;
  }
  return result;
}

function validateTimes(times: DayTimes): string | null {
  for (const time of Object.values(times ?? {})) {
    if ((time.start && !isValidTime(time.start)) || (time.end && !isValidTime(time.end))) {
      return "Neveljaven čas.";
    }
    if (isValidTime(time.start) && isValidTime(time.end) && time.end <= time.start) {
      return "Čas konca mora biti za časom začetka.";
    }
  }
  return null;
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
  if (
    input.billing_month !== null &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.billing_month)
  ) {
    return "Neveljaven mesec obračuna.";
  }

  return validateTimes(input.day_times);
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
    fuel_shared_dates: cleanSharedDates(input),
    day_times: cleanDayTimes(input.day_times, input.work_dates),
    day_notes: cleanDayNotes(input.day_notes, input.work_dates),
    revenue: input.revenue,
    billing_month: input.billing_month,
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
      fuel_shared_dates: cleanSharedDates(input),
      day_times: cleanDayTimes(input.day_times, input.work_dates),
      day_notes: cleanDayNotes(input.day_notes, input.work_dates),
      revenue: input.revenue,
      billing_month: input.billing_month,
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DAY_FIELDS =
  "client_id, work_dates, day_hours, day_km, fuel_shared_dates, day_times, day_notes, hourly_rate, extra_items";

/**
 * Prestavi en dan projekta na drug datum (z urami, km, časom, opombo in
 * oznako ½). Uporablja se iz koledarja.
 */
export async function moveProjectDayAction(
  id: string,
  from: string,
  to: string
): Promise<ProjectActionResult> {
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return { error: "Neveljaven datum." };
  if (from === to) return {};

  const supabase = await createClient();
  const { data: project, error: readError } = await supabase
    .from("projects")
    .select(DAY_FIELDS)
    .eq("id", id)
    .single();
  if (readError) {
    return { error: "Napaka pri branju projekta: " + readError.message };
  }

  const moved = moveProjectDay(project, from, to);
  if (!moved) return { error: "Projekt tega dne nima." };

  // Če sta se dneva združila, se ure lahko spremenijo - pri urnem obračunu
  // preračunamo priliv.
  const revenue = hourlyRevenue(project, moved.day_hours);
  const { error } = await supabase
    .from("projects")
    .update(revenue === null ? moved : { ...moved, revenue })
    .eq("id", id);
  if (error) {
    return { error: "Napaka pri prestavljanju dneva: " + error.message };
  }

  revalidatePath("/");
  revalidatePath("/projekti");
  return {};
}

/** Odstrani en dan iz projekta (projekt mora obdržati vsaj en dan). */
export async function removeProjectDayAction(
  id: string,
  date: string
): Promise<ProjectActionResult> {
  if (!DATE_RE.test(date)) return { error: "Neveljaven datum." };

  const supabase = await createClient();
  const { data: project, error: readError } = await supabase
    .from("projects")
    .select(DAY_FIELDS)
    .eq("id", id)
    .single();
  if (readError) {
    return { error: "Napaka pri branju projekta: " + readError.message };
  }

  const removed = removeProjectDay(project, date);
  if (!removed) {
    return {
      error: project.work_dates.includes(date)
        ? "To je edini dan projekta - projekt izbriši v zavihku Projekti."
        : "Projekt tega dne nima.",
    };
  }

  const revenue = hourlyRevenue(project, removed.day_hours);
  const { error } = await supabase
    .from("projects")
    .update(revenue === null ? removed : { ...removed, revenue })
    .eq("id", id);
  if (error) {
    return { error: "Napaka pri odstranjevanju dneva: " + error.message };
  }

  revalidatePath("/");
  revalidatePath("/projekti");
  return {};
}

export type AddProjectDaysInput = {
  /** Obstoječ projekt; null = nov projekt. */
  project_id: string | null;
  client_id: string;
  /** Ime novega projekta (pri obstoječem se ne uporabi). */
  name: string;
  dates: string[];
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

/**
 * Doda dneve (s časom in opombo) v obstoječ projekt ali ustvari nov projekt.
 * Nadomešča nekdanje ločene "vnose strank" v koledarju.
 */
export async function addProjectDaysAction(
  input: AddProjectDaysInput
): Promise<ProjectActionResult> {
  const dates = normalizeDates(input.dates ?? []);
  if (dates.length === 0 || !dates.every((d) => DATE_RE.test(d))) {
    return { error: "Izberi veljaven datum." };
  }
  if (dates.length > 366) return { error: "Obdobje je predolgo (največ 366 dni)." };
  if (!input.client_id) return { error: "Izberi partnerja." };

  const start = input.start_time || null;
  const end = input.end_time || null;
  const timeError = validateTimes({ day: { start, end } });
  if (timeError) return { error: timeError };
  const hours = hoursBetween(start, end);
  const note = input.note?.trim() || null;

  const supabase = await createClient();

  if (!input.project_id) {
    const name = input.name.trim();
    if (!name) return { error: "Vnesi ime projekta." };
    const day_times: DayTimes = {};
    const day_notes: DayNotes = {};
    const day_hours: DayHours = {};
    for (const d of dates) {
      if (start || end) day_times[d] = { start, end };
      if (note) day_notes[d] = note;
      if (hours) day_hours[d] = hours;
    }
    const { error } = await supabase.from("projects").insert({
      name,
      client_id: input.client_id,
      work_dates: dates,
      day_times,
      day_notes,
      day_hours,
      revenue: 0,
    });
    if (error) return { error: "Napaka pri ustvarjanju projekta: " + error.message };
  } else {
    const { data: project, error: readError } = await supabase
      .from("projects")
      .select(DAY_FIELDS)
      .eq("id", input.project_id)
      .single();
    if (readError) {
      return { error: "Napaka pri branju projekta: " + readError.message };
    }

    const day_times: DayTimes = { ...(project.day_times ?? {}) };
    const day_notes: DayNotes = { ...(project.day_notes ?? {}) };
    const day_hours: DayHours = { ...(project.day_hours ?? {}) };
    for (const d of dates) {
      if (start || end) day_times[d] = { start, end };
      if (note) day_notes[d] = note;
      // Ure vpišemo samo pri urnem obračunu (pri obračunu na projekt jih ni).
      if (hours && project.hourly_rate != null) day_hours[d] = hours;
    }
    const revenue = hourlyRevenue(project, day_hours);
    const { error } = await supabase
      .from("projects")
      .update({
        work_dates: normalizeDates([...project.work_dates, ...dates]),
        day_times,
        day_notes,
        day_hours,
        ...(revenue === null ? {} : { revenue }),
      })
      .eq("id", input.project_id);
    if (error) return { error: "Napaka pri dodajanju dni: " + error.message };
  }

  revalidatePath("/");
  revalidatePath("/projekti");
  return {};
}
