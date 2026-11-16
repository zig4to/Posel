"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import type { ProjectWithClient } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { getProjectsInRange } from "@/lib/data/projects";
import { setProjectDayHoursAction } from "@/actions/projects";
import { formatDateKey, getMonthRange } from "@/lib/utils/date";
import { formatHours } from "@/lib/utils/projectCosts";

/** Pogoste vrednosti za hiter izbor. */
const QUICK_HOURS = [4, 6, 8, 10];

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
  const [hours, setHours] = useState("");
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
  }

  function save(value: string) {
    if (!selected) return;
    const num = Number(value.replace(",", "."));
    if (!value.trim() || !(num >= 0 && num <= 24)) {
      setError("Vnesi ure med 0 in 24.");
      return;
    }
    startTransition(async () => {
      const result = await setProjectDayHoursAction(selected.id, todayKey, num);
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
                save(hours);
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setError(null);
                }}
                className="flex w-full items-center gap-1.5 text-left text-sm text-gray-700 dark:text-gray-200"
              >
                <ChevronLeftIcon />
                <ColorDot color={selected.clients?.color ?? "#9CA3AF"} />
                <span className="min-w-0 truncate font-medium">
                  {selected.name || "Brez imena"}
                </span>
              </button>

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
                    className="w-full min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <Button type="submit" disabled={pending} className="flex-shrink-0">
                    {pending ? "Shranjujem …" : "Shrani"}
                  </Button>
                </div>
              </div>

              <div className="flex gap-1.5">
                {QUICK_HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setHours(String(h));
                      save(String(h));
                    }}
                    className="flex-1 rounded-md border border-gray-300 bg-white py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {h} h
                  </button>
                ))}
              </div>

              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
