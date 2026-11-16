import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/data/clients";
import ClientListItem from "@/components/clients/ClientListItem";
import Button from "@/components/ui/Button";
import { isReadOnlyViewer, SHARE_VIEWER_NAME, shareViewerId } from "@/lib/sharing";

export default async function PartnerjiPage() {
  const supabase = await createClient();
  const [clients, readOnly] = await Promise.all([
    getClients(supabase),
    isReadOnlyViewer(supabase),
  ]);
  const viewerId = shareViewerId();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Partnerji</h1>
        {!readOnly && (
          <Link href="/partnerji/nova">
            <Button>+ Dodaj partnerja</Button>
          </Link>
        )}
      </div>

      {clients.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          {readOnly
            ? "Z tabo še ni deljen noben partner."
            : "Ni partnerjev. Dodaj prvega partnerja z gumbom zgoraj."}
        </p>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <ClientListItem
              key={client.id}
              client={client}
              sharedLabel={
                !readOnly && viewerId && (client.shared_with ?? []).includes(viewerId)
                  ? `Deljeno z ${SHARE_VIEWER_NAME}`
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
