"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientCount } from "@/lib/data/clients";
import { isHexColor, nextClientColor } from "@/lib/utils/color";
import { isReadOnlyViewer, shareViewerId } from "@/lib/sharing";

const READ_ONLY_ERROR = "Imaš samo pravico ogleda.";

export type ClientFormState = {
  error?: string;
};

function readClientFields(formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  const contactPerson = String(formData.get("contact_person") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const colorValue = String(formData.get("color") ?? "").trim();
  // Barva samo, če je veljavna (#RRGGBB); sicer ostane obstoječa / samodejna.
  const color = isHexColor(colorValue) ? { color: colorValue.toUpperCase() } : {};

  // Polje "Deli z …" je v obrazcu le, če je gledalec nastavljen.
  const viewerId = shareViewerId();
  const sharing =
    viewerId && formData.has("share_field")
      ? { shared_with: formData.get("shared") === "on" ? [viewerId] : [] }
      : {};

  return {
    company_name: companyName,
    contact_person: contactPerson || null,
    phone: phone || null,
    email: email || null,
    address: address || null,
    ...color,
    ...sharing,
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
  if (await isReadOnlyViewer(supabase)) return { error: READ_ONLY_ERROR };
  // Brez ročno izbrane barve dodelimo naslednjo iz palete.
  const color = fields.color ?? nextClientColor(await getClientCount(supabase));

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
  if (await isReadOnlyViewer(supabase)) return { error: READ_ONLY_ERROR };
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
  if (await isReadOnlyViewer(supabase)) throw new Error(READ_ONLY_ERROR);
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error("Napaka pri brisanju partnerja: " + error.message);
  }

  revalidatePath("/partnerji");
  revalidatePath("/");
  redirect("/partnerji");
}
