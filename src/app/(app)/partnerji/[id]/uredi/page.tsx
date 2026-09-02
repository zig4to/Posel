import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientById } from "@/lib/data/clients";
import ClientForm from "@/components/clients/ClientForm";
import { updateClientAction } from "@/actions/clients";

export default async function UrediPartnerjaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let client;
  try {
    client = await getClientById(supabase, id);
  } catch {
    notFound();
  }

  const action = updateClientAction.bind(null, client.id);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Uredi partnerja
      </h1>
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <ClientForm
          action={action}
          initialValues={client}
          submitLabel="Shrani spremembe"
        />
      </div>
    </div>
  );
}
