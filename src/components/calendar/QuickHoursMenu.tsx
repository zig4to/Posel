"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import type { ProjectWithClient } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import clsx from "@/lib/utils/clsx";
import { createClient } from "@/lib/supabase/client";
import { getProjectsInRange } from "@/lib/data/projects";
import { quickDayEntryAction } from "@/actions/projects";
import { formatDateKey, getMonthRange } from "@/lib/utils/date";
import { FUEL_ROUTES, formatHours, formatKm } from "@/lib/utils/projectCosts";

/** Pogoste vrednosti za hiter izbor. */
const QUICK_HOURS = [4, 6, 8, 10];

const INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
const CHIP_BASE_CLASS = "flex-1 rounded-md border-2 px-2 py-1.5 text-sm";
const CHIP_IDLE_CLASS =
  "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700";
const CHIP_ACTIVE_CLASS =
  "border-blue-600 bg-blue-50 font-medium text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200";

/** Razredi izbirnega gumba; izbran ima moder rob. */
function chipClass(active = false): string {
  return clsx(CHIP_BASE_CLASS, active ? CHIP_ACTIVE_CLASS : CHIP_IDLE_CLASS);
}

function ClockPlusIcon() {
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
      <path d="M12 6v6l3.6 1.8" />
      <path d="M16 19h6" />
      <path d="M19 16v6" />
      <path d="M21.92 13.27a10 10 0 1 0-8.65 8.65" />
    </svg>
  );
}

type Step = "hours" | "fuel" | "meal" | "confirm";

function parseNum(value: string): number {
  return value.trim() ? Number(value.replace(",", ".")) : 0;
}

/** Opomba postavke malice za dan (mora ustrezati akciji na strežniku). */
function mealNoteFor(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `Malica ${Number(d)}. ${Number(m)}.`;
}

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 flex-shrink-0"
      aria-hidden="true"
    >
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

/**
 * Hiter vpis ur za današnji dan: najprej izbira projekta (samo projekti
 * tekočega meseca), nato vpis ur. Ure se zapišejo izbranemu projektu za danes.
 */
export default function QuickHoursMenu({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectWithClient[] | null>(null);
  const [selected, setSelected] = useState<ProjectWithClient | null>(null);
  const [step, setStep] = useState<Step>("hours");
  const [hours, setHours] = useState("");
  const [km, setKm] = useState("");
  const [shared, setShared] = useState(false);
  const [meal, setMeal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  // Na mobilnem je vrstica z gumbi drsna (overflow), zato meni fiksno
  // poravnamo na desni rob zaslona (kot pri meniju Filter).
  const [mobilePanelStyle, setMobilePanelStyle] = useState<CSSProperties | undefined>();

  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(max-width: 639px)");
    const reposition = () => {
      if (!mq.matches || !rootRef.current) {
        setMobilePanelStyle(undefined);
        return;
      }
      const rect = rootRef.current.getBoundingClientRect();
      setMobilePanelStyle({ position: "fixed", top: rect.bottom + 8, right: 12 });
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    mq.addEventListener("change", reposition);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      mq.removeEventListener("change", reposition);
    };
  }, [open]);

  async function loadProjects() {
    const now = new Date();
    const { from, to } = getMonthRange(now.getFullYear(), now.getMonth());
    try {
      const data = await getProjectsInRange(createClient(), from, to);
      setProjects(data);
    } catch {
      setProjects([]);
      setError("Projektov ni bilo mogoče naložiti.");
    }
  }

  function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setSelected(null);
    setError(null);
    setProjects(null);
    setOpen(true);
    loadProjects();
  }

  function pickProject(project: ProjectWithClient) {
    setSelected(project);
    setError(null);
    const existing = project.day_hours?.[todayKey];
    setHours(existing ? String(existing).replace(".", ",") : "");
    // Gorivo: privzeto relacija LJ – KR – LJ, razen če je za danes že vpisan km.
    const existingKm = project.day_km?.[todayKey];
    setKm(String(existingKm ?? FUEL_ROUTES[0].km).replace(".", ","));
    setShared(
      existingKm ? (project.fuel_shared_dates ?? []).includes(todayKey) : false
    );
    const mealItem = (project.cost_items ?? []).find((i) => i.note === mealNoteFor(todayKey));
    setMeal(mealItem ? String(mealItem.amount).replace(".", ",") : "");
    setStep("hours");
  }

  function goTo(next: Step) {
    setError(null);
    setStep(next);
  }

  function nextFromHours(value: string) {
    const num = parseNum(value);
    if (!(num >= 0 && num <= 24)) {
      setError("Vnesi ure med 0 in 24.");
      return;
    }
    goTo("fuel");
  }

  function nextFromFuel() {
    if (!(parseNum(km) >= 0)) {
      setError("Vnesi veljavne km.");
      return;
    }
    goTo("meal");
  }

  function nextFromMeal() {
    if (!(parseNum(meal) >= 0)) {
      setError("Vnesi veljaven znesek.");
      return;
    }
    goTo("confirm");
  }

  function save() {
    if (!selected) return;
    startTransition(async () => {
      const result = await quickDayEntryAction({
        id: selected.id,
        date: todayKey,
        hours: parseNum(hours),
        km: parseNum(km),
        shared,
        meal: parseNum(meal),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onSaved();
    });
  }

  return (
    <div className="relative flex-shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Vpiši ure"
        title="Vpiši ure za danes"
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 max-sm:w-9 max-sm:justify-center max-sm:px-0 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:gap-2 sm:px-3"
      >
        <ClockPlusIcon />
        <span className="hidden sm:inline">Vpiši ure</span>
      </button>

      {open && (
        <div
          style={mobilePanelStyle}
          className="absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40 sm:left-0 sm:right-auto"
        >
          {!selected ? (
            <>
              <p className="border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Projekt (ta mesec)
              </p>
              <div className="max-h-72 overflow-y-auto p-1">
                {projects === null && (
                  <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">Nalagam …</p>
                )}
                {projects?.length === 0 && !error && (
                  <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                    Ta mesec ni projektov.
                  </p>
                )}
                {projects?.map((project) => {
                  const todayHours = project.day_hours?.[todayKey];
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => pickProject(project)}
                      className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <ColorDot color={project.clients?.color ?? "#9CA3AF"} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{project.name || "Brez imena"}</span>
                        <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                          {project.clients?.company_name ?? "Neznan partner"}
                        </span>
                      </span>
                      {todayHours ? (
                        <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          danes {formatHours(todayHours)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <form
              className="space-y-3 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (step === "hours") nextFromHours(hours);
                else if (step === "fuel") nextFromFuel();
                else if (step === "meal") nextFromMeal();
                else save();
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (step === "hours") setSelected(null);
                  else if (step === "fuel") setStep("hours");
                  else if (step === "meal") setStep("fuel");
                  else setStep("meal");
                }}
                className="flex w-full items-center gap-1.5 text-left text-sm text-gray-700 dark:text-gray-200"
              >
                <ChevronLeftIcon />
                <ColorDot color={selected.clients?.color ?? "#9CA3AF"} />
                <span className="min-w-0 truncate font-medium">
                  {selected.name || "Brez imena"}
                </span>
              </button>

              {step === "hours" && (
                <>
                  <div>
                    <label
                      htmlFor="quick-hours"
                      className="mb-1 block text-xs text-gray-500 dark:text-gray-400"
                    >
                      Ure za danes
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="quick-hours"
                        autoFocus
                        inputMode="decimal"
                        placeholder="npr. 8"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className={INPUT_CLASS}
                      />
                      <Button type="submit" className="flex-shrink-0">
                        Naprej
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {QUICK_HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          setHours(String(h));
                          nextFromHours(String(h));
                        }}
                        className={chipClass()}
                      >
                        {h} h
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === "fuel" && (
                <>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Gorivo</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShared(false)}
                      aria-pressed={!shared}
                      className={chipClass(!shared)}
                    >
                      Sam
                    </button>
                    <button
                      type="button"
                      onClick={() => setShared(true)}
                      aria-pressed={shared}
                      className={chipClass(shared)}
                    >
                      Pol (s prijateljem)
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {FUEL_ROUTES.map((route) => (
                      <button
                        key={route.label}
                        type="button"
                        onClick={() => setKm(String(route.km))}
                        aria-pressed={parseNum(km) === route.km}
                        className={chipClass(parseNum(km) === route.km)}
                      >
                        {route.label} ({route.km} km)
                      </button>
                    ))}
                  </div>
                  <div>
                    <label
                      htmlFor="quick-km"
                      className="mb-1 block text-xs text-gray-500 dark:text-gray-400"
                    >
                      Ali vnesi km
                    </label>
                    <input
                      id="quick-km"
                      inputMode="decimal"
                      placeholder="npr. 54"
                      value={km}
                      onChange={(e) => setKm(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setKm("");
                        setShared(false);
                        goTo("meal");
                      }}
                    >
                      Brez goriva
                    </Button>
                    <Button type="submit" className="flex-1">
                      Naprej
                    </Button>
                  </div>
                </>
              )}

              {step === "meal" && (
                <>
                  <div>
                    <label
                      htmlFor="quick-meal"
                      className="mb-1 block text-xs text-gray-500 dark:text-gray-400"
                    >
                      Malica (EUR)
                    </label>
                    <input
                      id="quick-meal"
                      autoFocus
                      inputMode="decimal"
                      placeholder="npr. 7,5"
                      value={meal}
                      onChange={(e) => setMeal(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setMeal("");
                        goTo("confirm");
                      }}
                    >
                      Brez malice
                    </Button>
                    <Button type="submit" className="flex-1">
                      Naprej
                    </Button>
                  </div>
                </>
              )}

              {step === "confirm" && (
                <>
                  <dl className="space-y-1 rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500 dark:text-gray-400">Ure</dt>
                      <dd className="text-gray-900 dark:text-gray-100">
                        {parseNum(hours) > 0 ? formatHours(parseNum(hours)) : "–"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500 dark:text-gray-400">Gorivo</dt>
                      <dd className="text-gray-900 dark:text-gray-100">
                        {parseNum(km) > 0
                          ? `${formatKm(parseNum(km))}${shared ? " (½)" : ""}`
                          : "–"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500 dark:text-gray-400">Malica</dt>
                      <dd className="text-gray-900 dark:text-gray-100">
                        {parseNum(meal) > 0
                          ? `${parseNum(meal).toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                          : "–"}
                      </dd>
                    </div>
                  </dl>
                  <Button type="submit" disabled={pending} className="w-full">
                    {pending ? "Shranjujem …" : "Potrdi vpis"}
                  </Button>
                </>
              )}

              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
