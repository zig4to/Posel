"use client";

import { useState, useTransition } from "react";
import type {
  CalendarEvent,
  Client,
  Leave,
  WorkEntryWithClient,
} from "@/lib/types/database.types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ColorDot } from "@/components/ui/Badge";
import { formatFullDate, formatShortDate, formatTime } from "@/lib/utils/date";
import { deleteWorkEntryAction } from "@/actions/workEntries";
import { deleteEventAction } from "@/actions/events";
import { deleteLeaveAction } from "@/actions/leaves";
import TimeEntryForm from "./TimeEntryForm";
import EventForm from "./EventForm";
import LeaveForm from "./LeaveForm";
import EventIcon from "./EventIcon";
import EditIcon from "./EditIcon";

const EDIT_BUTTON_CLASS =
  "-mr-1 flex-shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300";

type DayDetailPanelProps = {
  date: Date;
  dateKey: string;
  entries: WorkEntryWithClient[];
  events: CalendarEvent[];
  leaves: Leave[];
  clients: Client[];
  onClose: () => void;
  onChanged: () => void; // pokliči po vsaki spremembi, da se osveži mesečni prikaz
};

type Mode =
  | "list"
  | "choose"
  | "add"
  | "edit"
  | "add-event"
  | "edit-event"
  | "add-leave"
  | "edit-leave";

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Brez določenih ur";
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export default function DayDetailPanel({
  date,
  dateKey,
  entries,
  events,
  leaves,
  clients,
  onClose,
  onChanged,
}: DayDetailPanelProps) {
  const [mode, setMode] = useState<Mode>("list");
  const [editingEntry, setEditingEntry] = useState<WorkEntryWithClient | null>(
    null
  );
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSaved() {
    setMode("list");
    setEditingEntry(null);
    setEditingEvent(null);
    setEditingLeave(null);
    onChanged();
  }

  function backToList() {
    setMode("list");
    setEditingEntry(null);
    setEditingEvent(null);
    setEditingLeave(null);
  }

  function handleDeleteEntry(entry: WorkEntryWithClient) {
    if (!confirm("Izbriši ta vnos?")) return;
    setDeletingId(entry.id);
    startTransition(async () => {
      await deleteWorkEntryAction(entry.id);
      setDeletingId(null);
      backToList();
      onChanged();
    });
  }

  function handleDeleteEvent(event: CalendarEvent) {
    if (!confirm("Izbriši ta dogodek?")) return;
    setDeletingId(event.id);
    startTransition(async () => {
      await deleteEventAction(event.id);
      setDeletingId(null);
      backToList();
      onChanged();
    });
  }

  function handleDeleteLeave(leave: Leave) {
    if (!confirm("Izbriši ta dopust?")) return;
    setDeletingId(leave.id);
    startTransition(async () => {
      await deleteLeaveAction(leave.id);
      setDeletingId(null);
      backToList();
      onChanged();
    });
  }

  return (
    <Modal open onClose={onClose} title={formatFullDate(date)}>
      {mode === "list" && (
        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Dogodki
            </h3>
            {events.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ni dogodkov za ta dan.
              </p>
            ) : (
              <ul className="space-y-2">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <EventIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                        <span className="min-w-0 break-words">{event.title}</span>
                      </div>
                      <p className="mt-0.5 break-words text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeRange(event.start_time, event.end_time)}
                        {event.note ? ` · ${event.note}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Uredi dogodek"
                      title="Uredi"
                      className={EDIT_BUTTON_CLASS}
                      onClick={() => {
                        setEditingEvent(event);
                        setMode("edit-event");
                      }}
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Stranke
            </h3>
            {entries.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ni vnosov za ta dan.
              </p>
            ) : (
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <ColorDot color={entry.clients?.color ?? "#999"} />
                        <span className="min-w-0 truncate">
                          {entry.clients?.company_name ?? "Neznan partner"}
                        </span>
                      </div>
                      <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeRange(entry.start_time, entry.end_time)}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Uredi vnos"
                      title="Uredi"
                      className={EDIT_BUTTON_CLASS}
                      onClick={() => {
                        setEditingEntry(entry);
                        setMode("edit");
                      }}
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {leaves.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Dopusti
              </h3>
              <ul className="space-y-2">
                {leaves.map((leave) => (
                  <li
                    key={leave.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <ColorDot color={leave.color} />
                        <span className="min-w-0 truncate">{leave.title}</span>
                      </div>
                      <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                        Dopust: {formatShortDate(leave.start_date)} –{" "}
                        {formatShortDate(leave.end_date)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditingLeave(leave);
                          setMode("edit-leave");
                        }}
                      >
                        Uredi
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={pending && deletingId === leave.id}
                        onClick={() => handleDeleteLeave(leave)}
                      >
                        Izbriši
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button
            type="button"
            onClick={() => setMode("choose")}
            className="w-full"
          >
            + Dodaj
          </Button>
        </div>
      )}

      {mode === "choose" && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kaj želiš dodati?
          </p>
          <Button
            type="button"
            onClick={() => setMode("add-event")}
            className="w-full"
          >
            Dogodek
          </Button>
          <Button
            type="button"
            onClick={() => setMode("add")}
            className="w-full"
          >
            Vnos stranke
          </Button>
          <Button
            type="button"
            onClick={() => setMode("add-leave")}
            className="w-full"
          >
            Dopust
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setMode("list")}
            className="w-full"
          >
            Prekliči
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
          onDelete={() => handleDeleteEntry(editingEntry)}
          onCancel={backToList}
        />
      )}

      {mode === "add-event" && (
        <EventForm
          dateKey={dateKey}
          onSaved={handleSaved}
          onCancel={() => setMode("list")}
        />
      )}

      {mode === "edit-event" && editingEvent && (
        <EventForm
          dateKey={dateKey}
          event={editingEvent}
          onSaved={handleSaved}
          onDelete={() => handleDeleteEvent(editingEvent)}
          onCancel={backToList}
        />
      )}

      {mode === "add-leave" && (
        <LeaveForm
          dateKey={dateKey}
          onSaved={handleSaved}
          onCancel={() => setMode("list")}
        />
      )}

      {mode === "edit-leave" && editingLeave && (
        <LeaveForm
          dateKey={dateKey}
          leave={editingLeave}
          onSaved={handleSaved}
          onCancel={() => {
            setMode("list");
            setEditingLeave(null);
          }}
        />
      )}
    </Modal>
  );
}
