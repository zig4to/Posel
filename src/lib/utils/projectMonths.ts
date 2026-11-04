// Pomožne funkcije za projekte, ki segajo čez več mesecev.
// Ključ meseca je niz "YYYY-MM".

import type { Project } from "@/lib/types/database.types";
import { SLOVENIAN_MONTHS } from "@/lib/utils/date";
import { fuelCost, payableKm, sumCostItems, sumDayHours } from "@/lib/utils/projectCosts";

type ProjectMonthFields = { work_dates: string[]; billing_month: string | null };

/** "YYYY-MM-DD" -> "YYYY-MM" */
export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** "2026-11" -> "November 2026" */
export function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${SLOVENIAN_MONTHS[month - 1]} ${year}`;
}

/** Premakne ključ meseca za `delta` mesecev (lahko negativno). */
export function addMonths(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Samodejni mesec obračuna: mesec zadnjega delovnega dne. */
export function autoBillingMonth(workDates: string[]): string {
  const sorted = [...workDates].sort();
  return monthKeyOf(sorted[sorted.length - 1]);
}

/** Mesec, v katerega se projekt šteje v mesečnem pregledu financ. */
export function projectBillingMonth(project: ProjectMonthFields): string {
  return project.billing_month ?? autoBillingMonth(project.work_dates);
}

/** Različni meseci delovnih dni, urejeni naraščajoče. */
export function workMonths(workDates: string[]): string[] {
  return [...new Set(workDates.map(monthKeyOf))].sort();
}

export type ProjectMonthShare = {
  /** Del priliva, ki odpade na dneve dela v tem mesecu. */
  revenue: number;
  /** Del stroškov: gorivo točno po km dni tega meseca, ostalo sorazmerno. */
  costs: number;
  /** Delež dela v mesecu (0–1): po urah, če so vpisane, sicer po dnevih. */
  weight: number;
  days: number;
  hours: number;
};

type ProjectShareFields = ProjectMonthFields &
  Pick<
    Project,
    | "revenue"
    | "day_hours"
    | "day_km"
    | "cost_items"
    | "fuel_consumption"
    | "fuel_price"
    | "fuel_shared_dates"
  >;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Informativni del projekta, ki pade v dani mesec (po dnevih dela) - ne glede
 * na mesec obračuna. Priliv (vključno z dodatnimi storitvami) in ostali
 * stroški se razdelijo po urah tega meseca (oz. po dnevih, če ur ni);
 * gorivo pa točno po km dni v mesecu.
 */
export function projectMonthShare(project: ProjectShareFields, key: string): ProjectMonthShare {
  const monthDates = project.work_dates.filter((d) => monthKeyOf(d) === key);
  const totalHours = sumDayHours(project.day_hours);
  const hours = monthDates.reduce((sum, d) => sum + (project.day_hours?.[d] ?? 0), 0);
  const weight =
    totalHours > 0
      ? hours / totalHours
      : project.work_dates.length > 0
        ? monthDates.length / project.work_dates.length
        : 0;

  const monthKm = payableKm(project.day_km, project.fuel_shared_dates, monthDates);
  const fuel =
    monthKm && project.fuel_consumption && project.fuel_price
      ? fuelCost(monthKm, project.fuel_consumption, project.fuel_price)
      : 0;

  return {
    revenue: round2(project.revenue * weight),
    costs: round2(sumCostItems(project.cost_items) * weight + fuel),
    weight,
    days: monthDates.length,
    hours,
  };
}
