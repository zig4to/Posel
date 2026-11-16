import { redirect } from "next/navigation";
import ClientForm from "@/components/clients/ClientForm";
import { createClientAction } from "@/actions/clients";
import { createClient } from "@/lib/supabase/server";
import { isReadOnlyViewer, SHARE_VIEWER_NAME, shareViewerId } from "@/lib/sharing";

export default async function NovPartnerPage() {
  const supabase = await createClient();
  if (await isReadOnlyViewer(supabase)) redirect("/partnerji");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Dodaj partnerja
      </h1>
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <ClientForm
          action={createClientAction}
          submitLabel="Dodaj partnerja"
          shareWithName={shareViewerId() ? SHARE_VIEWER_NAME : null}
        />
      </div>
    </div>
  );
}
