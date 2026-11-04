// Delo s posameznimi dnevi projekta: prestavitev, dodajanje in odstranitev
// dneva (skupaj z urami, km, časom, opombo in oznako deljenega goriva).

import type {
  DayHours,
  DayKm,
  DayNotes,
  DayTimes,
  Project,
} from "@/lib/types/database.types";
import { sumCostItems, sumDayHours } from "@/lib/utils/projectCosts";

export type ProjectDayFields = Pick<
  Project,
  "work_dates" | "day_hours" | "day_km" | "fuel_shared_dates" | "day_times" | "day_notes"
>;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Ali je niz veljaven čas "HH:MM". */
export function isValidTime(value: string | null | undefined): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

/** Ure med "HH:MM" in "HH:MM" (zaokroženo na 2 decimalki) ali null. */
export function hoursBetween(start: string | null, end: string | null): number | null {
  if (!isValidTime(start) || !isValidTime(end)) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) return null;
  return Math.round((minutes / 60) * 100) / 100;
}

function moveKey<T>(values: Record<string, T> | null | undefined, from: string, to: string) {
  const next = { ...(values ?? {}) };
  if (from in next) {
    // Če ima ciljni dan že svojo vrednost, ostane ta; izvorna se zavrže.
    if (!(to in next)) next[to] = next[from];
    delete next[from];
  }
  return next;
}

function dropKey<T>(values: Record<string, T> | null | undefined, key: string) {
  const next = { ...(values ?? {}) };
  delete next[key];
  return next;
}

/**
 * Vrne posodobljena polja projekta, kjer je dan `from` zamenjan z `to`.
 * Če projekt dneva `from` nima, vrne null (ni kaj prestaviti).
 */
export function moveProjectDay(
  project: ProjectDayFields,
  from: string,
  to: string
): ProjectDayFields | null {
  if (from === to || !project.work_dates.includes(from)) return null;

  const work_dates = [
    ...new Set(project.work_dates.filter((d) => d !== from).concat(to)),
  ].sort();
  const day_hours: DayHours = moveKey(project.day_hours, from, to);
  const day_km: DayKm = moveKey(project.day_km, from, to);
  const day_times: DayTimes = moveKey(project.day_times, from, to);
  const day_notes: DayNotes = moveKey(project.day_notes, from, to);

  // Oznaka ½ gre z km: prestavi se, če so se prestavili km izvornega dne.
  const shared = new Set(project.fuel_shared_dates ?? []);
  const kmMoved = from in (project.day_km ?? {}) && !(to in (project.day_km ?? {}));
  if (shared.has(from)) {
    shared.delete(from);
    if (kmMoved) shared.add(to);
  }

  return {
    work_dates,
    day_hours,
    day_km,
    day_times,
    day_notes,
    fuel_shared_dates: [...shared].sort(),
  };
}

/**
 * Odstrani dan iz projekta. Vrne null, če projekt dneva nima ali je to
 * njegov edini dan (projekt mora imeti vsaj en dan).
 */
export function removeProjectDay(
  project: ProjectDayFields,
  date: string
): ProjectDayFields | null {
  if (!project.work_dates.includes(date) || project.work_dates.length < 2) return null;
  return {
    work_dates: project.work_dates.filter((d) => d !== date),
    day_hours: dropKey(project.day_hours, date),
    day_km: dropKey(project.day_km, date),
    day_times: dropKey(project.day_times, date),
    day_notes: dropKey(project.day_notes, date),
    fuel_shared_dates: (project.fuel_shared_dates ?? []).filter((d) => d !== date),
  };
}

/**
 * Pri urnem obračunu je priliv izpeljan iz ur: ure × cena na uro + dodatne
 * storitve. Ob spremembi ur ga zato preračunamo.
 */
export function hourlyRevenue(
  project: Pick<Project, "hourly_rate" | "extra_items">,
  dayHours: DayHours
): number | null {
  if (project.hourly_rate == null) return null;
  const base = Math.round(sumDayHours(dayHours) * project.hourly_rate * 100) / 100;
  return Math.round((base + sumCostItems(project.extra_items)) * 100) / 100;
}
