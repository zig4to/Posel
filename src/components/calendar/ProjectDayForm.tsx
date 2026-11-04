"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Client } from "@/lib/types/database.types";
import { addProjectDaysAction } from "@/actions/projects";
import { createClient } from "@/lib/supabase/client";
import { getProjectSummaries, type ProjectSummary } from "@/lib/data/projects";
import { eachDateInRange } from "@/lib/utils/date";
import { formatMonthKey, monthKeyOf, workMonths } from "@/lib/utils/projectMonths";
import { hoursBetween } from "@/lib/utils/projectDays";
import { formatHours } from "@/lib/utils/projectCosts";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const NEW_PROJECT = "__new__";

const SELECT_CLASS =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]";

type ProjectDayFormProps = {
  dateKey: string;
  clients: Client[];
  onSaved: () => void;
  onCancel: () => void;
};

/** "Oktober 2026" ali "Oktober – November 2026" za prikaz v izbiri projekta. */
function monthsLabel(workDates: string[]): string {
  const months = workMonths(workDates);
  if (months.length === 1) return formatMonthKey(months[0]);
  return `${formatMonthKey(months[0])} – ${formatMonthKey(months[months.length - 1])}`;
}

/**
 * Dodajanje dneva (ali razpona dni) v projekt iz koledarja: v obstoječ
 * projekt partnerja ali v nov projekt.
 */
export default function ProjectDayForm({
  dateKey,
  clients,
  onSaved,
  onCancel,
}: ProjectDayFormProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [projectId, setProjectId] = useState<string>(NEW_PROJECT);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [startDate, setStartDate] = useState(dateKey);
  const [endDate, setEndDate] = useState(dateKey);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getProjectSummaries(createClient()).then(setProjects, () => setProjects([]));
  }, []);

  const clientProjects = useMemo(
    () => projects.filter((p) => p.client_id === clientId),
    [projects, clientId]
  );

  // Privzeto: projekt partnerja, ki že ima dan v istem mesecu, sicer nov.
  useEffect(() => {
    const month = monthKeyOf(dateKey);
    const sameMonth = clientProjects.find((p) =>
      p.work_dates.some((d) => monthKeyOf(d) === month)
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectId(sameMonth?.id ?? NEW_PROJECT);
  }, [clientProjects, dateKey]);

  // Privzeto ime novega projekta: "<Partner> – <Mesec Leto>".
  const clientName = clients.find((c) => c.id === clientId)?.company_name ?? "";
  const defaultName = clientName
    ? `${clientName} – ${formatMonthKey(monthKeyOf(startDate || dateKey))}`
    : "";
  const effectiveName = nameTouched ? name : defaultName;

  const hours = hoursBetween(startTime || null, endTime || null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (endDate < startDate) {
      setError("Datum konca mora biti enak ali za datumom začetka.");
      return;
    }

    startTransition(async () => {
      const result = await addProjectDaysAction({
        project_id: projectId === NEW_PROJECT ? null : projectId,
        client_id: clientId,
        name: effectiveName,
        dates: eachDateInRange(startDate, endDate),
        start_time: startTime || null,
        end_time: endTime || null,
        note: note.trim() || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  if (clients.length === 0) {
    return (
      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Najprej dodaj vsaj enega partnerja v zavihku &quot;Partnerji&quot;.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800"
    >
      <Field label="Partner" htmlFor="day_client_id">
        <select
          id="day_client_id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={SELECT_CLASS}
          required
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Projekt" htmlFor="day_project_id">
        <select
          id="day_project_id"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value={NEW_PROJECT}>+ Nov projekt</option>
          {clientProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || "Brez imena"} ({monthsLabel(p.work_dates)})
            </option>
          ))}
        </select>
      </Field>

      {projectId === NEW_PROJECT && (
        <Field label="Ime novega projekta" htmlFor="day_project_name">
          <Input
            id="day_project_name"
            value={effectiveName}
            onChange={(e) => {
              setNameTouched(true);
              setName(e.target.value);
            }}
            required
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Od (datum)" htmlFor="day_start_date">
          <Input
            id="day_start_date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value > endDate) setEndDate(e.target.value);
            }}
            required
          />
        </Field>
        <Field label="Do (datum)" htmlFor="day_end_date">
          <Input
            id="day_end_date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Od (ura)" htmlFor="day_start_time">
          <Input
            id="day_start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </Field>
        <Field label="Do (ura)" htmlFor="day_end_time">
          <Input
            id="day_end_time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </Field>
      </div>
      {hours !== null && (
        <p className="-mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatHours(hours)} na dan
        </p>
      )}

      <Field label="Opomba" htmlFor="day_note">
        <Textarea
          id="day_note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Shranjujem …"
            : projectId === NEW_PROJECT
              ? "Ustvari projekt"
              : "Dodaj v projekt"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Prekliči
        </Button>
      </div>
    </form>
  );
}
