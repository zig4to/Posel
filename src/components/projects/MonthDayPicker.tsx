"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import {
  formatDateKey,
  getMonthGrid,
  SLOVENIAN_WEEKDAYS_SHORT,
} from "@/lib/utils/date";
import clsx from "@/lib/utils/clsx";

type MonthDayPickerProps = {
  year: number;
  month: number; // 0-11
  selected: Set<string>;
  onToggleDay: (dateKey: string) => void;
  onAddRange: (fromKey: string, toKey: string) => void;
  /** Barva trenutno izbrane stranke v obrazcu (rezerva, če dan še nima vnosov v koledarju). */
  color: string;
  /** dateKey -> barva stranke, ki ima ta dan že vnos v koledarju (isto kot na zavihku Koledar). */
  dayColors: Map<string, string>;
};

export default function MonthDayPicker({
  year,
  month,
  selected,
  onToggleDay,
  onAddRange,
  color,
  dayColors,
}: MonthDayPickerProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const grid = getMonthGrid(year, month);

  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(daysInMonth);

  function dateKeyForDay(day: number): string {
    return formatDateKey(new Date(year, month, day));
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400 dark:text-gray-500">
          {SLOVENIAN_WEEKDAYS_SHORT.map((wd) => (
            <div key={wd}>{wd}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            if (!day.isCurrentMonth) {
              return <div key={day.dateKey} aria-hidden="true" />;
            }

            const isSelected = selected.has(day.dateKey);
            // Barva iz koledarja (obstoječi vnos tega dne) ima prednost pred
            // barvo trenutno izbrane stranke v obrazcu - enako kot na Koledarju.
            const borderColor =
              dayColors.get(day.dateKey) ?? (isSelected ? color : undefined);

            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onToggleDay(day.dateKey)}
                style={
                  borderColor
                    ? { borderColor, backgroundColor: `${borderColor}26` }
                    : undefined
                }
                className={clsx(
                  "relative flex h-8 w-full items-center justify-center rounded-md text-sm font-medium transition-[filter,background-color,border-color]",
                  borderColor
                    ? "border-2 font-semibold text-gray-900 hover:brightness-95 dark:text-gray-100 dark:hover:brightness-110"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {day.date.getDate()}
                {isSelected && (
                  <span
                    className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Od dneva
          </label>
          <select
            value={rangeFrom}
            onChange={(e) => setRangeFrom(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Do dneva
          </label>
          <select
            value={rangeTo}
            onChange={(e) => setRangeTo(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const from = Math.min(rangeFrom, rangeTo);
            const to = Math.max(rangeFrom, rangeTo);
            onAddRange(dateKeyForDay(from), dateKeyForDay(to));
          }}
        >
          Dodaj razpon
        </Button>
      </div>
    </div>
  );
}
