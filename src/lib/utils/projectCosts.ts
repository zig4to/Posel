import type { CostItem, DayHours } from "@/lib/types/database.types";

export function sumCostItems(items: CostItem[] | null | undefined): number {
  return (items ?? []).reduce((sum, item) => sum + item.amount, 0);
}

/** Seštevek ur vseh dni projekta. */
export function sumDayHours(dayHours: DayHours | null | undefined): number {
  return Object.values(dayHours ?? {}).reduce((sum, h) => sum + h, 0);
}

/** Ure za prikaz: "8 h", "7,5 h". */
export function formatHours(hours: number): string {
  return `${hours.toLocaleString("sl-SI", { maximumFractionDigits: 2 })} h`;
}
