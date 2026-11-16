import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/data/projects";
import { getClients } from "@/lib/data/clients";
import { getMonthlyTaxes } from "@/lib/data/monthlyTaxes";
import Button from "@/components/ui/Button";
import ProjectCard from "@/components/projects/ProjectCard";
import TaxObligationsButton from "@/components/projects/TaxObligationsButton";
import SumHoursButton from "@/components/projects/SumHoursButton";
import { formatEUR } from "@/lib/utils/currency";
import { isReadOnlyViewer } from "@/lib/sharing";
import { formatDateKey } from "@/lib/utils/date";
import {
  formatMonthKey,
  projectBillingMonth,
  projectMonthShare,
  workMonths,
} from "@/lib/utils/projectMonths";
import { formatHours, projectTotalCosts } from "@/lib/utils/projectCosts";
import type { ProjectWithClient } from "@/lib/types/database.types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}


export default async function ProjektiPage() {
  const supabase = await createClient();
  const [projects, clients, monthlyTaxes, readOnly] = await Promise.all([
    getProjects(supabase),
    getClients(supabase),
    getMonthlyTaxes(supabase),
    isReadOnlyViewer(supabase),
  ]);

  const groups = new Map<string, ProjectWithClient[]>();
  for (const project of projects) {
    // Projekt čez več mesecev se šteje v mesec obračuna (privzeto zadnji dan).
    const key = projectBillingMonth(project);
    const list = groups.get(key) ?? [];
    list.push(project);
    groups.set(key, list);
  }

  // Vsi projekti po mesecih, v katerih je bilo delo - za informativni
  // zaslužek meseca po dnevih dela (ne glede na mesec obračuna).
  const workedByMonth = new Map<string, ProjectWithClient[]>();
  for (const project of projects) {
    for (const key of workMonths(project.work_dates)) {
      const list = workedByMonth.get(key) ?? [];
      list.push(project);
      workedByMonth.set(key, list);
    }
  }

  const taxByMonth = new Map<string, number>();
  for (const tax of monthlyTaxes) {
    taxByMonth.set(`${tax.year}-${pad2(tax.month)}`, tax.amount);
  }

  // Tekoči mesec ima seznam projektov privzeto razprt.
  const currentMonthKey = formatDateKey(new Date()).slice(0, 7);

  const sortedKeys = [
    ...new Set([...groups.keys(), ...taxByMonth.keys(), ...workedByMonth.keys()]),
  ].sort(
    (a, b) => b.localeCompare(a)
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">Vsi projekti</h1>
        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
          {!readOnly && clients.length > 0 && (
            <Link href="/projekti/nov">
              <Button className="h-8 whitespace-nowrap px-2.5 text-xs sm:px-3 sm:text-sm">+ Dodaj projekt</Button>
            </Link>
          )}
          {clients.length > 0 && (
            <SumHoursButton
              clients={clients.map((c) => ({ id: c.id, company_name: c.company_name }))}
              projects={projects.map((p) => ({
                id: p.id,
                name: p.name,
                client_id: p.client_id,
                work_dates: p.work_dates,
                day_hours: p.day_hours,
              }))}
            />
          )}
          {!readOnly && <TaxObligationsButton />}
          {projects.length > 0 && (
            <Link href="/projekti/statistika" aria-label="Statistika" title="Statistika">
              <Button type="button" variant="secondary" className="h-8">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                  <path d="M18 17V9" />
                  <path d="M13 17V5" />
                  <path d="M8 17v-3" />
                </svg>
                <span className="hidden sm:inline">Statistika</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {sortedKeys.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          {clients.length === 0
            ? 'Najprej dodaj vsaj enega partnerja v zavihku "Partnerji".'
            : readOnly
              ? "Ni deljenih projektov."
              : "Ni projektov. Dodaj prvega z gumbom zgoraj."}
        </p>
      ) : (
        <div className="space-y-6">
          {sortedKeys.map((key) => {
            const monthProjects = groups.get(key) ?? [];
            const tax = taxByMonth.get(key) ?? 0;
            const totals = monthProjects.reduce(
              (acc, p) => {
                const costs = projectTotalCosts(p);
                return {
                  costs: acc.costs + costs,
                  revenue: acc.revenue + p.revenue,
                  profit: acc.profit + (p.revenue - costs),
                };
              },
              { costs: 0, revenue: 0, profit: 0 }
            );
            const netProfit = totals.profit - tax;

            // Informativno po dnevih dela: vsak projekt prispeva le delež dni
            // tega meseca. Prikazano samo, če se razlikuje od obračuna - torej
            // ko je kak projekt čez več mesecev ali obračunan v drugem mesecu.
            const worked = (workedByMonth.get(key) ?? []).map((p) => ({
              project: p,
              share: projectMonthShare(p, key),
            }));
            const info = worked.reduce(
              (acc, { share }) => ({
                revenue: acc.revenue + share.revenue,
                costs: acc.costs + share.costs,
              }),
              { revenue: 0, costs: 0 }
            );
            const splits = worked.filter(
              ({ project }) =>
                workMonths(project.work_dates).length > 1 ||
                projectBillingMonth(project) !== key
            );
            const movedOut = monthProjects.filter(
              (p) => !workMonths(p.work_dates).includes(key)
            );

            return (
              <section key={key}>
                {/* Pregled meseca je skrit; prikaže ga klik na ikono "i" ob mesecu. */}
                <details className="group/overview">
                <summary className="mb-2 flex w-fit cursor-pointer list-none items-center gap-1.5 select-none [&::-webkit-details-marker]:hidden">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {formatMonthKey(key)}
                  </h2>
                  <span
                    className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 group-open/overview:text-blue-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-blue-400 dark:group-open/overview:text-blue-400"
                    aria-label="Pregled meseca"
                    title="Pregled meseca"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </span>
                </summary>

                <div
                  className={
                    "mb-3 grid gap-3 rounded-md border border-gray-200 border-l-4 border-l-blue-500 bg-white p-3 dark:border-gray-800 dark:border-l-blue-500 dark:bg-gray-900 " +
                    (readOnly ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-5")
                  }
                >
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
                  {/* Davki so lastnikovi in niso vezani na stranko - gledalec jih ne vidi. */}
                  {!readOnly && (
                    <>
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
                    </>
                  )}
                </div>

                {(splits.length > 0 || movedOut.length > 0) && (
                  <div className="mb-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Informativno po dnevih dela v tem mesecu
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      Zaslužek:{" "}
                      <span className="font-semibold">{formatEUR(info.revenue)}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {" "}
                        · dobiček {formatEUR(info.revenue - info.costs)}
                      </span>
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {splits.map(({ project, share }) => (
                        <li key={project.id} className="text-xs text-gray-500 dark:text-gray-400">
                          {project.name}: {share.days} od {project.work_dates.length} dni
                          {share.hours > 0 && ` (${formatHours(share.hours)})`} –{" "}
                          {formatEUR(share.revenue)}
                          {projectBillingMonth(project) !== key &&
                            ` · obračun ${formatMonthKey(projectBillingMonth(project))}`}
                        </li>
                      ))}
                      {movedOut.map((project) => (
                        <li key={project.id} className="text-xs text-gray-500 dark:text-gray-400">
                          {project.name}: delo v drugem mesecu – ni všteto
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </details>

                {monthProjects.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Ni projektov ta mesec.
                  </p>
                ) : (
                  <details className="group" open={key === currentMonthKey}>
                    <summary className="mb-2 flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-gray-900 select-none dark:text-gray-100 [&::-webkit-details-marker]:hidden">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-90 dark:text-gray-400"
                        aria-hidden="true"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                      Projekti
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        ({monthProjects.length})
                      </span>
                    </summary>

                    <div className="space-y-2">
                      {monthProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} readOnly={readOnly} />
                      ))}
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
