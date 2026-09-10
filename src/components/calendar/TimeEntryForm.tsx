"use client";

import { useState, useTransition } from "react";
import type { Client, WorkEntryWithClient } from "@/lib/types/database.types";
import {
  createWorkEntriesAction,
  deleteWorkEntriesRangeAction,
  updateWorkEntryAction,
  type WorkEntryInput,
} from "@/actions/workEntries";
import { eachDateInRange, formatShortDate } from "@/lib/utils/date";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type TimeEntryFormProps = {
  dateKey: string;
  clients: Client[];
  entry?: WorkEntryWithClient; // če je podan, gre za urejanje
  onSaved: () => void;
  onCancel: () => void;
  onDelete?: () => void; // prikaže gumb "Izbriši" (samo pri urejanju)
};

export default function TimeEntryForm({
  dateKey,
  clients,
  entry,
  onSaved,
  onCancel,
  onDelete,
}: TimeEntryFormProps) {
  const [clientId, setClientId] = useState(entry?.client_id ?? clients[0]?.id ?? "");
  // Razpon datumov - samo pri dodajanju (uredimo lahko en sam dan).
  // Začetni dan je tisti, kjer smo kliknili "Dodaj"; konec nastavi uporabnik.
  const [startDate, setStartDate] = useState(dateKey);
  const [endDate, setEndDate] = useState(dateKey);
  const [startTime, setStartTime] = useState(entry?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(entry?.end_time?.slice(0, 5) ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Brisanje obsega dni za isto stranko (samo pri urejanju obstoječega vnosa).
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeEnd, setRangeEnd] = useState(entry?.work_date ?? dateKey);

  function handleRangeDelete() {
    if (!entry) return;
    setError(null);
    if (rangeEnd < entry.work_date) {
      setError("Datum konca mora biti enak ali za datumom začetka.");
      return;
    }
    const clientName = entry.clients?.company_name ?? "to stranko";
    const ok = confirm(
      `Izbrisati vse vnose za "${clientName}" od ${formatShortDate(
        entry.work_date
      )} do ${formatShortDate(rangeEnd)}?`
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteWorkEntriesRangeAction(
        entry.client_id,
        entry.work_date,
        rangeEnd
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: WorkEntryInput = {
      client_id: clientId,
      work_date: dateKey,
      start_time: startTime || null,
      end_time: endTime || null,
      note: note.trim() || null,
    };

    if (!entry && endDate < startDate) {
      setError("Datum konca mora biti enak ali za datumom začetka.");
      return;
    }

    startTransition(async () => {
      const result = entry
        ? await updateWorkEntryAction(entry.id, input)
        : await createWorkEntriesAction(
            input,
            eachDateInRange(startDate, endDate)
          );

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

  if (rangeMode && entry) {
    const clientName = entry.clients?.company_name ?? "to stranko";
    return (
      <div className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Izbriši vse vnose za{" "}
          <span className="font-medium">{clientName}</span> v obsegu:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Od (datum)" htmlFor="range_del_from">
            <Input
              id="range_del_from"
              type="date"
              value={entry.work_date}
              disabled
            />
          </Field>
          <Field label="Do (datum)" htmlFor="range_del_to">
            <Input
              id="range_del_to"
              type="date"
              value={rangeEnd}
              min={entry.work_date}
              onChange={(e) => setRangeEnd(e.target.value)}
              required
            />
          </Field>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="danger"
            onClick={handleRangeDelete}
            disabled={pending}
          >
            {pending ? "Brišem …" : "Izbriši obseg"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRangeMode(false);
              setError(null);
            }}
            disabled={pending}
          >
            Prekliči
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800">
      <Field label="Partner" htmlFor="client_id">
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

      {!entry && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Od (datum)" htmlFor="start_date">
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Do (datum)" htmlFor="end_date">
            <Input
              id="end_date"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Od (ura)" htmlFor="start_time">
          <Input
            id="start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </Field>
        <Field label="Do (ura)" htmlFor="end_time">
          <Input
            id="end_time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Opomba" htmlFor="note">
        <Textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {entry ? (
        <div className="grid grid-cols-2 gap-2">
          <Button type="submit" disabled={pending} className="w-full">
            <span className="text-xs leading-tight">
              {pending ? "Shranjujem …" : "Shrani spremembe"}
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
            className="w-full"
          >
            <span className="text-xs leading-tight">Prekliči</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRangeEnd(entry.work_date);
              setError(null);
              setRangeMode(true);
            }}
            disabled={pending}
            className="h-8 w-full"
          >
            <span className="text-xs leading-tight">Izbriši obseg dni</span>
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              disabled={pending}
              className="h-8 w-full"
            >
              <span className="text-xs leading-tight">Izbriši</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Shranjujem …" : "Dodaj vnos"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Prekliči
          </Button>
        </div>
      )}
    </form>
  );
}
