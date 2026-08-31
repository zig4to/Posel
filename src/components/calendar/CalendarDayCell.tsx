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

  // Obroba in rahel preliv notranjosti celice v barvi (prve) stranke tega dne.
  const clientColor = day.isCurrentMonth ? clientsForDay[0]?.color : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      style={
        clientColor
          ? { borderColor: clientColor, backgroundColor: `${clientColor}26` }
          : undefined
      }
      className={clsx(
        "flex h-20 min-w-0 flex-col items-start gap-1 overflow-hidden rounded-md p-1.5 text-left transition-[filter,background-color,border-color] sm:h-24 sm:p-2",
        day.isCurrentMonth
          ? clientColor
            ? "border-2 bg-white hover:brightness-95 dark:bg-gray-900 dark:hover:brightness-110"
            : "border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/40"
          : "border border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-800",
        // Današnji dan: nevtralen obroč (ne v barvi stranke), drugačen od modrega.
        day.isToday && "ring-1 ring-gray-900 dark:ring-gray-100"
      )}
    >
      <span
        className={clsx(
          "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs",
          day.isToday
            ? // oznaka današnjega dne: poln nevtralen kroglič (kontrast na obeh temah)
              "bg-gray-900 font-bold text-white dark:bg-gray-100 dark:text-gray-900"
            : day.isCurrentMonth
              ? "font-medium text-gray-700 dark:text-gray-300"
              : "font-medium text-gray-400 dark:text-gray-600"
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
