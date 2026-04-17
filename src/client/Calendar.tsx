import { useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventContentArg } from "@fullcalendar/core";
import type { NoticeItem, NoticeMutationInput } from "./types/domain";
import { useAppConfigSettings } from "./config/AppConfigContext";
import { ConfirmModal } from "./ConfirmModal";
import { formatDate, formatTime, TimeFormat } from "./config/appConfig";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayLocalDate() {
  return formatLocalDate(new Date());
}

function parseEventDate(value: Date | string) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value.includes("T") ? value : `${value}T00:00:00`);
}

export interface CalendarEvent {
  title: string;
  start: string;
  end?: string;
  id: string;
  completed: boolean;
}

function splitEventStart(start: string) {
  const [datePart, timePart = "09:00"] = start.split("T");
  const normalizedTime = timePart.slice(0, 5);

  return {
    date: datePart,
    time: normalizedTime,
  };
}

type CalendarProps = {
  notices: NoticeItem[];
  isLoading: boolean;
  error: string;
  onCreateNotice: (notice: {
    date: string;
    time: string;
    description: string;
  }) => Promise<void>;
  onUpdateNotice: (id: number, notice: NoticeMutationInput) => Promise<void>;
  onDeleteNotice: (id: number) => Promise<void>;
};

export default function Calendar({
  notices,
  isLoading,
  error,
  onCreateNotice,
  onUpdateNotice,
  onDeleteNotice,
}: CalendarProps) {
  const config = useAppConfigSettings();
  const calendarRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate());
  const [formData, setFormData] = useState({
    title: "",
    date: getTodayLocalDate(),
    time: "09:00",
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    date: getTodayLocalDate(),
    time: "09:00",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    eventId: string | null;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    eventId: null,
    onConfirm: async () => {},
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Formatting functions that use config
  const formatDisplayDate = (value: Date | string) => {
    const date = parseEventDate(value);
    return formatDate(date, config.dateFormat);
  };

  const formatDisplayTime = (value: Date | string) => {
    const date = parseEventDate(value);
    return formatTime(date, config.timeFormat);
  };

  const formatEventLabel = (value: string) => {
    if (value.includes("T")) {
      const date = new Date(value);
      return `${formatDisplayDate(date)} ${formatDisplayTime(date)}`;
    }

    return `${formatDisplayDate(value)} ${formatDisplayTime(new Date(`${value}T12:00:00`))}`;
  };

  const formatCalendarEventTime = (value: string) => {
    const date = parseEventDate(value);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (config.timeFormat === TimeFormat.TWENTY_FOUR_HOUR) {
      if (minutes === 0) {
        return `${hours}:00`;
      }
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    } else {
      const meridiem = hours >= 12 ? "pm" : "am";
      const normalizedHour = hours % 12 === 0 ? 12 : hours % 12;

      if (minutes === 0) {
        return `${normalizedHour}${meridiem}`;
      }

      return `${normalizedHour}:${String(minutes).padStart(2, "0")}${meridiem}`;
    }
  };

  const events: CalendarEvent[] = notices.map((notice) => ({
    id: String(notice.id),
    title: notice.description,
    start: `${notice.date}T${notice.time}:00`,
    completed: notice.completed,
  }));

  const handleDateClick = (arg: { dateStr: string }) => {
    const selectedDateStr = arg.dateStr;
    setSelectedDate(selectedDateStr);
    setFormData((prev) => ({ ...prev, date: selectedDateStr }));
  };

  const handleEventClick = (arg: { event: { start: Date | null } }) => {
    if (!arg.event.start) {
      return;
    }

    const selectedDateStr = formatLocalDate(arg.event.start);
    setSelectedDate(selectedDateStr);
    setFormData((prev) => ({ ...prev, date: selectedDateStr }));
  };

  const selectedDayEvents = useMemo(
    () =>
      events
        .filter((event) => event.start.split("T")[0] === selectedDate)
        .sort((a, b) => {
          const aTime = new Date(a.start).getTime();
          const bTime = new Date(b.start).getTime();

          if (aTime !== bTime) {
            return aTime - bTime;
          }

          return Number(a.id) - Number(b.id);
        }),
    [events, selectedDate],
  );
  const isPastDateWarning = submitError
    .toLowerCase()
    .includes("already passed");

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Please enter an event title");
      return;
    }

    try {
      setIsSaving(true);
      setSubmitError("");
      await onCreateNotice({
        date: formData.date,
        time: formData.time,
        description: formData.title.trim(),
      });
      setFormData({
        title: "",
        date: getTodayLocalDate(),
        time: "09:00",
      });
      setShowModal(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create event.";
      setSubmitError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = (id: string) => {
    const event = notices.find((n) => n.id === Number(id));
    if (!event) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete Event",
      message: `Delete "${event.description}" on ${formatDate(
        event.date,
        config.dateFormat,
      )} at ${formatTime(event.date + "T" + event.time, config.timeFormat)}?`,
      eventId: id,
      onConfirm: async () => {
        try {
          setIsConfirmLoading(true);
          setSubmitError("");
          await onDeleteNotice(Number(id));
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to delete event.";
          setSubmitError(message);
        } finally {
          setIsConfirmLoading(false);
        }
      },
    });
  };

  const startEditEvent = (event: CalendarEvent) => {
    const { date, time } = splitEventStart(event.start);

    setEditingEventId(event.id);
    setEditFormData({
      title: event.title,
      date,
      time,
    });
  };

  const cancelEditEvent = () => {
    setEditingEventId(null);
    setEditFormData({
      title: "",
      date: getTodayLocalDate(),
      time: "09:00",
    });
  };

  const saveEditEvent = async (eventId: string) => {
    if (!editFormData.title.trim()) {
      setSubmitError("Please enter an event title.");
      return;
    }

    if (!editFormData.date || !editFormData.time) {
      setSubmitError("Date and time are required.");
      return;
    }

    const existingNotice = notices.find(
      (notice) => notice.id === Number(eventId),
    );

    if (!existingNotice) {
      setSubmitError("Could not find the selected event.");
      return;
    }

    try {
      setIsUpdating(true);
      setSubmitError("");
      await onUpdateNotice(existingNotice.id, {
        ...existingNotice,
        description: editFormData.title.trim(),
        date: editFormData.date,
        time: editFormData.time,
      });
      setEditingEventId(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update event.";
      setSubmitError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleEventCompleted = async (event: CalendarEvent) => {
    const existingNotice = notices.find(
      (notice) => notice.id === Number(event.id),
    );

    if (!existingNotice) {
      setSubmitError("Could not find the selected event.");
      return;
    }

    try {
      setIsUpdating(true);
      setSubmitError("");
      await onUpdateNotice(existingNotice.id, {
        ...existingNotice,
        completed: !existingNotice.completed,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update event.";
      setSubmitError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateEventClick = () => {
    setFormData({
      title: "",
      date: selectedDate,
      time: "09:00",
    });
    setShowModal(true);
  };

  const renderEventContent = (eventInfo: EventContentArg) => (
    <span
      className={`fc-event-label-wrap ${
        eventInfo.event.extendedProps.completed ? "opacity-65" : ""
      }`}
    >
      <strong
        className={`fc-event-label-time ${
          eventInfo.event.extendedProps.completed ? "line-through" : ""
        }`}
      >
        {formatCalendarEventTime(eventInfo.event.startStr)}
      </strong>
      <span
        className={`fc-event-label-title ${
          eventInfo.event.extendedProps.completed ? "line-through" : ""
        }`}
      >
        {eventInfo.event.title}
      </span>
    </span>
  );

  return (
    <div className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="[&_.fc-selected-day]:neo-selected min-h-0 flex-1 [&_.fc-selected-day]:relative [&_.fc-selected-day_.fc-daygrid-day-number]:font-black">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            firstDay={config.firstDayOfWeek}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            dayMaxEvents={true}
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              meridiem: "short",
            }}
            eventContent={renderEventContent}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            dayCellClassNames={(arg) =>
              formatLocalDate(arg.date) === selectedDate
                ? ["fc-selected-day"]
                : []
            }
            height="100%"
          />
        </div>
      </div>

      {/* Event List */}
      <aside className="h-full min-h-0">
        <div className="flex h-full flex-col bg-transparent">
          <div className="mb-4 space-y-3">
            <button
              onClick={handleCreateEventClick}
              className="calendar-toolbar-match-button inline-flex w-full items-center justify-center gap-2 px-4 py-2"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Create Event
            </button>
            <h2 className="neo-label mt-6 flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
              Events for {formatDisplayDate(selectedDate)}
            </h2>
            {isLoading ? (
              <p className="text-sm font-semibold">Loading events...</p>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {submitError ? (
              <p
                className={
                  isPastDateWarning
                    ? "text-sm text-amber-700"
                    : "text-sm text-red-600"
                }
              >
                {submitError}
              </p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm font-semibold">
                No events for this date yet. Select a day, then click Create
                Event.
              </p>
            ) : (
              selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`neo-card overflow-hidden p-4 transition-all ${
                    event.completed
                      ? "border-emerald-200 bg-emerald-50/55"
                      : "border-slate-200 bg-white/65"
                  }`}
                >
                  {editingEventId === event.id ? (
                    <div className="w-full space-y-3">
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) =>
                          setEditFormData((previous) => ({
                            ...previous,
                            title: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm"
                        placeholder="Event title"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="date"
                          value={editFormData.date}
                          onChange={(e) =>
                            setEditFormData((previous) => ({
                              ...previous,
                              date: e.target.value,
                            }))
                          }
                          className="px-3 py-2 text-sm"
                        />
                        <input
                          type="time"
                          value={editFormData.time}
                          onChange={(e) =>
                            setEditFormData((previous) => ({
                              ...previous,
                              time: e.target.value,
                            }))
                          }
                          className="px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex justify-start gap-2">
                        <button
                          type="button"
                          onClick={cancelEditEvent}
                          className="neo-button-secondary inline-flex items-center gap-1.5 px-3 py-1 text-xs"
                          disabled={isUpdating}
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEditEvent(event.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs"
                          disabled={isUpdating}
                        >
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {isUpdating ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`border p-3 ${
                        event.completed
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-slate-200 bg-white"
                      } grid gap-3`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">
                          {formatEventLabel(event.start)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-lg leading-snug font-semibold ${
                            event.completed
                              ? "text-slate-500 line-through"
                              : "text-slate-900"
                          }`}
                        >
                          {event.title}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={event.completed}
                          onChange={() => void toggleEventCompleted(event)}
                          className="h-5 w-5 shrink-0"
                          disabled={isUpdating}
                          aria-label={
                            event.completed
                              ? "Mark event as incomplete"
                              : "Mark event as complete"
                          }
                        />
                        <button
                          type="button"
                          onClick={() => startEditEvent(event)}
                          className="neo-button-secondary inline-flex items-center gap-1 px-3 py-1 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="neo-button-danger inline-flex items-center gap-1 px-3 py-1 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
          <div className="neo-modal w-full max-w-md p-7">
            <h2 className="neo-label mb-4 flex items-center gap-2 text-xl">
              <CalendarPlus className="h-5 w-5" aria-hidden="true" />
              Add Event
            </h2>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="neo-label block text-sm">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="What is this event about?"
                  className="mt-1 block w-full px-3 py-2"
                  autoFocus
                />
              </div>
              <div>
                <label className="neo-label block text-sm">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2"
                />
              </div>
              <div>
                <label className="neo-label block text-sm">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2"
                  disabled={isSaving}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {isSaving ? "Saving..." : "Add Event"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="neo-button-secondary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous
        isLoading={isConfirmLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
