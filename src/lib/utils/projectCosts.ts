import type { CostItem } from "@/lib/types/database.types";

export function sumCostItems(items: CostItem[] | null | undefined): number {
  return (items ?? []).reduce((sum, item) => sum + item.amount, 0);
}
