"use client";

import { useState, useTransition } from "react";
import type { Client, WorkEntryWithClient } from "@/lib/types/database.types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ColorDot } from "@/components/ui/Badge";
import { formatFullDate, formatTime } from "@/lib/utils/date";
import { deleteWorkEntryAction } from "@/actions/workEntries";
import TimeEntryForm from "./TimeEntryForm";

type DayDetailPanelProps = {
  date: Date;
  dateKey: string;
  entries: WorkEntryWithClient[];
  clients: Client[];
  onClose: () => void;
  onChanged: () => void; // pokliči po vsaki spremembi, da se osveži mesečni prikaz
};

export default function DayDetailPanel({
  date,
  dateKey,
  entries,
  clients,
  onClose,
  onChanged,
}: DayDetailPanelProps) {
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editingEntry, setEditingEntry] = useState<WorkEntryWithClient | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSaved() {
    setMode("list");
    setEditingEntry(null);
    onChanged();
  }

  function handleDelete(entry: WorkEntryWithClient) {
    if (!confirm("Izbriši ta vnos?")) return;
    setDeletingId(entry.id);
    startTransition(async () => {
      await deleteWorkEntryAction(entry.id);
      setDeletingId(null);
      onChanged();
    });
  }

  return (
    <Modal open onClose={onClose} title={formatFullDate(date)}>
      {mode === "list" && (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Ni vnosov za ta dan.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <ColorDot color={entry.clients?.color ?? "#999"} />
                      <span className="min-w-0 truncate">
                        {entry.clients?.company_name ?? "Neznana stranka"}
                      </span>
                    </div>
                    <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                      {entry.start_time || entry.end_time
                        ? `${formatTime(entry.start_time)} – ${formatTime(entry.end_time)}`
                        : "Brez določenih ur"}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingEntry(entry);
                        setMode("edit");
                      }}
                    >
                      Uredi
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending && deletingId === entry.id}
                      onClick={() => handleDelete(entry)}
                    >
                      Izbriši
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Button type="button" onClick={() => setMode("add")} className="w-full">
            + Dodaj vnos
          </Button>
        </div>
      )}

      {mode === "add" && (
        <TimeEntryForm
          dateKey={dateKey}
          clients={clients}
          onSaved={handleSaved}
          onCancel={() => setMode("list")}
        />
      )}

      {mode === "edit" && editingEntry && (
        <TimeEntryForm
          dateKey={dateKey}
          clients={clients}
          entry={editingEntry}
          onSaved={handleSaved}
          onCancel={() => {
            setMode("list");
            setEditingEntry(null);
          }}
        />
      )}
    </Modal>
  );
}
