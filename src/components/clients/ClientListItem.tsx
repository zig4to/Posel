import Link from "next/link";
import type { Client } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";

export default function ClientListItem({ client }: { client: Client }) {
  return (
    <Link
      href={`/partnerji/${client.id}`}
      className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:shadow-black/40"
    >
      <ColorDot color={client.color} className="h-3 w-3 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {client.company_name}
        </p>
        {client.contact_person && (
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {client.contact_person}
          </p>
        )}
      </div>
      <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">→</span>
    </Link>
  );
}
