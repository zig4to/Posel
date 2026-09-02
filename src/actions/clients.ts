"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientCount } from "@/lib/data/clients";
import { nextClientColor } from "@/lib/utils/color";

export type ClientFormState = {
  error?: string;
};

function readClientFields(formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  const contactPerson = String(formData.get("contact_person") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  return {
    company_name: companyName,
    contact_person: contactPerson || null,
    phone: phone || null,
    email: email || null,
    address: address || null,
  };
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const fields = readClientFields(formData);

  if (!fields.company_name) {
    return { error: "Ime podjetja je obvezno polje." };
  }

  const supabase = await createClient();
  const existingCount = await getClientCount(supabase);
  const color = nextClientColor(existingCount);

  const { error } = await supabase.from("clients").insert({
    ...fields,
    color,
  });

  if (error) {
    return { error: "Napaka pri shranjevanju partnerja: " + error.message };
  }

  revalidatePath("/partnerji");
  revalidatePath("/");
  redirect("/partnerji");
}

export async function updateClientAction(
  id: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const fields = readClientFields(formData);

  if (!fields.company_name) {
    return { error: "Ime podjetja je obvezno polje." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(fields)
    .eq("id", id);

  if (error) {
    return { error: "Napaka pri posodabljanju partnerja: " + error.message };
  }

  revalidatePath("/partnerji");
  revalidatePath(`/partnerji/${id}`);
  revalidatePath("/");
  redirect(`/partnerji/${id}`);
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error("Napaka pri brisanju partnerja: " + error.message);
  }

  revalidatePath("/partnerji");
  revalidatePath("/");
  redirect("/partnerji");
}
