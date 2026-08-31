"use client";

import { useState, useTransition } from "react";
import type { Client, WorkEntryWithClient } from "@/lib/types/database.types";
import {
  createWorkEntryAction,
  updateWorkEntryAction,
  type WorkEntryInput,
} from "@/actions/workEntries";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type TimeEntryFormProps = {
  dateKey: string;
  clients: Client[];
  entry?: WorkEntryWithClient; // če je podan, gre za urejanje
  onSaved: () => void;
  onCancel: () => void;
};

export default function TimeEntryForm({
  dateKey,
  clients,
  entry,
  onSaved,
  onCancel,
}: TimeEntryFormProps) {
  const [clientId, setClientId] = useState(entry?.client_id ?? clients[0]?.id ?? "");
  const [startTime, setStartTime] = useState(entry?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(entry?.end_time?.slice(0, 5) ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

    startTransition(async () => {
      const result = entry
        ? await updateWorkEntryAction(entry.id, input)
        : await createWorkEntryAction(input);

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
        Najprej dodaj vsaj eno stranko v zavihku &quot;Stranke&quot;.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800">
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Od" htmlFor="start_time">
          <Input
            id="start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </Field>
        <Field label="Do" htmlFor="end_time">
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

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem …" : entry ? "Shrani spremembe" : "Dodaj vnos"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Prekliči
        </Button>
      </div>
    </form>
  );
}
