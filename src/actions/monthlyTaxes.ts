"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyTax } from "@/lib/data/monthlyTaxes";

export type MonthlyTaxInput = {
  year: number;
  month: number; // 1-12
  amount: number;
};

export type MonthlyTaxActionResult = { error?: string };

export async function setMonthlyTaxAction(
  input: MonthlyTaxInput
): Promise<MonthlyTaxActionResult> {
  if (input.amount < 0) return { error: "Znesek ne sme biti negativen." };

  const supabase = await createClient();
  const existing = await getMonthlyTax(supabase, input.year, input.month);

  const { error } = existing
    ? await supabase
        .from("monthly_taxes")
        .update({ amount: input.amount })
        .eq("id", existing.id)
    : await supabase.from("monthly_taxes").insert({
        year: input.year,
        month: input.month,
        amount: input.amount,
      });

  if (error) {
    return { error: "Napaka pri shranjevanju davčnih obveznosti: " + error.message };
  }

  revalidatePath("/projekti");
  return {};
}
