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
const MAX_VISIBLE_DOTS_LARGE = 5;

export default function CalendarDayCell({
  day,
  clientsForDay,
  onClick,
  large = false,
}: {
  day: CalendarDay;
  clientsForDay: DayClientSummary[];
  onClick: () => void;
  /** Večje kartice, ko so vikend stolpci skriti in dnevi zapolnijo cel zaslon. */
  large?: boolean;
}) {
  const visible = clientsForDay.slice(
    0,
    large ? MAX_VISIBLE_DOTS_LARGE : MAX_VISIBLE_DOTS
  );
  const extraCount = clientsForDay.length - visible.length;

  // Obroba in rahel preliv notranjosti celice v barvi (prve) stranke tega dne.
  const clientColor = day.isCurrentMonth ? clientsForDay[0]?.color : undefined;
  // Vikend dnevi (sobota/nedelja) dobijo rahlo sivo ozadje za lažje ločevanje.
  const isWeekendShade = day.isCurrentMonth && day.isWeekend && !clientColor;

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
        "flex min-w-0 flex-col items-start gap-1 overflow-hidden rounded-md p-1.5 text-left transition-[filter,background-color,border-color] sm:p-2",
        large ? "h-28 sm:h-36" : "h-20 sm:h-24",
        day.isCurrentMonth
          ? clientColor
            ? "border-2 bg-white hover:brightness-95 dark:bg-gray-900 dark:hover:brightness-110"
            : isWeekendShade
              ? "border border-gray-200 bg-gray-100 hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/40"
              : "border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/40"
          : "border border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-800"
      )}
    >
      <span
        className={clsx(
          "inline-flex items-center justify-center rounded-full px-1",
          // Na mobilnem je krogec za današnji dan malenkost manjši kot ostale
          // oznake dni; na desktopu (sm+) ostane enak kot prej.
          day.isToday
            ? large
              ? "h-5 min-w-[1.25rem] text-xs sm:h-6 sm:min-w-[1.5rem] sm:text-sm"
              : "h-4 min-w-[1rem] text-[11px] sm:h-5 sm:min-w-[1.25rem] sm:text-xs"
            : large
              ? "h-6 min-w-[1.5rem] text-sm"
              : "h-5 min-w-[1.25rem] text-xs",
          day.isToday
            ? // oznaka današnjega dne: poln kroglič v oranžni #F28C28
              "bg-[#F28C28] font-bold text-white dark:bg-[#F28C28] dark:text-white"
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
            className={clsx(
              // Na mobilnem je krogec nad imenom stranke (ne poleg), da ima
              // ime na voljo celo širino kartice; na desktopu (sm+) ostaneta
              // krogec in ime v eni vrstici kot prej.
              "flex w-full min-w-0 flex-col items-start gap-0.5 rounded bg-gray-50 px-1 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300 sm:flex-row sm:items-center sm:gap-1 sm:py-0",
              large ? "text-[10px] sm:text-sm" : "text-[9px] sm:text-xs"
            )}
            title={c.companyName}
          >
            <ColorDot color={c.color} />
            {/* Brez elipse (...) - besedilo naj se ob robu preprosto odreže. */}
            <span className="w-full min-w-0 overflow-hidden text-clip whitespace-nowrap">
              {c.companyName}
            </span>
          </span>
        ))}
        {extraCount > 0 && (
          <span
            className={clsx(
              "text-gray-400 dark:text-gray-600",
              large ? "text-[10px] sm:text-xs" : "text-[8px] sm:text-[10px]"
            )}
          >
            +{extraCount} več
          </span>
        )}
      </div>
    </button>
  );
}
