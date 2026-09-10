"use client";

import { useState, useTransition } from "react";
import type { CalendarEvent } from "@/lib/types/database.types";
import {
  createEventAction,
  updateEventAction,
  type EventInput,
} from "@/actions/events";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type EventFormProps = {
  dateKey: string;
  event?: CalendarEvent; // če je podan, gre za urejanje
  onSaved: () => void;
  onCancel: () => void;
};

export default function EventForm({
  dateKey,
  event,
  onSaved,
  onCancel,
}: EventFormProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [startTime, setStartTime] = useState(event?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(event?.end_time?.slice(0, 5) ?? "");
  const [note, setNote] = useState(event?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: EventInput = {
      event_date: dateKey,
      title: title.trim(),
      start_time: startTime || null,
      end_time: endTime || null,
      note: note.trim() || null,
    };

    startTransition(async () => {
      const result = event
        ? await updateEventAction(event.id, input)
        : await createEventAction(input);

      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800"
    >
      <Field label="Ime dogodka" htmlFor="event_title">
        <Input
          id="event_title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="npr. Sestanek, Dopust, Rok oddaje"
          required
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Od" htmlFor="event_start_time">
          <Input
            id="event_start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </Field>
        <Field label="Do" htmlFor="event_end_time">
          <Input
            id="event_end_time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Opomba" htmlFor="event_note">
        <Textarea
          id="event_note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem …" : event ? "Shrani spremembe" : "Dodaj dogodek"}
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
    </form>
  );
}
