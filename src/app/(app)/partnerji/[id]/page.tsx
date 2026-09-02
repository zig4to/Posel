import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientById } from "@/lib/data/clients";
import { ColorDot } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DeleteClientButton from "@/components/clients/DeleteClientButton";

const FIELDS: Array<{ key: "contact_person" | "phone" | "email" | "address"; label: string }> = [
  { key: "contact_person", label: "Kontaktna oseba" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "E-pošta" },
  { key: "address", label: "Naslov" },
];

export default async function PartnerDetailPage({
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

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ColorDot color={client.color} className="h-3.5 w-3.5" />
          <h1 className="min-w-0 break-words text-xl font-semibold text-gray-900 dark:text-gray-100">
            {client.company_name}
          </h1>
        </div>
        <Link href={`/partnerji/${client.id}/uredi`} className="flex-shrink-0">
          <Button variant="secondary">Uredi</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <dl className="space-y-3">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {label}
              </dt>
              <dd className="break-words text-sm text-gray-900 dark:text-gray-100">{client[key] || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 flex justify-between">
        <Link
          href="/partnerji"
          className="text-sm text-gray-500 hover:underline dark:text-gray-400"
        >
          ← Nazaj na seznam
        </Link>
        <DeleteClientButton clientId={client.id} />
      </div>
    </div>
  );
}
