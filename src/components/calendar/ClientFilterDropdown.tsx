"use client";

import { useEffect, useRef, useState } from "react";
import type { Client } from "@/lib/types/database.types";
import { ColorDot } from "@/components/ui/Badge";
import clsx from "@/lib/utils/clsx";

type ClientFilterDropdownProps = {
  clients: Client[];
  selectedClientId: string | null;
  onChange: (clientId: string | null) => void;
};

export default function ClientFilterDropdown({
  clients,
  selectedClientId,
  onChange,
}: ClientFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex max-w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
          selectedClient
            ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        )}
      >
        {selectedClient && <ColorDot color={selectedClient.color} />}
        <span className="min-w-0 truncate">
          Filter{selectedClient ? `: ${selectedClient.company_name}` : ""}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40 sm:left-auto sm:right-0">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={clsx(
              "flex w-full items-center rounded px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700",
              !selectedClientId
                ? "font-medium text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-200"
            )}
          >
            Vse stranke
          </button>
          {clients.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">Ni strank.</p>
          )}
          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => {
                onChange(client.id);
                setOpen(false);
              }}
              className={clsx(
                "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700",
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
      )}
    </div>
  );
}
