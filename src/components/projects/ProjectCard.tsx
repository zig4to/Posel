"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectWithClient } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";
import DeleteProjectButton from "@/components/projects/DeleteProjectButton";
import InvoiceButton from "@/components/projects/InvoiceButton";
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
import {
  formatMonthKey,
  monthKeyOf,
  projectBillingMonth,
  workMonths,
} from "@/lib/utils/projectMonths";

// Na računalniku (md+) manjši gumbi.
const CARD_BUTTON_CLASS = "md:px-2.5 md:py-1 md:text-xs";

// "22, 23. Oktober · 2, 3, 4. November 2026" - dnevi po mesecih; leto se
// izpiše ob vsakem mesecu le, če projekt sega čez novo leto.
function formatDaysLabel(project: ProjectWithClient): string {
  const dates = [...project.work_dates].sort();
  const months = workMonths(dates);
  const multiYear = new Set(months.map((key) => key.slice(0, 4))).size > 1;
  return months
    .map((key, i) => {
      const [year, month] = key.split("-").map(Number);
      const days = dates
        .filter((d) => monthKeyOf(d) === key)
        .map((d) => Number(d.slice(8, 10)));
      const withYear = multiYear || i === months.length - 1;
      return `${days.join(", ")}. ${SLOVENIAN_MONTHS[month - 1]}${withYear ? ` ${year}` : ""}`;
    })
    .join(" · ");
}

export default function ProjectCard({
  project,
  readOnly = false,
}: {
  project: ProjectWithClient;
  /** Samo ogled (deljen projekt) - brez gumbov Uredi/Izbriši. */
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
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
  // Gorivo, ure in dodatne storitve se pokažejo v razširjenem pogledu.
  const hasExtra = fuel > 0 || totalHours > 0 || extras > 0;
  const extrasLabel = extras > 0 ? `Dodatno: ${formatEUR(extras)}` : null;
  const hoursLabel =
    totalHours > 0
      ? `Ure: ${formatHours(totalHours)}${
          project.hourly_rate != null ? ` × ${formatEUR(project.hourly_rate)}/h` : ""
        }`
      : null;
  const fuelLabel =
    fuel > 0
      ? `Gorivo: ${formatEUR(fuel)} (${formatKm(totalKm)}${
          (project.fuel_shared_dates ?? []).length > 0 ? ", ½ deljeno" : ""
        })`
      : null;

  const clientColor = project.clients?.color ?? "#9CA3AF";

  // Pri projektu čez več mesecev (ali z ročno izbranim mesecem) pokažemo,
  // v kateri mesec se šteje.
  const billingMonth = projectBillingMonth(project);
  const showBillingMonth =
    workMonths(project.work_dates).length > 1 || project.billing_month != null;

  return (
    <div
      className="rounded-md border bg-white px-4 py-3 dark:bg-gray-900"
      style={{ borderColor: clientColor }}
    >
      {/* Zaprta kartica: ime projekta, partner in datum; klik odpre urejanje, puščica desno. */}
      <div className="relative flex items-center gap-3">
        {/* Klik kamorkoli na vrstici odpre urejanje (puščica ima prednost). */}
        {!readOnly && (
          <Link
            href={`/projekti/${project.id}/uredi`}
            aria-label={`Uredi projekt ${project.name}`}
            className="absolute -inset-x-4 -inset-y-3 rounded-md"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-gray-900 dark:text-gray-100 md:text-base">
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
            {showBillingMonth && (
              <span className="basis-full text-xs text-blue-600 dark:text-blue-400 md:basis-auto">
                <span className="hidden md:inline">· </span>
                Obračun: {formatMonthKey(billingMonth)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Skrij podrobnosti" : "Pokaži podrobnosti"}
          title={expanded ? "Skrij podrobnosti" : "Pokaži podrobnosti"}
          className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="md:flex md:items-center md:gap-4">
            <div className="grid grid-cols-3 gap-2 md:flex-1 md:grid-cols-[repeat(3,auto)] md:justify-start md:gap-x-8">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Priliv</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatEUR(project.revenue)}
                </p>
              </div>
              {/* Pokončna črta loči stroške od dobička. */}
              <div className="border-r border-gray-200 pr-2 dark:border-gray-700 md:pr-8">
                <p className="text-xs text-gray-500 dark:text-gray-400">Stroški</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatEUR(costs)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dobiček</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatEUR(profit)}
                </p>
              </div>
            </div>

            {!readOnly && (
              <div className="mt-3 flex flex-wrap gap-2 md:mt-0 md:flex-shrink-0">
                <DeleteProjectButton projectId={project.id} className={CARD_BUTTON_CLASS} />
                <InvoiceButton project={project} className={CARD_BUTTON_CLASS} />
              </div>
            )}
          </div>

          {hasExtra && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
