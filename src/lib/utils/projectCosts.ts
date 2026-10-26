import type { CostItem, DayHours, DayKm, Project } from "@/lib/types/database.types";

/** Povprečna poraba VW Passat 2.0 TDI (2008) v kombinirani vožnji, l/100 km. */
export const DEFAULT_FUEL_CONSUMPTION = 6.5;

/** Pogoste relacije za hiter vnos km (cestna razdalja po A2, zaokroženo). */
export type FuelRoute = { label: string; km: number };

export const FUEL_ROUTES: FuelRoute[] = [
  { label: "LJ – KR – LJ", km: 54 },
];

export function sumCostItems(items: CostItem[] | null | undefined): number {
  return (items ?? []).reduce((sum, item) => sum + item.amount, 0);
}

/** Seštevek ur vseh dni projekta. */
export function sumDayHours(dayHours: DayHours | null | undefined): number {
  return Object.values(dayHours ?? {}).reduce((sum, h) => sum + h, 0);
}

/** Seštevek prevoženih km vseh dni projekta. */
export function sumDayKm(dayKm: DayKm | null | undefined): number {
  return Object.values(dayKm ?? {}).reduce((sum, km) => sum + km, 0);
}

/** Porabljeni litri goriva za dane km pri porabi l/100 km. */
export function fuelLiters(km: number, consumption: number): number {
  return (km * consumption) / 100;
}

/** Strošek goriva v EUR, zaokrožen na cente. */
export function fuelCost(km: number, consumption: number, price: number): number {
  return Math.round(fuelLiters(km, consumption) * price * 100) / 100;
}

export function projectFuelCost(
  project: Pick<Project, "day_km" | "fuel_consumption" | "fuel_price">
): number {
  const km = sumDayKm(project.day_km);
  if (!km || !project.fuel_consumption || !project.fuel_price) return 0;
  return fuelCost(km, project.fuel_consumption, project.fuel_price);
}

/** Vsi stroški projekta: postavke + gorivo. */
export function projectTotalCosts(
  project: Pick<Project, "cost_items" | "day_km" | "fuel_consumption" | "fuel_price">
): number {
  return sumCostItems(project.cost_items) + projectFuelCost(project);
}

/** Km za prikaz: "84 km", "120,5 km". */
export function formatKm(km: number): string {
  return `${km.toLocaleString("sl-SI", { maximumFractionDigits: 1 })} km`;
}

/** Ure za prikaz: "8 h", "7,5 h". */
export function formatHours(hours: number): string {
  return `${hours.toLocaleString("sl-SI", { maximumFractionDigits: 2 })} h`;
}
