"use client";

import { useState } from "react";
import CalendarSnapshot from "@/components/settings/CalendarSnapshot";

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function CalendarSnapshotCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Slika koledarja
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Prenesi sliko izbranega meseca — obarvana obroba pomeni dan z vnosom v
            koledarju, siva obroba pomeni prazen dan.
          </p>
        </div>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div className="mt-4">
          <CalendarSnapshot />
        </div>
      )}
    </div>
  );
}
