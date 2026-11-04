"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  Client,
  CostItem,
  DayNotes,
  DayTimes,
  ProjectWithClient,
} from "@/lib/types/database.types";
import {
  createProjectAction,
  updateProjectAction,
  type ProjectInput,
} from "@/actions/projects";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Collapsible from "@/components/ui/Collapsible";
import MonthYearPicker from "@/components/calendar/MonthYearPicker";
import MonthDayPicker from "@/components/projects/MonthDayPicker";
import ItemRows, { EMPTY_ITEM, type ItemFields } from "@/components/projects/ItemRows";
import { formatEUR } from "@/lib/utils/currency";
import { createClient } from "@/lib/supabase/client";
import { getProjectsInRange } from "@/lib/data/projects";
import { hoursBetween } from "@/lib/utils/projectDays";
import { getMonthRange, SLOVENIAN_WEEKDAYS_SHORT } from "@/lib/utils/date";
import clsx from "@/lib/utils/clsx";
import {
  addMonths,
  autoBillingMonth,
  formatMonthKey,
  monthKeyOf,
  workMonths,
} from "@/lib/utils/projectMonths";
import {
  DEFAULT_FUEL_CONSUMPTION,
  FUEL_ROUTES,
  formatHours,
  formatKm,
  fuelCost,
  fuelLiters,
  SHARED_FUEL_FACTOR,
  sumCostItems,
  type FuelRoute,
} from "@/lib/utils/projectCosts";

const ROUTE_CHIP_CLASS =
  "rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40";

type ProjectFormProps = {
  clients: Client[];
  project?: ProjectWithClient; // če je podan, gre za urejanje
  /** Trenutna cena dizla (EUR/l) z goriva.si; null, če je ni bilo mogoče pridobiti. */
  dieselPrice: number | null;
};

type Billing = "hourly" | "fixed";

const BILLING_OPTIONS: { value: Billing; label: string }[] = [
  { value: "hourly", label: "Na uro" },
  { value: "fixed", label: "Na projekt" },
];

const SECTION_LABEL_CLASS =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

const DAY_CELL_LABEL_CLASS =
  "mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400";

const DAY_GRID_CLASS = "grid grid-cols-3 gap-2 sm:grid-cols-5";

const NO_DAYS_HINT = (
  <p className="text-sm text-gray-400 dark:text-gray-500">
    Najprej izberi dneve projekta.
  </p>
);

function initialItems(items: CostItem[] | undefined): ItemFields[] {
  if (items && items.length > 0) {
    return items.map((item) => ({
      amount: String(item.amount),
      note: item.note ?? "",
    }));
  }
  return [EMPTY_ITEM];
}

function toCostItems(items: ItemFields[]): CostItem[] {
  return items.map((item) => ({
    amount: Number(item.amount) || 0,
    note: item.note.trim() || null,
  }));
}

/** Na računalniku (md+) se višina opombe prilagodi vsebini. */
function fitNoteHeight(el: HTMLTextAreaElement | null) {
  if (!el || !window.matchMedia("(min-width: 768px)").matches) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`; // + zgornji in spodnji rob
}

/** Kratek predogled opombe za glavo zložljivega razdelka. */
function notePreview(note: string): string | undefined {
  const firstLine = note.trim().split("\n")[0];
  if (!firstLine) return undefined;
  return firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine;
}

function sumItemFields(items: ItemFields[]): number {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function toFieldValues(values: Record<string, number> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [date, value] of Object.entries(values ?? {})) {
    result[date] = String(value);
  }
  return result;
}

type TimeFields = { start: string; end: string };

function toTimeFields(values: DayTimes | undefined): Record<string, TimeFields> {
  const result: Record<string, TimeFields> = {};
  for (const [date, time] of Object.entries(values ?? {})) {
    result[date] = { start: time?.start ?? "", end: time?.end ?? "" };
  }
  return result;
}

/** 1 dan, 2 dneva, 3 dnevi, 5 dni */
function daysWord(n: number): string {
  if (n === 1) return "dan";
  if (n === 2) return "dneva";
  if (n === 3 || n === 4) return "dnevi";
  return "dni";
}

/** "YYYY-MM-DD" -> "Pon 6." (oz. "Pon 6. 10.", če projekt sega čez več mesecev) */
function formatDayLabel(dateKey: string, withMonth = false): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = SLOVENIAN_WEEKDAYS_SHORT[(new Date(y, m - 1, d).getDay() + 6) % 7];
  return withMonth ? `${weekday} ${d}. ${m}.` : `${weekday} ${d}.`;
}

function initialMonth(project?: ProjectWithClient): { year: number; month: number } {
  if (project && project.work_dates.length > 0) {
    const [year, month] = project.work_dates[0].split("-").map(Number);
    return { year, month: month - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function ProjectForm({ clients, project, dieselPrice }: ProjectFormProps) {
  const router = useRouter();
  const [name, setName] = useState(project?.name ?? "");
  const [clientId, setClientId] = useState(
    project?.client_id ?? clients[0]?.id ?? ""
  );
  const [{ year, month }, setYearMonth] = useState(initialMonth(project));
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(project?.work_dates ?? [])
  );
  const [costItems, setCostItems] = useState<ItemFields[]>(() =>
    initialItems(project?.cost_items)
  );
  const [extraItems, setExtraItems] = useState<ItemFields[]>(() =>
    initialItems(project?.extra_items)
  );
  const [dayHours, setDayHours] = useState<Record<string, string>>(() =>
    toFieldValues(project?.day_hours)
  );
  const [dayKm, setDayKm] = useState<Record<string, string>>(() =>
    toFieldValues(project?.day_km)
  );
  // Relacija, ki jo uporabnik trenutno dodeljuje posameznim dnem (klik na dan).
  const [pickingRoute, setPickingRoute] = useState<FuelRoute | null>(null);
  // Dnevi, ko se pelješ s kolegom in si strošek goriva delita na pol.
  const [sharedDates, setSharedDates] = useState<Set<string>>(
    () => new Set(project?.fuel_shared_dates ?? [])
  );
  // Način izbire deljenih dni (klik na dan preklopi ½).
  const [pickingShared, setPickingShared] = useState(false);
  const [fuelConsumption, setFuelConsumption] = useState(
    String(project?.fuel_consumption ?? DEFAULT_FUEL_CONSUMPTION)
  );
  // Obstoječi projekt obdrži ceno ob vnosu; nov projekt vzame trenutno ceno.
  const [fuelPrice, setFuelPrice] = useState(() => {
    const price = project?.fuel_price ?? dieselPrice;
    return price != null ? String(price) : "";
  });
  // Obračun: "na uro" (ure po dnevih × cena na uro) ali "na projekt" (ročen
  // priliv). Obstoječ projekt z urami ali urno postavko se odpre na uro.
  const [billing, setBilling] = useState<Billing>(() =>
    !project ||
    project.hourly_rate != null ||
    Object.keys(project.day_hours ?? {}).length > 0
      ? "hourly"
      : "fixed"
  );
  const [hourlyRate, setHourlyRate] = useState(
    project?.hourly_rate != null ? String(project.hourly_rate) : ""
  );
  // Ročni priliv (na projekt) brez dodatnih storitev - te so v revenue že vštete.
  const [revenue, setRevenue] = useState(() =>
    project
      ? String(Math.round((project.revenue - sumCostItems(project.extra_items)) * 100) / 100)
      : ""
  );
  // Mesec obračuna: "" = samodejno (mesec zadnjega delovnega dne).
  const [billingMonth, setBillingMonth] = useState(project?.billing_month ?? "");
  // Čas od-do in opomba po dnevih projekta.
  const [dayTimes, setDayTimes] = useState<Record<string, TimeFields>>(() =>
    toTimeFields(project?.day_times)
  );
  const [dayNotes, setDayNotes] = useState<DayNotes>(() => ({ ...(project?.day_notes ?? {}) }));
  const [note, setNote] = useState(project?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedClientColor =
    clients.find((c) => c.id === clientId)?.color ?? "#3B82F6";

  // Barve dni iz koledarja (drugi projekti v trenutno izbranem mesecu), da je
  // izbira dni projekta vizualno usklajena z zavihkom Koledar.
  const [monthProjects, setMonthProjects] = useState<ProjectWithClient[]>([]);

  const loadMonthProjects = useCallback(async () => {
    const supabase = createClient();
    const { from, to } = getMonthRange(year, month);
    const data = await getProjectsInRange(supabase, from, to);
    setMonthProjects(data.filter((p) => p.id !== project?.id));
  }, [year, month, project?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMonthProjects();
  }, [loadMonthProjects]);

  const dayColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const other of monthProjects) {
      if (!other.clients) continue;
      for (const date of other.work_dates) {
        if (!map.has(date)) map.set(date, other.clients.color);
      }
    }
    return map;
  }, [monthProjects]);

  // dateKey -> client_id, da ob izbiri dneva, ki je že v drugem projektu,
  // samodejno izberemo pravo stranko v obrazcu.
  const dayClientIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const other of monthProjects) {
      for (const date of other.work_dates) {
        if (!map.has(date)) map.set(date, other.client_id);
      }
    }
    return map;
  }, [monthProjects]);

  const sortedSelectedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);

  // Projekt lahko sega čez več mesecev; izbor dni ostane ob listanju po mesecih.
  const selectedMonths = useMemo(() => workMonths(sortedSelectedDates), [sortedSelectedDates]);
  const spansMonths = selectedMonths.length > 1;
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const dayCountByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const date of sortedSelectedDates) {
      const key = monthKeyOf(date);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [sortedSelectedDates]);

  // Ponujeni meseci obračuna: od prvega meseca dela do dva meseca po zadnjem
  // (račun se pogosto izda ali plača kasneje).
  const billingMonthOptions = useMemo(() => {
    if (selectedMonths.length === 0) return [];
    const last = addMonths(selectedMonths[selectedMonths.length - 1], 2);
    const options: string[] = [];
    for (let key = selectedMonths[0]; key <= last; key = addMonths(key, 1)) {
      options.push(key);
    }
    if (billingMonth && !options.includes(billingMonth)) {
      options.push(billingMonth);
      options.sort();
    }
    return options;
  }, [selectedMonths, billingMonth]);

  // Gorivo: km po izbranih dnevih × poraba × cena dizla.
  const totalKm = useMemo(
    () => sortedSelectedDates.reduce((sum, d) => sum + (Number(dayKm[d]) || 0), 0),
    [sortedSelectedDates, dayKm]
  );
  const consumptionNum = Number(fuelConsumption) || 0;
  const fuelPriceNum = Number(fuelPrice) || 0;
  // Km, ki jih plačaš sam: deljeni dnevi štejejo pol.
  const payableKm = useMemo(
    () =>
      sortedSelectedDates.reduce((sum, d) => {
        const km = Number(dayKm[d]) || 0;
        return sum + (sharedDates.has(d) ? km * SHARED_FUEL_FACTOR : km);
      }, 0),
    [sortedSelectedDates, dayKm, sharedDates]
  );
  const sharedDayCount = sortedSelectedDates.filter(
    (d) => sharedDates.has(d) && (Number(dayKm[d]) || 0) > 0
  ).length;
  const totalFuelCost = fuelCost(payableKm, consumptionNum, fuelPriceNum);

  const otherCosts = useMemo(() => sumItemFields(costItems), [costItems]);
  const extrasTotal = useMemo(() => sumItemFields(extraItems), [extraItems]);
  const totalCosts = otherCosts + totalFuelCost;

  // Seštevek ur samo za trenutno izbrane dni.
  const totalHours = useMemo(
    () => sortedSelectedDates.reduce((sum, d) => sum + (Number(dayHours[d]) || 0), 0),
    [sortedSelectedDates, dayHours]
  );

  // Na uro: osnova = vrednost projekta (ure × cena na uro); na projekt: ročna.
  // Priliv = osnova + dodatne storitve.
  const rateNum = Number(hourlyRate) || 0;
  const projectValue = Math.round(totalHours * rateNum * 100) / 100;
  const baseRevenue = billing === "hourly" ? projectValue : Number(revenue) || 0;
  const effectiveRevenue = Math.round((baseRevenue + extrasTotal) * 100) / 100;

  const profit = effectiveRevenue - totalCosts;

  function updateDayHours(dateKey: string, value: string) {
    setDayHours((prev) => ({ ...prev, [dateKey]: value }));
  }

  // Ob vpisu časa od-do se ure dneva izračunajo samodejno.
  function updateDayTime(dateKey: string, field: keyof TimeFields, value: string) {
    const current = dayTimes[dateKey] ?? { start: "", end: "" };
    const next = { ...current, [field]: value };
    setDayTimes((prev) => ({ ...prev, [dateKey]: next }));
    const hours = hoursBetween(next.start || null, next.end || null);
    if (hours !== null) setDayHours((prev) => ({ ...prev, [dateKey]: String(hours) }));
  }

  function updateDayNote(dateKey: string, value: string) {
    setDayNotes((prev) => ({ ...prev, [dateKey]: value }));
  }

  // Čas (in ure) prvega dne prepiše na vse izbrane dni.
  function copyFirstDayTime() {
    const first = sortedSelectedDates[0];
    if (!first) return;
    const time = dayTimes[first] ?? { start: "", end: "" };
    const hours = dayHours[first] ?? "";
    setDayTimes((prev) => {
      const next = { ...prev };
      for (const date of sortedSelectedDates) next[date] = { ...time };
      return next;
    });
    setDayHours((prev) => {
      const next = { ...prev };
      for (const date of sortedSelectedDates) next[date] = hours;
      return next;
    });
  }

  function updateDayKm(dateKey: string, value: string) {
    setDayKm((prev) => ({ ...prev, [dateKey]: value }));
  }

  // Predefinirana relacija: enaki km za vse izbrane dni (posamezen dan se
  // lahko nato še ročno popravi).
  function applyRouteToAllDays(km: number) {
    setDayKm((prev) => {
      const next = { ...prev };
      for (const date of sortedSelectedDates) next[date] = String(km);
      return next;
    });
  }

  // Način "Posamezni dnevi": klik na dan mu dodeli km relacije, ponoven klik
  // jih odstrani.
  function toggleRouteDay(dateKey: string, km: number) {
    setDayKm((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey] === String(km) ? "" : String(km),
    }));
  }

  // Menjava meseca samo prikaže drug mesec - izbrani dnevi iz drugih mesecev
  // ostanejo (projekt lahko sega čez več mesecev).
  function toggleSharedDay(dateKey: string) {
    setSharedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  function setAllShared(shared: boolean) {
    setSharedDates(shared ? new Set(sortedSelectedDates) : new Set());
  }

  function handleYearMonthChange(nextYear: number, nextMonth: number) {
    setYearMonth({ year: nextYear, month: nextMonth });
  }

  function jumpToMonth(key: string) {
    const [y, m] = key.split("-").map(Number);
    setYearMonth({ year: y, month: m - 1 });
  }

  function toggleDay(dateKey: string) {
    const isAdding = !selectedDates.has(dateKey);
    if (isAdding) {
      const entryClientId = dayClientIds.get(dateKey);
      if (entryClientId) setClientId(entryClientId);
    }

    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  function addRange(fromKey: string, toKey: string) {
    // Če ima kateri od dni v razponu vnos v koledarju, samodejno izberemo
    // pripadajočo stranko (prvi tak dan v razponu).
    let cursor = new Date(fromKey);
    const end = new Date(toKey);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
        cursor.getDate()
      ).padStart(2, "0")}`;
      const entryClientId = dayClientIds.get(key);
      if (entryClientId) {
        setClientId(entryClientId);
        break;
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }

    setSelectedDates((prev) => {
      const next = new Set(prev);
      let cursor = new Date(fromKey);
      const end = new Date(toKey);
      while (cursor <= end) {
        next.add(
          `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
            cursor.getDate()
          ).padStart(2, "0")}`
        );
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Na projekt: ur in urne postavke ne shranjujemo.
    const day_hours: Record<string, number> = {};
    if (billing === "hourly") {
      if (hourlyRate.trim() === "" || !(rateNum >= 0)) {
        setError("Vnesi ceno na uro.");
        return;
      }
      for (const date of selectedDates) {
        const hours = Number(dayHours[date]) || 0;
        if (hours > 0) day_hours[date] = hours;
      }
    }

    const day_km: Record<string, number> = {};
    for (const date of selectedDates) {
      const km = Number(dayKm[date]) || 0;
      if (km > 0) day_km[date] = km;
    }
    const hasFuel = Object.keys(day_km).length > 0;
    if (hasFuel && !(fuelPriceNum > 0)) {
      setError("Vnesi ceno dizla.");
      return;
    }

    const day_times: DayTimes = {};
    const day_notes: DayNotes = {};
    for (const date of selectedDates) {
      const time = dayTimes[date];
      if (time && (time.start || time.end)) {
        if (time.start && time.end && time.end <= time.start) {
          setError(`${formatDayLabel(date, true)}: čas konca mora biti za časom začetka.`);
          return;
        }
        day_times[date] = { start: time.start || null, end: time.end || null };
      }
      const dayNote = dayNotes[date]?.trim();
      if (dayNote) day_notes[date] = dayNote;
    }

    const input: ProjectInput = {
      name: name.trim(),
      client_id: clientId,
      work_dates: [...selectedDates],
      cost_items: toCostItems(costItems),
      extra_items: toCostItems(extraItems),
      day_hours,
      hourly_rate: billing === "hourly" ? rateNum : null,
      day_km,
      fuel_consumption: hasFuel ? consumptionNum : null,
      fuel_price: hasFuel ? fuelPriceNum : null,
      fuel_shared_dates: [...sharedDates].filter((d) => day_km[d] > 0),
      day_times,
      day_notes,
      revenue: effectiveRevenue,
      billing_month: billingMonth || null,
      note: note.trim() || null,
    };

    startTransition(async () => {
      const result = project
        ? await updateProjectAction(project.id, input)
        : await createProjectAction(input);

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (clients.length === 0) {
    return (
      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Najprej dodaj vsaj enega partnerja v zavihku &quot;Partnerji&quot;.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Ime projekta *" htmlFor="name">
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>

      <Field label="Partner" htmlFor="client_id">
        <select
          id="client_id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]"
          required
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <span className={SECTION_LABEL_CLASS}>Dnevi projekta</span>
        <div className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800">
          <MonthYearPicker year={year} month={month} onChange={handleYearMonthChange} />
          <MonthDayPicker
            year={year}
            month={month}
            selected={selectedDates}
            onToggleDay={toggleDay}
            onAddRange={addRange}
            color={selectedClientColor}
            dayColors={dayColors}
          />

          {/* Izbrani dnevi po mesecih - klik skoči na mesec. */}
          {(spansMonths ||
            (selectedMonths.length === 1 && selectedMonths[0] !== currentMonthKey)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">Izbrano:</span>
              {selectedMonths.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => jumpToMonth(key)}
                  className={clsx(
                    ROUTE_CHIP_CLASS,
                    key === currentMonthKey && "ring-1 ring-blue-500 dark:ring-blue-600"
                  )}
                >
                  {formatMonthKey(key)} ({dayCountByMonth.get(key)})
                </button>
              ))}
            </div>
          )}

          {selectedMonths.length > 0 && (
            <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
              <Field label="Mesec obračuna" htmlFor="billing_month">
                <select
                  id="billing_month"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark] sm:w-64"
                >
                  <option value="">
                    Samodejno – {formatMonthKey(autoBillingMonth(sortedSelectedDates))}
                  </option>
                  {billingMonthOptions.map((key) => (
                    <option key={key} value={key}>
                      {formatMonthKey(key)}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Priliv in stroški projekta se v pregledu financ štejejo v ta mesec.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delovni čas po dnevih: od-do, ure (pri urnem obračunu) in opomba. */}
      <Collapsible
        title="Delovni čas po dnevih"
        summary={
          sortedSelectedDates.length === 0
            ? undefined
            : `${sortedSelectedDates.length} ${daysWord(sortedSelectedDates.length)}${
                billing === "hourly" && totalHours > 0 ? ` · ${formatHours(totalHours)}` : ""
              }`
        }
        defaultOpen={!project}
      >
        {sortedSelectedDates.length === 0 ? (
          NO_DAYS_HINT
        ) : (
          <>
            {sortedSelectedDates.length > 1 && (
              <button type="button" className={ROUTE_CHIP_CLASS} onClick={copyFirstDayTime}>
                Čas prvega dne za vse dni
              </button>
            )}
            <div className="space-y-2">
              {sortedSelectedDates.map((date) => {
                const time = dayTimes[date] ?? { start: "", end: "" };
                return (
                  <div
                    key={date}
                    className="rounded-md border border-gray-200 p-2 dark:border-gray-800"
                  >
                    <span className={DAY_CELL_LABEL_CLASS}>
                      {formatDayLabel(date, spansMonths)}
                    </span>
                    <div
                      className={clsx(
                        "grid gap-2",
                        billing === "hourly"
                          ? "grid-cols-3 sm:grid-cols-[7rem_7rem_5rem_1fr]"
                          : "grid-cols-2 sm:grid-cols-[7rem_7rem_1fr]"
                      )}
                    >
                      <Input
                        type="time"
                        aria-label={`Od - ${formatDayLabel(date, true)}`}
                        title="Od"
                        value={time.start}
                        onChange={(e) => updateDayTime(date, "start", e.target.value)}
                      />
                      <Input
                        type="time"
                        aria-label={`Do - ${formatDayLabel(date, true)}`}
                        title="Do"
                        value={time.end}
                        onChange={(e) => updateDayTime(date, "end", e.target.value)}
                      />
                      {billing === "hourly" && (
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.25"
                          min="0"
                          max="24"
                          placeholder="ure"
                          aria-label={`Ure - ${formatDayLabel(date, true)}`}
                          title="Ure"
                          value={dayHours[date] ?? ""}
                          onChange={(e) => updateDayHours(date, e.target.value)}
                        />
                      )}
                      <Input
                        placeholder="Opomba dneva"
                        aria-label={`Opomba - ${formatDayLabel(date, true)}`}
                        className={billing === "hourly" ? "col-span-3 sm:col-span-1" : "col-span-2 sm:col-span-1"}
                        value={dayNotes[date] ?? ""}
                        onChange={(e) => updateDayNote(date, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Collapsible>

      {/* Obračun: na uro (ure × cena na uro) ali na projekt (ročen priliv). */}
      <Collapsible title="Obračun" summary={formatEUR(baseRevenue)} defaultOpen>
        <div
          role="radiogroup"
          aria-label="Način obračuna"
          className="grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1 dark:bg-gray-800"
        >
          {BILLING_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={billing === option.value}
              onClick={() => setBilling(option.value)}
              className={
                "rounded px-3 py-1.5 text-sm font-medium transition-colors " +
                (billing === option.value
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200")
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {billing === "hourly" ? (
          <>
            <div className="w-40">
              <Field label="Cena na uro (EUR)" htmlFor="hourly_rate">
                <Input
                  id="hourly_rate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="npr. 25"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </Field>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatHours(totalHours)} × {formatEUR(rateNum)}/h ={" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatEUR(projectValue)}
              </span>
              {extrasTotal > 0 && ` (+ ${formatEUR(extrasTotal)} dodatne storitve)`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ure vpiši v razdelku &quot;Delovni čas po dnevih&quot; (iz časa od–do se
              izračunajo same).
            </p>
          </>
        ) : (
          <Field label="Priliv (EUR)" htmlFor="revenue">
            <Input
              id="revenue"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </Field>
        )}
      </Collapsible>

      <Collapsible
        title="Stroški"
        summary={formatEUR(totalCosts)}
      >
        <Collapsible
          nested
          title="Gorivo (dizel)"
          summary={
            totalKm > 0
              ? `${formatKm(totalKm)} · ${formatEUR(totalFuelCost)}`
              : formatEUR(0)
          }
          defaultOpen={totalKm > 0}
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="Poraba (l/100 km)" htmlFor="fuel_consumption">
              <Input
                id="fuel_consumption"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={fuelConsumption}
                onChange={(e) => setFuelConsumption(e.target.value)}
              />
            </Field>
            <Field label="Cena dizla (EUR/l)" htmlFor="fuel_price">
              <Input
                id="fuel_price"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Poraba: VW Passat 2.0 TDI (2008), povprečje.{" "}
            {dieselPrice == null ? (
              "Trenutne cene dizla ni bilo mogoče pridobiti, vnesi jo ročno."
            ) : fuelPriceNum === dieselPrice ? (
              "Cena je trenutna (goriva.si)."
            ) : (
              <>
                Trenutna cena: {dieselPrice.toLocaleString("sl-SI")} €/l{" "}
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  onClick={() => setFuelPrice(String(dieselPrice))}
                >
                  Uporabi
                </button>
              </>
            )}
          </p>

          {sortedSelectedDates.length > 0 &&
            (pickingShared ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 dark:bg-amber-950/40">
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Klikni dneve, ko se pelješ s kolegom (½ stroška goriva)
                </span>
                <button
                  type="button"
                  className={ROUTE_CHIP_CLASS}
                  onClick={() => setPickingShared(false)}
                >
                  Končano
                </button>
              </div>
            ) : pickingRoute ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-blue-50 px-2.5 py-1.5 dark:bg-blue-950/40">
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  Klikni dneve za relacijo {pickingRoute.label} (
                  {formatKm(pickingRoute.km)})
                </span>
                <button
                  type="button"
                  className={ROUTE_CHIP_CLASS}
                  onClick={() => setPickingRoute(null)}
                >
                  Končano
                </button>
              </div>
            ) : (
              FUEL_ROUTES.map((route) => (
                <div key={route.label} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {route.label} ({formatKm(route.km)}):
                  </span>
                  <button
                    type="button"
                    className={ROUTE_CHIP_CLASS}
                    onClick={() => applyRouteToAllDays(route.km)}
                  >
                    Vsi dnevi
                  </button>
                  <button
                    type="button"
                    className={ROUTE_CHIP_CLASS}
                    onClick={() => setPickingRoute(route)}
                  >
                    Posamezni dnevi
                  </button>
                </div>
              )).concat(
                <div key="shared" className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Deljeno s kolegom (½):
                  </span>
                  <button
                    type="button"
                    className={ROUTE_CHIP_CLASS}
                    onClick={() => setAllShared(true)}
                  >
                    Vsi dnevi
                  </button>
                  <button
                    type="button"
                    className={ROUTE_CHIP_CLASS}
                    onClick={() => setPickingShared(true)}
                  >
                    Posamezni dnevi
                  </button>
                  {sharedDates.size > 0 && (
                    <button
                      type="button"
                      className={ROUTE_CHIP_CLASS}
                      onClick={() => setAllShared(false)}
                    >
                      Nobeden
                    </button>
                  )}
                </div>
              )
            ))}

          {sortedSelectedDates.length === 0 ? (
            NO_DAYS_HINT
          ) : pickingShared ? (
            <div className={DAY_GRID_CLASS}>
              {sortedSelectedDates.map((date) => {
                const shared = sharedDates.has(date);
                return (
                  <button
                    key={date}
                    type="button"
                    aria-pressed={shared}
                    onClick={() => toggleSharedDay(date)}
                    className={
                      "rounded-md border-2 p-2 text-left transition-colors " +
                      (shared
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
                        : "border-gray-200 bg-white hover:border-amber-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-amber-800")
                    }
                  >
                    <span className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      {formatDayLabel(date, spansMonths)}
                    </span>
                    <span className="block text-sm text-gray-900 dark:text-gray-100">
                      {dayKm[date] ? formatKm(Number(dayKm[date]) || 0) : "–"}
                      {shared && " · ½"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : pickingRoute ? (
            <div className={DAY_GRID_CLASS}>
              {sortedSelectedDates.map((date) => {
                const assigned = dayKm[date] === String(pickingRoute.km);
                return (
                  <button
                    key={date}
                    type="button"
                    aria-pressed={assigned}
                    onClick={() => toggleRouteDay(date, pickingRoute.km)}
                    className={
                      "rounded-md border-2 p-2 text-left transition-colors " +
                      (assigned
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                        : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800")
                    }
                  >
                    <span className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      {formatDayLabel(date, spansMonths)}
                    </span>
                    <span className="block text-sm text-gray-900 dark:text-gray-100">
                      {dayKm[date] ? formatKm(Number(dayKm[date]) || 0) : "–"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={DAY_GRID_CLASS}>
              {sortedSelectedDates.map((date) => (
                <div
                  key={date}
                  className="rounded-md border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900"
                >
                  <label htmlFor={`km-${date}`} className={DAY_CELL_LABEL_CLASS}>
                    {formatDayLabel(date, spansMonths)}
                    {sharedDates.has(date) && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">½</span>
                    )}
                  </label>
                  <Input
                    id={`km-${date}`}
                    type="number"
                    inputMode="decimal"
                    step="1"
                    min="0"
                    placeholder="km"
                    value={dayKm[date] ?? ""}
                    onChange={(e) => updateDayKm(date, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          {totalKm > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatKm(totalKm)}
              {sharedDayCount > 0 &&
                ` (plačaš ${formatKm(payableKm)}, ½ deljeno: ${sharedDayCount} ${
                  sharedDayCount === 1
                    ? "dan"
                    : sharedDayCount === 2
                      ? "dneva"
                      : sharedDayCount <= 4
                        ? "dnevi"
                        : "dni"
                })`}{" "}
              ·{" "}
              {fuelLiters(payableKm, consumptionNum).toLocaleString("sl-SI", {
                maximumFractionDigits: 1,
              })}{" "}
              l ·{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatEUR(totalFuelCost)}
              </span>
            </p>
          )}
        </Collapsible>

        <Collapsible
          nested
          title="Ostali stroški"
          summary={formatEUR(otherCosts)}
          defaultOpen={otherCosts > 0}
        >
          <ItemRows
            items={costItems}
            onChange={setCostItems}
            idPrefix="cost"
            itemLabel="stroška"
          />
        </Collapsible>
      </Collapsible>

      {/* Dodatne storitve: zaračunane poleg osnovnega obračuna, prištejejo se prilivu. */}
      <Collapsible
        compact
        title="Dodatne storitve"
        summary={formatEUR(extrasTotal)}
      >
        <ItemRows
          items={extraItems}
          onChange={setExtraItems}
          idPrefix="extra"
          itemLabel="storitve"
          notePlaceholder="Opis storitve"
        />
      </Collapsible>

      {/* Povzetek projekta - enaka razdelitev kot na kartici projekta. */}
      <div className="grid grid-cols-3 gap-2 rounded-md border border-gray-200 border-l-4 border-l-blue-500 p-3 dark:border-gray-800 dark:border-l-blue-500">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Priliv</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatEUR(effectiveRevenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Stroški</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatEUR(totalCosts)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Dobiček</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatEUR(profit)}
          </p>
          {billing === "hourly" && totalHours > 0 && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Ure: {formatHours(totalHours)}
            </p>
          )}
        </div>
      </div>

      <Collapsible title="Opomba" summary={notePreview(note)}>
        <Textarea
          id="note"
          aria-label="Opomba"
          rows={2}
          ref={fitNoteHeight}
          className="md:resize-none md:overflow-hidden"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            fitNoteHeight(e.currentTarget);
          }}
        />
      </Collapsible>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => router.back()}
        >
          Prekliči
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem …" : project ? "Shrani spremembe" : "Dodaj projekt"}
        </Button>
      </div>
    </form>
  );
}
