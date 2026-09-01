"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Client } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";
import { SLOVENIAN_MONTHS } from "@/lib/utils/date";
import clsx from "@/lib/utils/clsx";

type FilterMenuProps = {
  clients: Client[];
  selectedClientId: string | null;
  onClientChange: (clientId: string | null) => void;
  year: number;
  month: number; // 0-11
  onDateChange: (year: number, month: number) => void;
};

type Section = "stranke" | "datum";

const YEAR_RANGE = 5;

function FilterIcon() {
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
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

const SECTION_LABEL: Record<Section, string> = {
  stranke: "Filtriraj po strankah",
  datum: "Filtriraj po datumu",
};

export default function FilterMenu({
  clients,
  selectedClientId,
  onClientChange,
  year,
  month,
  onDateChange,
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("stranke");
  // Samo za mobilni "drill-down" meni: null = seznam kategorij filtra,
  // sicer izbrana kategorija (vsebina te kategorije je enaka kot na desktopu).
  const [mobileSection, setMobileSection] = useState<Section | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Na mobilnem gumb "Filter" pogosto ni ob desnem robu zaslona (levo od
  // njega so še puščici in prikaz meseca), zato bi se spustni meni, sidran
  // na gumb, lahko odrezal ob levem robu. Zato ga na mobilnem "izklopimo"
  // iz gumba in ga fiksno poravnamo na desni rob zaslona.
  const [mobilePanelStyle, setMobilePanelStyle] = useState<
    CSSProperties | undefined
  >(undefined);

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
      setMobilePanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        right: 12,
      });
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

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      // Ob vsakem odpiranju na mobilnem najprej pokažemo seznam kategorij.
      if (next) setMobileSection(null);
      return next;
    });
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const yearOptions = Array.from(
    { length: YEAR_RANGE * 2 + 1 },
    (_, i) => year - YEAR_RANGE + i
  );

  const clientListContent = (
    <div className="p-1">
      <button
        type="button"
        onClick={() => {
          onClientChange(null);
          setOpen(false);
        }}
        className={clsx(
          "flex w-full items-center rounded px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700",
          !selectedClientId
            ? "font-medium text-blue-700 dark:text-blue-300"
            : "text-gray-700 dark:text-gray-200"
        )}
      >
        Vse stranke
      </button>
      {clients.length === 0 && (
        <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
          Ni strank.
        </p>
      )}
      {clients.map((client) => (
        <button
          key={client.id}
          type="button"
          onClick={() => {
            onClientChange(client.id);
            setOpen(false);
          }}
          className={clsx(
            "flex w-full items-center gap-2 rounded px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700",
            selectedClientId === client.id
              ? "font-medium text-blue-700 dark:text-blue-300"
              : "text-gray-700 dark:text-gray-200"
          )}
        >
          <ColorDot color={client.color} />
          <span className="truncate">{client.company_name}</span>
        </button>
      ))}
    </div>
  );

  const dateContent = (
    <div className="flex flex-col gap-3 p-3">
      <label className="flex items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-300">
        Mesec
        <select
          value={month}
          onChange={(e) => onDateChange(year, Number(e.target.value))}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          {SLOVENIAN_MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-300">
        Leto
        <select
          value={year}
          onChange={(e) => onDateChange(Number(e.target.value), month)}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <div className="relative flex-shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={clsx(
          "inline-flex h-10 max-w-full flex-shrink-0 items-center gap-1.5 rounded-md border px-2 text-sm font-medium sm:gap-2 sm:px-3",
          selectedClient
            ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        )}
      >
        <FilterIcon />
        {selectedClient && <ColorDot color={selectedClient.color} />}
        <span className="hidden min-w-0 truncate sm:inline">
          Filter{selectedClient ? `: ${selectedClient.company_name}` : ""}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">▾</span>
      </button>

      {open && (
        // Na mobilnem se meni odpira od desne proti levi (fiksno poravnan na
        // desni rob zaslona prek mobilePanelStyle), da se nikoli ne odreže ob
        // levem robu, ne glede na to, kje v vrstici stoji gumb "Filter".
        <div
          style={mobilePanelStyle}
          // Desktop (sm+): leva stran menija poravnana z levo stranjo gumba
          // "Filter" (odpira se v desno). Mobile: pozicijo prevzame
          // mobilePanelStyle (fiksno, poravnano na desni rob zaslona).
          className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40 sm:left-0 sm:right-auto"
        >
          {/* Desktop (sm+): zavihka + vsebina vedno vidna. */}
          <div className="hidden sm:block">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {(Object.keys(SECTION_LABEL) as Section[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  className={clsx(
                    "flex-1 truncate px-2 py-2 text-center text-sm font-medium",
                    section === s
                      ? "border-b-2 border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  {SECTION_LABEL[s]}
                </button>
              ))}
            </div>
            {section === "stranke" ? clientListContent : dateContent}
          </div>

          {/* Mobile: najprej seznam kategorij, šele ob kliku se odpre izbira. */}
          <div className="sm:hidden">
            {mobileSection === null ? (
              <div className="p-1">
                {(Object.keys(SECTION_LABEL) as Section[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMobileSection(s)}
                    className="flex w-full items-center justify-between rounded px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {SECTION_LABEL[s]}
                    <ChevronRightIcon />
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setMobileSection(null)}
                  className="flex w-full items-center gap-1 border-b border-gray-200 px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <ChevronLeftIcon />
                  {SECTION_LABEL[mobileSection]}
                </button>
                {mobileSection === "stranke" ? clientListContent : dateContent}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
