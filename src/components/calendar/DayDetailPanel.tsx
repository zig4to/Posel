"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type {
  CalendarEvent,
  Client,
  Leave,
  ProjectWithClient,
} from "@/lib/types/database.types";
import { formatHours } from "@/lib/utils/projectCosts";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ColorDot } from "@/components/ui/Badge";
import { formatFullDate, formatShortDate, formatTime } from "@/lib/utils/date";
import { deleteEventAction } from "@/actions/events";
import { deleteLeaveAction } from "@/actions/leaves";
import { moveProjectDayAction, removeProjectDayAction } from "@/actions/projects";
import { Input } from "@/components/ui/Input";
import ProjectDayForm from "./ProjectDayForm";
import EventForm from "./EventForm";
import LeaveForm from "./LeaveForm";
import EventIcon from "./EventIcon";
import EditIcon from "./EditIcon";

const EDIT_BUTTON_CLASS =
  "-mr-1 flex-shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300";

type DayDetailPanelProps = {
  date: Date;
  dateKey: string;
  events: CalendarEvent[];
  /** Projekti, ki vključujejo ta dan - edini vir dela strank na koledarju. */
  projects: ProjectWithClient[];
  leaves: Leave[];
  clients: Client[];
  onClose: () => void;
  onChanged: () => void; // pokliči po vsaki spremembi, da se osveži mesečni prikaz
};

type Mode =
  | "list"
  | "choose"
  | "add"
  | "add-event"
  | "edit-event"
  | "add-leave"
  | "edit-leave";

// Lucide "arrow-right-left" - prestavi dan.
function MoveIcon({ className }: { className?: string }) {
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
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Brez določenih ur";
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export default function DayDetailPanel({
  date,
  dateKey,
  events,
  projects,
  leaves,
  clients,
  onClose,
  onChanged,
}: DayDetailPanelProps) {
  const [mode, setMode] = useState<Mode>("list");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Prestavitev dneva projekta (vrstica, ki je trenutno odprta za prestavitev).
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState(dateKey);
  const [moveError, setMoveError] = useState<string | null>(null);

  function handleMoveProjectDay(projectId: string) {
    setMoveError(null);
    if (!moveTarget) {
      setMoveError("Izberi datum.");
      return;
    }
    startTransition(async () => {
      const result = await moveProjectDayAction(projectId, dateKey, moveTarget);
      if (result.error) {
        setMoveError(result.error);
        return;
      }
      setMovingProjectId(null);
      onChanged();
    });
  }

  function handleRemoveProjectDay(project: ProjectWithClient) {
    if (!confirm(`Odstraniti ta dan iz projekta "${project.name}"?`)) return;
    setMoveError(null);
    startTransition(async () => {
      const result = await removeProjectDayAction(project.id, dateKey);
      if (result.error) {
        setMoveError(result.error);
        return;
      }
      setMovingProjectId(null);
      onChanged();
    });
  }

  function handleSaved() {
    setMode("list");
    setEditingEvent(null);
    setEditingLeave(null);
    onChanged();
  }

  function backToList() {
    setMode("list");
    setEditingEvent(null);
    setEditingLeave(null);
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
              Projekti
            </h3>
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ni projektov za ta dan.
              </p>
            ) : (
              <ul className="space-y-2">
                {projects.map((project) => {
                  const hours = project.day_hours?.[dateKey];
                  const time = project.day_times?.[dateKey];
                  const dayNote = project.day_notes?.[dateKey];
                  const details = [
                    time && (time.start || time.end)
                      ? formatTimeRange(time.start, time.end)
                      : null,
                    hours ? formatHours(hours) : null,
                    dayNote || null,
                  ].filter(Boolean);
                  return (
                    <li
                      key={project.id}
                      className="rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                            <ColorDot color={project.clients?.color ?? "#999"} />
                            <span className="min-w-0 truncate">
                              {project.clients?.company_name ?? "Neznan partner"}
                            </span>
                          </div>
                          <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                            Projekt: {project.name}
                          </p>
                          {details.length > 0 && (
                            <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                              {details.join(" · ")}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label="Prestavi ali odstrani dan projekta"
                          title="Prestavi / odstrani dan"
                          className={EDIT_BUTTON_CLASS}
                          onClick={() => {
                            setMovingProjectId(
                              movingProjectId === project.id ? null : project.id
                            );
                            setMoveTarget(dateKey);
                            setMoveError(null);
                          }}
                        >
                          <MoveIcon className="h-4 w-4" />
                        </button>
                        {/* Projekt se ureja na svoji strani - dnevi na koledarju
                            so izpeljani iz projekta, ne ločeni vnosi. */}
                        <Link
                          href={`/projekti/${project.id}/uredi`}
                          aria-label="Uredi projekt"
                          title="Uredi projekt"
                          className={EDIT_BUTTON_CLASS}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Link>
                      </div>
                      {movingProjectId === project.id && (
                        <div className="mt-2 space-y-2 border-t border-gray-100 pt-2 dark:border-gray-800">
                          <label
                            htmlFor={`move-${project.id}`}
                            className="block text-xs font-medium text-gray-600 dark:text-gray-400"
                          >
                            Prestavi ta dan na
                          </label>
                          <Input
                            id={`move-${project.id}`}
                            type="date"
                            value={moveTarget}
                            onChange={(e) => setMoveTarget(e.target.value)}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Prestavijo se tudi čas, ure, km in opomba tega dne.
                          </p>
                          {moveError && (
                            <p className="text-xs text-red-600 dark:text-red-400">{moveError}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              className="h-8 text-xs"
                              disabled={pending || moveTarget === dateKey}
                              onClick={() => handleMoveProjectDay(project.id)}
                            >
                              {pending ? "Prestavljam …" : "Prestavi"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-8 text-xs"
                              disabled={pending}
                              onClick={() => setMovingProjectId(null)}
                            >
                              Prekliči
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              className="ml-auto h-8 text-xs"
                              disabled={pending}
                              onClick={() => handleRemoveProjectDay(project)}
                            >
                              Odstrani dan
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
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
            Dan projekta
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
        <ProjectDayForm
          dateKey={dateKey}
          clients={clients}
          onSaved={handleSaved}
          onCancel={() => setMode("list")}
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
