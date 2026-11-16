"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field } from "@/components/ui/Input";
import MonthYearPicker from "@/components/calendar/MonthYearPicker";
import { formatHours } from "@/lib/utils/projectCosts";
import { monthKeyOf } from "@/lib/utils/projectMonths";
import type { DayHours } from "@/lib/types/database.types";

const SELECT_CLASS =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]";

export type SumHoursProject = {
  id: string;
  name: string;
  client_id: string;
  work_dates: string[];
  day_hours: DayHours;
};

type SumHoursButtonProps = {
  clients: { id: string; company_name: string }[];
  projects: SumHoursProject[];
};

function ClockIcon() {
  return (
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
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function SumHoursButton({ clients, projects }: SumHoursButtonProps) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Ure stranke po dnevih dela v izbranem mesecu (ne glede na mesec obračuna).
  const result = useMemo(() => {
    const rows = projects
      .filter((p) => p.client_id === clientId)
      .map((p) => {
        const dates = p.work_dates.filter((d) => monthKeyOf(d) === monthKey);
        const hours = dates.reduce((sum, d) => sum + (p.day_hours?.[d] ?? 0), 0);
        return { id: p.id, name: p.name, days: dates.length, hours };
      })
      .filter((r) => r.days > 0);
    return {
      rows,
      hours: rows.reduce((sum, r) => sum + r.hours, 0),
      days: rows.reduce((sum, r) => sum + r.days, 0),
    };
  }, [projects, clientId, monthKey]);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="h-8"
        onClick={() => setOpen(true)}
        aria-label="Seštej ure"
        title="Seštej ure"
      >
        <ClockIcon />
        <span className="hidden sm:inline">Seštej ure</span>
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Seštej ure">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mesec
            </label>
            <MonthYearPicker
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          </div>

          <Field label="Partner" htmlFor="sum-hours-client">
            <select
              id="sum-hours-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={SELECT_CLASS}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-md border border-gray-200 border-l-4 border-l-blue-500 bg-white p-3 dark:border-gray-800 dark:border-l-blue-500 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">Skupaj ur v mesecu</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatHours(result.hours)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {result.days} {result.days === 1 ? "dan" : result.days === 2 ? "dneva" : result.days <= 4 ? "dnevi" : "dni"} dela
            </p>

            {result.rows.length > 0 ? (
              <ul className="mt-2 space-y-0.5 border-t border-gray-100 pt-2 dark:border-gray-800">
                {result.rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex justify-between gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="min-w-0 truncate">{r.name || "Brez imena"}</span>
                    <span className="flex-shrink-0 font-medium">{formatHours(r.hours)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                Ta mesec ni dela za tega partnerja.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
