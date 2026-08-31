"use client";

import Button from "@/components/ui/Button";
import { SLOVENIAN_MONTHS } from "@/lib/utils/date";

type MonthYearPickerProps = {
  year: number;
  month: number; // 0-11
  onChange: (year: number, month: number) => void;
};

export default function MonthYearPicker({
  year,
  month,
  onChange,
}: MonthYearPickerProps) {
  function shiftMonth(delta: number) {
    const date = new Date(year, month + delta, 1);
    onChange(date.getFullYear(), date.getMonth());
  }

  function goToToday() {
    const today = new Date();
    onChange(today.getFullYear(), today.getMonth());
  }

  function onMonthInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value; // "YYYY-MM"
    if (!value) return;
    const [y, m] = value.split("-").map(Number);
    onChange(y, m - 1);
  }

  const monthInputValue = `${year}-${String(month + 1).padStart(2, "0")}`;

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          onClick={() => shiftMonth(-1)}
          aria-label="Prejšnji mesec"
        >
          ‹
        </Button>
        <span className="min-w-[7.5rem] text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
          {SLOVENIAN_MONTHS[month]} {year}
        </span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => shiftMonth(1)}
          aria-label="Naslednji mesec"
        >
          ›
        </Button>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="month"
          value={monthInputValue}
          onChange={onMonthInputChange}
          aria-label="Skoči na mesec"
          className="w-[8.5rem] min-w-0 max-w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:[color-scheme:dark]"
        />
        <Button type="button" variant="ghost" onClick={goToToday}>
          Danes
        </Button>
      </div>
    </div>
  );
}
