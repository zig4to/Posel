import Link from "next/link";
import type { Client } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";

export default function ClientListItem({
  client,
  sharedLabel,
}: {
  client: Client;
  sharedLabel?: string | null;
}) {
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
      {sharedLabel && (
        <span
          className="flex flex-shrink-0 items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
          title={sharedLabel}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="hidden sm:inline">{sharedLabel}</span>
        </span>
      )}
      <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">→</span>
    </Link>
  );
}
