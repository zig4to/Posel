"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WorkEntryInput = {
  client_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

export type WorkEntryActionResult = { error?: string };

function validate(input: WorkEntryInput): string | null {
  if (!input.client_id) return "Izberi partnerja.";
  if (!input.work_date) return "Manjka datum.";
  if (input.start_time && input.end_time && input.end_time <= input.start_time) {
    return "Čas konca mora biti za časom začetka.";
  }
  return null;
}

export async function createWorkEntryAction(
  input: WorkEntryInput
): Promise<WorkEntryActionResult> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("work_entries").insert(input);

  if (error) {
    return { error: "Napaka pri shranjevanju vnosa: " + error.message };
  }

  revalidatePath("/");
  return {};
}

/**
 * Ustvari isti vnos za več dni hkrati (razpon datumov ob dodajanju stranke).
 * `work_date` v `input` se ignorira - datume podaš v `workDates`.
 */
export async function createWorkEntriesAction(
  input: WorkEntryInput,
  workDates: string[]
): Promise<WorkEntryActionResult> {
  if (workDates.length === 0) return { error: "Manjka datum." };
  if (workDates.length > 366) {
    return { error: "Obdobje je predolgo (največ 366 dni)." };
  }

  const validationError = validate({ ...input, work_date: workDates[0] });
  if (validationError) return { error: validationError };

  const rows = workDates.map((work_date) => ({ ...input, work_date }));

  const supabase = await createClient();
  const { error } = await supabase.from("work_entries").insert(rows);

  if (error) {
    return { error: "Napaka pri shranjevanju vnosa: " + error.message };
  }

  revalidatePath("/");
  return {};
}

export async function updateWorkEntryAction(
  id: string,
  input: WorkEntryInput
): Promise<WorkEntryActionResult> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("work_entries")
    .update(input)
    .eq("id", id);

  if (error) {
    return { error: "Napaka pri posodabljanju vnosa: " + error.message };
  }

  revalidatePath("/");
  return {};
}

export async function deleteWorkEntryAction(
  id: string
): Promise<WorkEntryActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("work_entries").delete().eq("id", id);

  if (error) {
    return { error: "Napaka pri brisanju vnosa: " + error.message };
  }

  revalidatePath("/");
  return {};
}

/**
 * Izbriše vse vnose za dano stranko v obsegu datumov (vključno z robovoma).
 * RLS poskrbi, da uporabnik briše le svoje vrstice.
 */
export async function deleteWorkEntriesRangeAction(
  clientId: string,
  from: string,
  to: string
): Promise<WorkEntryActionResult> {
  if (!clientId) return { error: "Manjka stranka." };
  if (!from || !to || to < from) return { error: "Neveljaven obseg datumov." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("work_entries")
    .delete()
    .eq("client_id", clientId)
    .gte("work_date", from)
    .lte("work_date", to);

  if (error) {
    return { error: "Napaka pri brisanju vnosov: " + error.message };
  }

  revalidatePath("/");
  return {};
}
