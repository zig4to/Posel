"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectWithClient } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DeleteProjectButton from "@/components/projects/DeleteProjectButton";
import { formatEUR } from "@/lib/utils/currency";
import { sumCostItems } from "@/lib/utils/projectCosts";
import { SLOVENIAN_MONTHS } from "@/lib/utils/date";

function formatDaysLabel(project: ProjectWithClient): string {
  const [year, month] = project.work_dates[0].split("-").map(Number);
  const days = project.work_dates.map((d) => Number(d.slice(8, 10)));
  return `${days.join(", ")}. ${SLOVENIAN_MONTHS[month - 1]} ${year}`;
}

export default function ProjectCard({ project }: { project: ProjectWithClient }) {
  const [showNotes, setShowNotes] = useState(false);
  const costItems = project.cost_items ?? [];
  const costs = sumCostItems(costItems);
  const profit = project.revenue - costs;
  const costNotes = costItems.filter((item) => item.note && item.note.trim());
  const hasNotes = Boolean(project.note) || costNotes.length > 0;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {project.name}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <ColorDot
            color={project.clients?.color ?? "#9CA3AF"}
            className="h-2.5 w-2.5 flex-shrink-0"
          />
          <p className="truncate text-xs text-gray-600 dark:text-gray-400">
            {project.clients?.company_name ?? "Neznan partner"}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {formatDaysLabel(project)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Stroški</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatEUR(costs)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Priliv</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatEUR(project.revenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Dobiček</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatEUR(profit)}
          </p>
        </div>
      </div>

      {showNotes && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
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

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/projekti/${project.id}/uredi`}>
          <Button type="button" variant="secondary">
            Uredi
          </Button>
        </Link>
        <DeleteProjectButton projectId={project.id} />
        {hasNotes && (
          <Button type="button" variant="ghost" onClick={() => setShowNotes((v) => !v)}>
            {showNotes ? "Skrij opombe" : "Opombe"}
          </Button>
        )}
      </div>
    </div>
  );
}
