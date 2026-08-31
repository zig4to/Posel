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
import MonthYearPicker from "./MonthYearPicker";
import ClientFilterDropdown from "./ClientFilterDropdown";
import CalendarDayCell, { type DayClientSummary } from "./CalendarDayCell";
import DayDetailPanel from "./DayDetailPanel";

export default function MonthCalendar({ clients }: { clients: Client[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<WorkEntryWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClientId, setFilterClientId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

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
      <div className="mb-4 flex flex-wrap items-center gap-3 sm:justify-between">
        <MonthYearPicker
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        <ClientFilterDropdown
          clients={clients}
          selectedClientId={filterClientId}
          onChange={setFilterClientId}
        />
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500 sm:gap-1.5">
        {SLOVENIAN_WEEKDAYS_SHORT.map((wd) => (
          <div key={wd} className="truncate">{wd}</div>
        ))}
      </div>

      <div
        className={
          "grid grid-cols-7 gap-1 sm:gap-1.5" + (loading ? " opacity-50" : "")
        }
      >
        {days.map((day) => (
          <CalendarDayCell
            key={day.dateKey}
            day={day}
            clientsForDay={clientSummaryForDay(day.dateKey)}
            onClick={() => setSelectedDateKey(day.dateKey)}
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
