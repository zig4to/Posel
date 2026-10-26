"use client";

import { useId, useState } from "react";
import clsx from "@/lib/utils/clsx";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Zložljiv razdelek: glava z naslovom in povzetkom (npr. znesek) na desni,
 * klik odpre/zapre vsebino. `nested` = manjša različica za podrazdelke.
 */
export default function Collapsible({
  title,
  summary,
  defaultOpen = false,
  nested = false,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  nested?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div
      className={clsx(
        "rounded-md border",
        nested
          ? "border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/30"
          : "border-gray-200 dark:border-gray-800"
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex w-full items-center gap-2 text-left",
          nested ? "px-3 py-2" : "px-3 py-2.5"
        )}
      >
        <ChevronDownIcon
          className={clsx(
            "h-4 w-4 flex-shrink-0 text-gray-400 transition-transform dark:text-gray-500",
            !open && "-rotate-90"
          )}
        />
        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </span>
        {summary != null && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{summary}</span>
        )}
      </button>
      {open && (
        <div id={contentId} className="space-y-3 px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}
