"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EventInput = {
  event_date: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

export type EventActionResult = { error?: string };

function validate(input: EventInput): string | null {
  if (!input.event_date) return "Manjka datum.";
  if (!input.title.trim()) return "Vnesi ime dogodka.";
  if (input.start_time && input.end_time && input.end_time <= input.start_time) {
    return "Čas konca mora biti za časom začetka.";
  }
  return null;
}

export async function createEventAction(
  input: EventInput
): Promise<EventActionResult> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .insert({ ...input, title: input.title.trim() });

  if (error) {
    return { error: "Napaka pri shranjevanju dogodka: " + error.message };
  }

  revalidatePath("/");
  return {};
}

export async function updateEventAction(
  id: string,
  input: EventInput
): Promise<EventActionResult> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ ...input, title: input.title.trim() })
    .eq("id", id);

  if (error) {
    return { error: "Napaka pri posodabljanju dogodka: " + error.message };
  }

  revalidatePath("/");
  return {};
}

export async function deleteEventAction(
  id: string
): Promise<EventActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return { error: "Napaka pri brisanju dogodka: " + error.message };
  }

  revalidatePath("/");
  return {};
}
