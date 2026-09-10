"use client";

import type { CSSProperties } from "react";
import clsx from "@/lib/utils/clsx";
import type { CalendarDay } from "@/lib/utils/date";
import { ColorDot } from "@/components/ui/Badge";
import EventIcon from "./EventIcon";

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
  hasEvents = false,
  leaveColorsForDay = [],
  onClick,
  large = false,
}: {
  day: CalendarDay;
  clientsForDay: DayClientSummary[];
  /** Ali ima ta dan vsaj en dogodek (prikaže ikono dogodka). */
  hasEvents?: boolean;
  /** Barve dopustov, ki pokrivajo ta dan (diagonalno šrafiran vzorec). */
  leaveColorsForDay?: string[];
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

  // Diagonalno šrafiran vzorec (tanke črte z razmikom) za vsak dopust,
  // ki pokriva ta dan - prikaže se na vseh dnevih v obsegu dopusta.
  const leaveStripes =
    leaveColorsForDay.length > 0
      ? leaveColorsForDay
          .map((c, i) => {
            const angle = i % 2 === 0 ? 45 : 135;
            return `repeating-linear-gradient(${angle}deg, ${c} 0 2px, transparent 2px 9px)`;
          })
          .join(", ")
      : undefined;

  const style: CSSProperties = {};
  if (clientColor) {
    style.borderColor = clientColor;
    style.backgroundColor = `${clientColor}26`;
  }
  if (leaveStripes) {
    style.backgroundImage = leaveStripes;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={Object.keys(style).length > 0 ? style : undefined}
      className={clsx(
        "flex min-w-0 flex-col items-start gap-1 overflow-hidden rounded-md p-1.5 text-left transition-[filter,background-color,border-color] sm:p-2",
        // Na mobilnem naj bo kartica minimalne višine (prilagojena vsebini).
        // Dnevi trenutnega meseca imajo spodnjo mejo približno višine ene
        // vrstice vnosa (da prazni dnevi niso videti "stlačeni" glede na
        // sosednje dneve z enim vnosom); dnevi izven meseca ostanejo nižji.
        // Na desktopu (sm+) ostane fiksna višina kot prej.
        "h-auto sm:min-h-0",
        day.isCurrentMonth
          ? large
            ? "min-h-[4.5rem]"
            : "min-h-[4rem]"
          : "min-h-[3.25rem]",
        large ? "sm:h-36" : "sm:h-24",
        day.isCurrentMonth
          ? clientColor
            ? "border-2 bg-white hover:brightness-95 dark:bg-gray-900 dark:hover:brightness-110"
            : isWeekendShade
              ? "border border-gray-200 bg-gray-100 hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/40"
              : "border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/40"
          : "border border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-800"
      )}
    >
      <div className="flex w-full items-center justify-between gap-1">
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
        {hasEvents && (
          <EventIcon
            className={clsx(
              "flex-shrink-0 text-amber-500 dark:text-amber-400",
              large ? "h-4 w-4" : "h-3.5 w-3.5"
            )}
          />
        )}
      </div>
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
