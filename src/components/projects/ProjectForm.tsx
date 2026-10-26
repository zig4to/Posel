"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  Client,
  CostItem,
  ProjectWithClient,
  WorkEntryWithClient,
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
import { formatEUR } from "@/lib/utils/currency";
import { createClient } from "@/lib/supabase/client";
import { getWorkEntriesInRange } from "@/lib/data/workEntries";
import { getMonthRange, SLOVENIAN_WEEKDAYS_SHORT } from "@/lib/utils/date";
import {
  DEFAULT_FUEL_CONSUMPTION,
  FUEL_ROUTES,
  formatHours,
  formatKm,
  fuelCost,
  fuelLiters,
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

type CostItemFields = { amount: string; note: string };

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

function initialCostItems(project?: ProjectWithClient): CostItemFields[] {
  if (project && (project.cost_items ?? []).length > 0) {
    return project.cost_items.map((item) => ({
      amount: String(item.amount),
      note: item.note ?? "",
    }));
  }
  return [{ amount: "", note: "" }];
}

function toFieldValues(values: Record<string, number> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [date, value] of Object.entries(values ?? {})) {
    result[date] = String(value);
  }
  return result;
}

/** "YYYY-MM-DD" -> "pon 6." */
function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = SLOVENIAN_WEEKDAYS_SHORT[(new Date(y, m - 1, d).getDay() + 6) % 7];
  return `${weekday} ${d}.`;
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
  const [costItems, setCostItems] = useState<CostItemFields[]>(() =>
    initialCostItems(project)
  );
  const [dayHours, setDayHours] = useState<Record<string, string>>(() =>
    toFieldValues(project?.day_hours)
  );
  const [dayKm, setDayKm] = useState<Record<string, string>>(() =>
    toFieldValues(project?.day_km)
  );
  // Relacija, ki jo uporabnik trenutno dodeljuje posameznim dnem (klik na dan).
  const [pickingRoute, setPickingRoute] = useState<FuelRoute | null>(null);
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
  const [revenue, setRevenue] = useState(project ? String(project.revenue) : "");
  const [note, setNote] = useState(project?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedClientColor =
    clients.find((c) => c.id === clientId)?.color ?? "#3B82F6";

  // Barve dni iz koledarja (obstoječi delovni vnosi za trenutno izbrani mesec),
  // da je izbira dni projekta vizualno usklajena z zavihkom Koledar.
  const [monthEntries, setMonthEntries] = useState<WorkEntryWithClient[]>([]);

  const loadMonthEntries = useCallback(async () => {
    const supabase = createClient();
    const { from, to } = getMonthRange(year, month);
    const data = await getWorkEntriesInRange(supabase, from, to);
    setMonthEntries(data);
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMonthEntries();
  }, [loadMonthEntries]);

  const dayColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of monthEntries) {
      if (!entry.clients || map.has(entry.work_date)) continue;
      map.set(entry.work_date, entry.clients.color);
    }
    return map;
  }, [monthEntries]);

  // dateKey -> client_id, da ob izbiri dneva z vnosom v koledarju samodejno
  // izberemo pravo stranko v obrazcu.
  const dayClientIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of monthEntries) {
      if (map.has(entry.work_date)) continue;
      map.set(entry.work_date, entry.client_id);
    }
    return map;
  }, [monthEntries]);

  const sortedSelectedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);

  // Gorivo: km po izbranih dnevih × poraba × cena dizla.
  const totalKm = useMemo(
    () => sortedSelectedDates.reduce((sum, d) => sum + (Number(dayKm[d]) || 0), 0),
    [sortedSelectedDates, dayKm]
  );
  const consumptionNum = Number(fuelConsumption) || 0;
  const fuelPriceNum = Number(fuelPrice) || 0;
  const totalFuelCost = fuelCost(totalKm, consumptionNum, fuelPriceNum);

  const otherCosts = useMemo(
    () => costItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [costItems]
  );
  const totalCosts = otherCosts + totalFuelCost;

  // Seštevek ur samo za trenutno izbrane dni.
  const totalHours = useMemo(
    () => sortedSelectedDates.reduce((sum, d) => sum + (Number(dayHours[d]) || 0), 0),
    [sortedSelectedDates, dayHours]
  );

  // Na uro: priliv = vrednost projekta (ure × cena na uro); na projekt: ročen.
  const rateNum = Number(hourlyRate) || 0;
  const projectValue = Math.round(totalHours * rateNum * 100) / 100;
  const effectiveRevenue = billing === "hourly" ? projectValue : Number(revenue) || 0;

  const profit = effectiveRevenue - totalCosts;

  function updateDayHours(dateKey: string, value: string) {
    setDayHours((prev) => ({ ...prev, [dateKey]: value }));
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

  function updateCostAmount(index: number, value: string) {
    setCostItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, amount: value } : item))
    );
  }

  function updateCostNote(index: number, value: string) {
    setCostItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, note: value } : item))
    );
  }

  function addCostItem() {
    setCostItems((prev) => [...prev, { amount: "", note: "" }]);
  }

  function removeCostItem(index: number) {
    setCostItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleYearMonthChange(nextYear: number, nextMonth: number) {
    setYearMonth({ year: nextYear, month: nextMonth });
    // Ob spremembi meseca odstranimo dneve, ki ne spadajo več v izbrani mesec.
    setSelectedDates((prev) => {
      const prefix = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}`;
      const filtered = [...prev].filter((key) => key.startsWith(prefix));
      return new Set(filtered);
    });
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

    const cost_items: CostItem[] = costItems.map((item) => ({
      amount: Number(item.amount) || 0,
      note: item.note.trim() || null,
    }));

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

    const input: ProjectInput = {
      name: name.trim(),
      client_id: clientId,
      work_dates: [...selectedDates],
      cost_items,
      day_hours,
      hourly_rate: billing === "hourly" ? rateNum : null,
      day_km,
      fuel_consumption: hasFuel ? consumptionNum : null,
      fuel_price: hasFuel ? fuelPriceNum : null,
      revenue: effectiveRevenue,
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
        </div>
      </div>

      {/* Obračun: na uro (ure × cena na uro) ali na projekt (ročen priliv). */}
      <div>
        <span className={SECTION_LABEL_CLASS}>Obračun</span>
        <div className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-800">
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

              <div>
                <span className={SECTION_LABEL_CLASS}>Ure po dnevih</span>
                {sortedSelectedDates.length === 0 ? (
                  NO_DAYS_HINT
                ) : (
                  <div className={DAY_GRID_CLASS}>
                    {sortedSelectedDates.map((date) => (
                      <div
                        key={date}
                        className="rounded-md border border-gray-200 p-2 dark:border-gray-800"
                      >
                        <label htmlFor={`hours-${date}`} className={DAY_CELL_LABEL_CLASS}>
                          {formatDayLabel(date)}
                        </label>
                        <Input
                          id={`hours-${date}`}
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          max="24"
                          placeholder="0"
                          value={dayHours[date] ?? ""}
                          onChange={(e) => updateDayHours(date, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatHours(totalHours)} × {formatEUR(rateNum)}/h ={" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatEUR(projectValue)}
                </span>
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
        </div>
      </div>

      <Collapsible
        title="Stroški"
        summary={formatEUR(totalCosts)}
        defaultOpen={totalCosts > 0}
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
            (pickingRoute ? (
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
              ))
            ))}

          {sortedSelectedDates.length === 0 ? (
            NO_DAYS_HINT
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
                      {formatDayLabel(date)}
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
                    {formatDayLabel(date)}
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
              {formatKm(totalKm)} ·{" "}
              {fuelLiters(totalKm, consumptionNum).toLocaleString("sl-SI", {
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
          {costItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-24 flex-shrink-0">
                <Input
                  id={`cost-amount-${index}`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="Znesek"
                  aria-label="Znesek stroška"
                  value={item.amount}
                  onChange={(e) => updateCostAmount(index, e.target.value)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  id={`cost-note-${index}`}
                  placeholder="Opomba"
                  aria-label="Opomba stroška"
                  value={item.note}
                  onChange={(e) => updateCostNote(index, e.target.value)}
                />
              </div>
              {index === costItems.length - 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 flex-shrink-0 px-0"
                  onClick={addCostItem}
                  aria-label="Dodaj strošek"
                >
                  +
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 flex-shrink-0 px-0"
                  onClick={() => removeCostItem(index)}
                  aria-label="Odstrani strošek"
                >
                  ×
                </Button>
              )}
            </div>
          ))}
        </Collapsible>
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

      <Field label="Opomba" htmlFor="note">
        <Textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

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
