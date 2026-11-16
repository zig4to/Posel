import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/data/projects";
import { getMonthlyTaxes } from "@/lib/data/monthlyTaxes";
import { isReadOnlyViewer } from "@/lib/sharing";
import StatisticsView from "@/components/statistics/StatisticsView";

export default async function StatistikaPage() {
  const supabase = await createClient();
  const [projects, readOnly] = await Promise.all([
    getProjects(supabase),
    isReadOnlyViewer(supabase),
  ]);
  // Davki so lastnikovi - gledalec jih ne vidi.
  const taxes = readOnly ? [] : await getMonthlyTaxes(supabase);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/projekti"
          aria-label="Nazaj na projekte"
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Statistika</h1>
      </div>
      <StatisticsView projects={projects} taxes={taxes} readOnly={readOnly} />
    </div>
  );
}
