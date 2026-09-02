import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/data/clients";
import ClientListItem from "@/components/clients/ClientListItem";
import Button from "@/components/ui/Button";

export default async function PartnerjiPage() {
  const supabase = await createClient();
  const clients = await getClients(supabase);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Partnerji</h1>
        <Link href="/partnerji/nova">
          <Button>+ Dodaj partnerja</Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Ni partnerjev. Dodaj prvega partnerja z gumbom zgoraj.
        </p>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <ClientListItem key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
