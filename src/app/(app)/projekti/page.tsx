import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/data/projects";
import { getClients } from "@/lib/data/clients";
import { ColorDot } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DeleteProjectButton from "@/components/projects/DeleteProjectButton";
import { formatEUR } from "@/lib/utils/currency";
import { SLOVENIAN_MONTHS } from "@/lib/utils/date";
import type { ProjectWithClient } from "@/lib/types/database.types";

function monthKey(project: ProjectWithClient): string {
  return project.work_dates[0].slice(0, 7); // "YYYY-MM"
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${SLOVENIAN_MONTHS[month - 1]} ${year}`;
}

function formatDaysLabel(project: ProjectWithClient): string {
  const [year, month] = project.work_dates[0].split("-").map(Number);
  const days = project.work_dates.map((d) => Number(d.slice(8, 10)));
  return `${days.join(", ")}. ${SLOVENIAN_MONTHS[month - 1]} ${year}`;
}

export default async function ProjektiPage() {
  const supabase = await createClient();
  const [projects, clients] = await Promise.all([
    getProjects(supabase),
    getClients(supabase),
  ]);

  const groups = new Map<string, ProjectWithClient[]>();
  for (const project of projects) {
    const key = monthKey(project);
    const list = groups.get(key) ?? [];
    list.push(project);
    groups.set(key, list);
  }
  const sortedKeys = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Projekti</h1>
        {clients.length > 0 && (
          <Link href="/projekti/nov">
            <Button>+ Dodaj projekt</Button>
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          {clients.length === 0
            ? 'Najprej dodaj vsaj eno stranko v zavihku "Stranke".'
            : "Ni projektov. Dodaj prvega z gumbom zgoraj."}
        </p>
      ) : (
        <div className="space-y-6">
          {sortedKeys.map((key) => {
            const monthProjects = groups.get(key)!;
            const totals = monthProjects.reduce(
              (acc, p) => ({
                costs: acc.costs + p.costs,
                revenue: acc.revenue + p.revenue,
                profit: acc.profit + (p.revenue - p.costs),
              }),
              { costs: 0, revenue: 0, profit: 0 }
            );

            return (
              <section key={key}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-200 pb-2 dark:border-gray-800">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {formatMonthLabel(key)}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Stroški {formatEUR(totals.costs)} · Priliv {formatEUR(totals.revenue)} ·{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      Dobiček {formatEUR(totals.profit)}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  {monthProjects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-md border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ColorDot
                              color={project.clients?.color ?? "#9CA3AF"}
                              className="h-2.5 w-2.5 flex-shrink-0"
                            />
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                              {project.clients?.company_name ?? "Neznana stranka"}
                            </p>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatDaysLabel(project)}
                          </p>
                          {project.note && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {project.note}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-right text-sm">
                          <p className="text-gray-600 dark:text-gray-400">
                            Stroški {formatEUR(project.costs)}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            Priliv {formatEUR(project.revenue)}
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            Dobiček {formatEUR(project.revenue - project.costs)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Link href={`/projekti/${project.id}/uredi`}>
                          <Button type="button" variant="secondary">
                            Uredi
                          </Button>
                        </Link>
                        <DeleteProjectButton projectId={project.id} />
                      </div>
                    </div>
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
