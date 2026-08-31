"use client";

import clsx from "@/lib/utils/clsx";
import type { CalendarDay } from "@/lib/utils/date";
import { ColorDot } from "@/components/ui/Badge";

export type DayClientSummary = {
  clientId: string;
  companyName: string;
  color: string;
};

const MAX_VISIBLE_DOTS = 3;

export default function CalendarDayCell({
  day,
  clientsForDay,
  onClick,
}: {
  day: CalendarDay;
  clientsForDay: DayClientSummary[];
  onClick: () => void;
}) {
  const visible = clientsForDay.slice(0, MAX_VISIBLE_DOTS);
  const extraCount = clientsForDay.length - visible.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-20 min-w-0 flex-col items-start gap-1 overflow-hidden rounded-md border p-1.5 text-left transition-colors sm:h-24 sm:p-2",
        day.isCurrentMonth
          ? "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/40"
          : "border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-800",
        day.isToday && "ring-2 ring-blue-500"
      )}
    >
      <span
        className={clsx(
          "text-xs font-medium",
          day.isCurrentMonth
            ? "text-gray-700 dark:text-gray-300"
            : "text-gray-400 dark:text-gray-600"
        )}
      >
        {day.date.getDate()}
      </span>
      <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden">
        {visible.map((c) => (
          <span
            key={c.clientId}
            className="flex w-full min-w-0 items-center gap-1 rounded bg-gray-50 px-1 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300 sm:text-xs"
            title={c.companyName}
          >
            <ColorDot color={c.color} />
            <span className="min-w-0 truncate">{c.companyName}</span>
          </span>
        ))}
        {extraCount > 0 && (
          <span className="text-[10px] text-gray-400 dark:text-gray-600">+{extraCount} več</span>
        )}
      </div>
    </button>
  );
}
