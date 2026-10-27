"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectWithClient } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DeleteProjectButton from "@/components/projects/DeleteProjectButton";
import { formatEUR } from "@/lib/utils/currency";
import {
  formatHours,
  formatKm,
  projectFuelCost,
  projectTotalCosts,
  sumCostItems,
  sumDayHours,
  sumDayKm,
} from "@/lib/utils/projectCosts";
import { SLOVENIAN_MONTHS } from "@/lib/utils/date";

// Na računalniku (md+) manjši gumbi enake širine, zloženi drug nad drugim.
const CARD_BUTTON_CLASS = "md:w-full md:px-2.5 md:py-1 md:text-xs";

function formatDaysLabel(project: ProjectWithClient): string {
  const [year, month] = project.work_dates[0].split("-").map(Number);
  const days = project.work_dates.map((d) => Number(d.slice(8, 10)));
  return `${days.join(", ")}. ${SLOVENIAN_MONTHS[month - 1]} ${year}`;
}

export default function ProjectCard({ project }: { project: ProjectWithClient }) {
  const [showNotes, setShowNotes] = useState(false);
  const costItems = project.cost_items ?? [];
  const costs = projectTotalCosts(project);
  const fuel = projectFuelCost(project);
  const totalKm = sumDayKm(project.day_km);
  const profit = project.revenue - costs;
  const totalHours = sumDayHours(project.day_hours);
  const costNotes = costItems.filter((item) => item.note && item.note.trim());
  const extraItems = project.extra_items ?? [];
  const extras = sumCostItems(extraItems);
  const extraNotes = extraItems.filter((item) => item.note && item.note.trim());
  const hasNotes =
    Boolean(project.note) || costNotes.length > 0 || extraNotes.length > 0;
  // Gorivo, ure in dodatne storitve so na računalniku skriti iz osnovnega
  // pogleda (pod "Podrobnosti").
  const hasExtra = fuel > 0 || totalHours > 0 || extras > 0;
  const extrasLabel = extras > 0 ? `Dodatno: ${formatEUR(extras)}` : null;
  const hoursLabel =
    totalHours > 0
      ? `Ure: ${formatHours(totalHours)}${
          project.hourly_rate != null ? ` × ${formatEUR(project.hourly_rate)}/h` : ""
        }`
      : null;
  const fuelLabel =
    fuel > 0 ? `Gorivo: ${formatEUR(fuel)} (${formatKm(totalKm)})` : null;

  const clientColor = project.clients?.color ?? "#9CA3AF";

  return (
    <div
      className="rounded-md border bg-white px-4 py-3 dark:bg-gray-900 md:px-4 md:py-3"
      style={{ borderColor: clientColor }}
    >
      {/* Na računalniku (md+) vse v eni vrstici: podatki | zneski | gumbi. */}
      <div className="md:flex md:items-center md:gap-4">
        <div className="min-w-0 md:flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100 md:text-base">
            {project.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="flex min-w-0 items-center gap-2">
              <ColorDot color={clientColor} className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate text-xs text-gray-600 dark:text-gray-400">
                {project.clients?.company_name ?? "Neznan partner"}
              </span>
            </span>
            <span className="basis-full text-xs text-gray-500 dark:text-gray-400 md:basis-auto">
              <span className="hidden md:inline">· </span>
              {formatDaysLabel(project)}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 md:mt-0 md:flex-shrink-0 md:grid-cols-[repeat(3,auto)] md:gap-x-5 md:border-t-0 md:pt-0 md:text-right">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Priliv</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatEUR(project.revenue)}
            </p>
            {extrasLabel && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 md:hidden">
                {extrasLabel}
              </p>
            )}
          </div>
          {/* Pokončna črta loči stroške od dobička. */}
          <div className="border-r border-gray-200 pr-2 dark:border-gray-700 md:pr-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Stroški</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatEUR(costs)}
            </p>
            {fuelLabel && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 md:hidden">
                {fuelLabel}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dobiček</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatEUR(profit)}
            </p>
            {hoursLabel && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 md:hidden">
                {hoursLabel}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 md:ml-auto md:mt-0 md:w-32 md:flex-shrink-0 md:flex-col md:gap-1">
          <Link href={`/projekti/${project.id}/uredi`} className="md:block">
            <Button type="button" variant="secondary" className={CARD_BUTTON_CLASS}>
              Uredi
            </Button>
          </Link>
          <DeleteProjectButton projectId={project.id} className={CARD_BUTTON_CLASS} />
          {(hasNotes || hasExtra) && (
            // Brez opomb je gumb viden samo na računalniku (za gorivo/ure).
            <span className={hasNotes ? "contents" : "hidden md:contents"}>
              <Button
                type="button"
                variant="ghost"
                className={CARD_BUTTON_CLASS}
                onClick={() => setShowNotes((v) => !v)}
              >
                <span className="md:hidden">{showNotes ? "Skrij opombe" : "Opombe"}</span>
                <span className="hidden md:inline">
                  {showNotes ? "Skrij podrobnosti" : "Podrobnosti"}
                </span>
              </Button>
            </span>
          )}
        </div>
      </div>

      {showNotes && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800 md:mt-2 md:pt-2">
          {hasExtra && (
            <p className="hidden text-xs text-gray-500 dark:text-gray-400 md:block">
              {[extrasLabel, fuelLabel, hoursLabel].filter(Boolean).join(" · ")}
            </p>
          )}
          {extraNotes.length > 0 && (
            <ul className="space-y-0.5">
              {extraNotes.map((item, i) => (
                <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                  Dodatno – {item.note}: {formatEUR(item.amount)}
                </li>
              ))}
            </ul>
          )}
          {costNotes.length > 0 && (
            <ul className="space-y-0.5">
              {costNotes.map((item, i) => (
                <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                  {item.note}: {formatEUR(item.amount)}
                </li>
              ))}
            </ul>
          )}
          {project.note && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{project.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
