"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Client, WorkEntryWithClient } from "@/lib/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { getWorkEntriesInRange } from "@/lib/data/workEntries";
import {
  getMonthGrid,
  getMonthRange,
  SLOVENIAN_WEEKDAYS_SHORT,
} from "@/lib/utils/date";
import Button from "@/components/ui/Button";
import MonthYearPicker from "./MonthYearPicker";
import FilterMenu from "./FilterMenu";
import CalendarDayCell, { type DayClientSummary } from "./CalendarDayCell";
import DayDetailPanel from "./DayDetailPanel";

// Panel z eno "zaprto" stranico - metafora za skrivanje vikend stolpcev na
// desni strani koledarja (podobno preklopu stranske vrstice).
function PanelRightCloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 flex-shrink-0"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M15 3v18" />
      <path d="m8 9 3 3-3 3" />
    </svg>
  );
}

function PanelRightOpenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 flex-shrink-0"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M15 3v18" />
      <path d="m10 15-3-3 3-3" />
    </svg>
  );
}

export default function MonthCalendar({ clients }: { clients: Client[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<WorkEntryWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClientId, setFilterClientId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showWeekends, setShowWeekends] = useState(true);

  useEffect(() => {
    // Privzeto na telefonu (ozek zaslon) vikende ob nalaganju skrijemo, da
    // koledar takoj zapolni zaslon; na desktopu ostanejo privzeto prikazani.
    // Samo enkraten preklop ob prvem nalaganju - kasnejši ročni izbor uporabnika
    // se ne prepiše ob spremembi velikosti okna.
    if (window.matchMedia("(max-width: 639px)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWeekends(false);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { from, to } = getMonthRange(year, month);
    try {
      const data = await getWorkEntriesInRange(supabase, from, to);
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    // Standarden podatkovni-fetch-ob-spremembi-odvisnosti vzorec (mesec/leto) -
    // setState znotraj loadEntries je namerno, gre za sinhronizacijo s Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries();
  }, [loadEntries]);

  // Vsi vnosi po dnevu (neodvisno od filtra) - uporablja se za DayDetailPanel,
  // ki naj vedno prikaže celoten urnik dneva.
  const entriesByDayAll = useMemo(() => {
    const map = new Map<string, WorkEntryWithClient[]>();
    for (const entry of entries) {
      const list = map.get(entry.work_date) ?? [];
      list.push(entry);
      map.set(entry.work_date, list);
    }
    return map;
  }, [entries]);

  // Vnosi po dnevu, upoštevajoč aktiven filter - uporablja se za prikaz
  // barvnih oznak na celicah koledarja.
  const entriesByDay = useMemo(() => {
    if (!filterClientId) return entriesByDayAll;
    const map = new Map<string, WorkEntryWithClient[]>();
    for (const [dateKey, dayEntries] of entriesByDayAll) {
      const filtered = dayEntries.filter(
        (e) => e.client_id === filterClientId
      );
      if (filtered.length > 0) map.set(dateKey, filtered);
    }
    return map;
  }, [entriesByDayAll, filterClientId]);

  const days = useMemo(() => getMonthGrid(year, month), [year, month]);
  // Ko so vikendi skriti, jih izločimo iz mreže, tedni pa ostanejo 5-dnevni.
  const visibleDays = useMemo(
    () => (showWeekends ? days : days.filter((d) => !d.isWeekend)),
    [days, showWeekends]
  );
  const weekdayLabels = showWeekends
    ? SLOVENIAN_WEEKDAYS_SHORT
    : SLOVENIAN_WEEKDAYS_SHORT.slice(0, 5);

  function clientSummaryForDay(dateKey: string): DayClientSummary[] {
    const dayEntries = entriesByDay.get(dateKey) ?? [];
    const seen = new Map<string, DayClientSummary>();
    for (const entry of dayEntries) {
      if (!entry.clients || seen.has(entry.client_id)) continue;
      seen.set(entry.client_id, {
        clientId: entry.client_id,
        companyName: entry.clients.company_name,
        color: entry.clients.color,
      });
    }
    return Array.from(seen.values());
  }

  const selectedDay = days.find((d) => d.dateKey === selectedDateKey);

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto sm:flex-wrap sm:gap-3 sm:overflow-visible">
        <MonthYearPicker
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        <FilterMenu
          clients={clients}
          selectedClientId={filterClientId}
          onClientChange={setFilterClientId}
          year={year}
          month={month}
          onDateChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowWeekends((v) => !v)}
          aria-label={showWeekends ? "Skrij vikende" : "Pokaži vikende"}
          title={showWeekends ? "Skrij vikende" : "Pokaži vikende"}
          className="h-10 flex-shrink-0"
        >
          {showWeekends ? <PanelRightOpenIcon /> : <PanelRightCloseIcon />}
          <span className="hidden sm:inline">
            {showWeekends ? "Skrij vikende" : "Pokaži vikende"}
          </span>
        </Button>
      </div>

      <div
        className={
          "mb-1 grid gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500 sm:gap-1.5" +
          (showWeekends ? " grid-cols-7" : " grid-cols-5")
        }
      >
        {weekdayLabels.map((wd) => (
          <div key={wd} className="truncate">{wd}</div>
        ))}
      </div>

      <div
        className={
          "grid gap-1 sm:gap-1.5" +
          (showWeekends ? " grid-cols-7" : " grid-cols-5") +
          (loading ? " opacity-50" : "")
        }
      >
        {visibleDays.map((day) => (
          <CalendarDayCell
            key={day.dateKey}
            day={day}
            clientsForDay={clientSummaryForDay(day.dateKey)}
            onClick={() => setSelectedDateKey(day.dateKey)}
            large={!showWeekends}
          />
        ))}
      </div>

      {selectedDay && (
        <DayDetailPanel
          date={selectedDay.date}
          dateKey={selectedDay.dateKey}
          entries={entriesByDayAll.get(selectedDay.dateKey) ?? []}
          clients={clients}
          onClose={() => setSelectedDateKey(null)}
          onChanged={loadEntries}
        />
      )}
    </div>
  );
}
