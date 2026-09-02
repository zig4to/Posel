"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type {
  Client,
  ProjectWithClient,
  WorkEntryWithClient,
} from "@/lib/types/database.types";
import {
  createProjectAction,
  updateProjectAction,
  type ProjectInput,
} from "@/actions/projects";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MonthYearPicker from "@/components/calendar/MonthYearPicker";
import MonthDayPicker from "@/components/projects/MonthDayPicker";
import { formatEUR } from "@/lib/utils/currency";
import { createClient } from "@/lib/supabase/client";
import { getWorkEntriesInRange } from "@/lib/data/workEntries";
import { getMonthRange } from "@/lib/utils/date";

type ProjectFormProps = {
  clients: Client[];
  project?: ProjectWithClient; // če je podan, gre za urejanje
};

function initialMonth(project?: ProjectWithClient): { year: number; month: number } {
  if (project && project.work_dates.length > 0) {
    const [year, month] = project.work_dates[0].split("-").map(Number);
    return { year, month: month - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function ProjectForm({ clients, project }: ProjectFormProps) {
  const [clientId, setClientId] = useState(
    project?.client_id ?? clients[0]?.id ?? ""
  );
  const [{ year, month }, setYearMonth] = useState(initialMonth(project));
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(project?.work_dates ?? [])
  );
  const [costItems, setCostItems] = useState<string[]>(
    project ? [String(project.costs)] : [""]
  );
  const [revenue, setRevenue] = useState(project ? String(project.revenue) : "");
  const [note, setNote] = useState(project?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedClientColor =
    clients.find((c) => c.id === clientId)?.color ?? "#3B82F6";

  // Barve dni iz koledarja (obstoječi delovni vnosi za trenutno izbrani mesec),
  // da je izbira dni projekta vizualno usklajena z zavihkom Koledar.
  const [monthEntries, setMonthEntries] = useState<WorkEntryWithClient[]>([]);

  const loadMonthEntries = useCallback(async () => {
    const supabase = createClient();
    const { from, to } = getMonthRange(year, month);
    const data = await getWorkEntriesInRange(supabase, from, to);
    setMonthEntries(data);
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMonthEntries();
  }, [loadMonthEntries]);

  const dayColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of monthEntries) {
      if (!entry.clients || map.has(entry.work_date)) continue;
      map.set(entry.work_date, entry.clients.color);
    }
    return map;
  }, [monthEntries]);

  const totalCosts = useMemo(
    () => costItems.reduce((sum, v) => sum + (Number(v) || 0), 0),
    [costItems]
  );

  const profit = useMemo(() => {
    const revenueNum = Number(revenue) || 0;
    return revenueNum - totalCosts;
  }, [revenue, totalCosts]);

  function updateCostItem(index: number, value: string) {
    setCostItems((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addCostItem() {
    setCostItems((prev) => [...prev, ""]);
  }

  function removeCostItem(index: number) {
    setCostItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleYearMonthChange(nextYear: number, nextMonth: number) {
    setYearMonth({ year: nextYear, month: nextMonth });
    // Ob spremembi meseca odstranimo dneve, ki ne spadajo več v izbrani mesec.
    setSelectedDates((prev) => {
      const prefix = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}`;
      const filtered = [...prev].filter((key) => key.startsWith(prefix));
      return new Set(filtered);
    });
  }

  function toggleDay(dateKey: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  function addRange(fromKey: string, toKey: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      let cursor = new Date(fromKey);
      const end = new Date(toKey);
      while (cursor <= end) {
        next.add(
          `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
            cursor.getDate()
          ).padStart(2, "0")}`
        );
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: ProjectInput = {
      client_id: clientId,
      work_dates: [...selectedDates],
      costs: totalCosts,
      revenue: Number(revenue) || 0,
      note: note.trim() || null,
    };

    startTransition(async () => {
      const result = project
        ? await updateProjectAction(project.id, input)
        : await createProjectAction(input);

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (clients.length === 0) {
    return (
      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Najprej dodaj vsaj eno stranko v zavihku &quot;Stranke&quot;.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Stranka" htmlFor="client_id">
        <select
          id="client_id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"
          required
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Dnevi projekta
        </label>
        <div className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800">
          <MonthYearPicker year={year} month={month} onChange={handleYearMonthChange} />
          <MonthDayPicker
            year={year}
            month={month}
            selected={selectedDates}
            onToggleDay={toggleDay}
            onAddRange={addRange}
            color={selectedClientColor}
            dayColors={dayColors}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Stroški (EUR)" htmlFor="costs-0">
          <div className="space-y-2">
            {costItems.map((value, index) => {
              const isLast = index === costItems.length - 1;
              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-24">
                    <Input
                      id={`costs-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={value}
                      onChange={(e) => updateCostItem(index, e.target.value)}
                    />
                  </div>
                  {isLast ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 w-9 flex-shrink-0 px-0"
                      onClick={addCostItem}
                      aria-label="Dodaj strošek"
                    >
                      +
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-9 flex-shrink-0 px-0"
                      onClick={() => removeCostItem(index)}
                      aria-label="Odstrani strošek"
                    >
                      ×
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Field>
        <Field label="Priliv (EUR)" htmlFor="revenue">
          <Input
            id="revenue"
            type="number"
            step="0.01"
            min="0"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
          />
        </Field>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Dobiček:{" "}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatEUR(profit)}
        </span>
      </p>

      <Field label="Opomba" htmlFor="note">
        <Textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Shranjujem …" : project ? "Shrani spremembe" : "Dodaj projekt"}
      </Button>
    </form>
  );
}
