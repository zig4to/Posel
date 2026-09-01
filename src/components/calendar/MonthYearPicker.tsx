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

  return (
    <div className="flex flex-shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={() => shiftMonth(-1)}
        aria-label="Prejšnji mesec"
      >
        ‹
      </Button>
      <span className="min-w-[5.5rem] px-1.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 sm:min-w-[7.5rem]">
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
  );
}
