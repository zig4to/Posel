"use client";

import { useState, useTransition } from "react";
import type { Leave } from "@/lib/types/database.types";
import {
  createLeaveAction,
  updateLeaveAction,
  type LeaveInput,
} from "@/actions/leaves";
import { LEAVE_COLOR_PALETTE } from "@/lib/utils/color";
import clsx from "@/lib/utils/clsx";
import { Field, Input, Label } from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type LeaveFormProps = {
  /** Privzeti začetni datum (dan, na katerem je bilo okno odprto). */
  dateKey: string;
  leave?: Leave; // če je podan, gre za urejanje
  onSaved: () => void;
  onCancel: () => void;
};

export default function LeaveForm({
  dateKey,
  leave,
  onSaved,
  onCancel,
}: LeaveFormProps) {
  const [title, setTitle] = useState(leave?.title ?? "");
  const [startDate, setStartDate] = useState(leave?.start_date ?? dateKey);
  const [endDate, setEndDate] = useState(leave?.end_date ?? dateKey);
  const [color, setColor] = useState(leave?.color ?? LEAVE_COLOR_PALETTE[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: LeaveInput = {
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      color,
    };

    startTransition(async () => {
      const result = leave
        ? await updateLeaveAction(leave.id, input)
        : await createLeaveAction(input);

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
      <Field label="Ime dopusta" htmlFor="leave_title">
        <Input
          id="leave_title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="npr. Letni dopust, Bolniška"
          required
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Od" htmlFor="leave_start_date">
          <Input
            id="leave_start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Do" htmlFor="leave_end_date">
          <Input
            id="leave_end_date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </Field>
      </div>

      <div>
        <Label>Barva</Label>
        <div className="flex flex-wrap gap-2">
          {LEAVE_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Barva ${c}`}
              aria-pressed={color === c}
              className={clsx(
                "h-7 w-7 rounded-full border transition-transform",
                color === c
                  ? "scale-110 border-gray-900 dark:border-gray-100"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem …" : leave ? "Shrani spremembe" : "Dodaj dopust"}
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
