import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/data/projects";
import { getClients } from "@/lib/data/clients";
import { getMonthlyTaxes } from "@/lib/data/monthlyTaxes";
import Button from "@/components/ui/Button";
import ProjectCard from "@/components/projects/ProjectCard";
import TaxObligationsButton from "@/components/projects/TaxObligationsButton";
import { formatEUR } from "@/lib/utils/currency";
import { SLOVENIAN_MONTHS } from "@/lib/utils/date";
import { sumCostItems } from "@/lib/utils/projectCosts";
import type { ProjectWithClient } from "@/lib/types/database.types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthKey(project: ProjectWithClient): string {
  return project.work_dates[0].slice(0, 7); // "YYYY-MM"
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${SLOVENIAN_MONTHS[month - 1]} ${year}`;
}

export default async function ProjektiPage() {
  const supabase = await createClient();
  const [projects, clients, monthlyTaxes] = await Promise.all([
    getProjects(supabase),
    getClients(supabase),
    getMonthlyTaxes(supabase),
  ]);

  const groups = new Map<string, ProjectWithClient[]>();
  for (const project of projects) {
    const key = monthKey(project);
    const list = groups.get(key) ?? [];
    list.push(project);
    groups.set(key, list);
  }

  const taxByMonth = new Map<string, number>();
  for (const tax of monthlyTaxes) {
    taxByMonth.set(`${tax.year}-${pad2(tax.month)}`, tax.amount);
  }

  const sortedKeys = [...new Set([...groups.keys(), ...taxByMonth.keys()])].sort(
    (a, b) => b.localeCompare(a)
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Vsi projekti</h1>
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <Link href="/projekti/nov">
              <Button>+ Dodaj projekt</Button>
            </Link>
          )}
          <TaxObligationsButton />
        </div>
      </div>

      {sortedKeys.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          {clients.length === 0
            ? 'Najprej dodaj vsaj enega partnerja v zavihku "Partnerji".'
            : "Ni projektov. Dodaj prvega z gumbom zgoraj."}
        </p>
      ) : (
        <div className="space-y-6">
          {sortedKeys.map((key) => {
            const monthProjects = groups.get(key) ?? [];
            const tax = taxByMonth.get(key) ?? 0;
            const totals = monthProjects.reduce(
              (acc, p) => {
                const costs = sumCostItems(p.cost_items);
                return {
                  costs: acc.costs + costs,
                  revenue: acc.revenue + p.revenue,
                  profit: acc.profit + (p.revenue - costs),
                };
              },
              { costs: 0, revenue: 0, profit: 0 }
            );
            const netProfit = totals.profit - tax;

            return (
              <section key={key}>
                <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {formatMonthLabel(key)}
                </h2>

                <div className="mb-3 grid grid-cols-2 gap-3 rounded-md border border-gray-200 border-l-4 border-l-blue-500 bg-white p-3 dark:border-gray-800 dark:border-l-blue-500 dark:bg-gray-900 sm:grid-cols-5">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Stroški</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatEUR(totals.costs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Priliv</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatEUR(totals.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Dobiček</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatEUR(totals.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Davčne obveznosti
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatEUR(tax)}
                    </p>
                  </div>
                  <div className="col-span-2 border-t border-gray-100 pt-2 dark:border-gray-800 sm:col-span-1 sm:border-t-0 sm:pt-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Neto dobiček</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {formatEUR(netProfit)}
                    </p>
                  </div>
                </div>

                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Projekti
                </h3>

                <div className="space-y-2">
                  {monthProjects.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Ni projektov ta mesec.
                    </p>
                  )}
                  {monthProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
