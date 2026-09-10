"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LeaveInput = {
  title: string;
  start_date: string;
  end_date: string;
  color: string;
};

export type LeaveActionResult = { error?: string };

function validate(input: LeaveInput): string | null {
  if (!input.title.trim()) return "Vnesi ime dopusta.";
  if (!input.start_date || !input.end_date) return "Vnesi obseg datumov.";
  if (input.end_date < input.start_date) {
    return "Datum konca mora biti enak ali za datumom začetka.";
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(input.color)) return "Neveljavna barva.";
  return null;
}

export async function createLeaveAction(
  input: LeaveInput
): Promise<LeaveActionResult> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leaves")
    .insert({ ...input, title: input.title.trim() });

  if (error) {
    return { error: "Napaka pri shranjevanju dopusta: " + error.message };
  }

  revalidatePath("/");
  return {};
}

export async function updateLeaveAction(
  id: string,
  input: LeaveInput
): Promise<LeaveActionResult> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leaves")
    .update({ ...input, title: input.title.trim() })
    .eq("id", id);

  if (error) {
    return { error: "Napaka pri posodabljanju dopusta: " + error.message };
  }

  revalidatePath("/");
  return {};
}

export async function deleteLeaveAction(
  id: string
): Promise<LeaveActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("leaves").delete().eq("id", id);

  if (error) {
    return { error: "Napaka pri brisanju dopusta: " + error.message };
  }

  revalidatePath("/");
  return {};
}
