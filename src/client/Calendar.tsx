import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { NoticeItem, NoticeMutationInput } from "./types/domain";

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

function formatDisplayDate(value: Date | string) {
  const date = parseEventDate(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

function formatDisplayTime(value: Date | string) {
  const date = parseEventDate(value);

  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatEventLabel(value: string) {
  if (value.includes("T")) {
    const date = new Date(value);
    return `${formatDisplayDate(date)} ${formatDisplayTime(date)}`;
  }

  return `${formatDisplayDate(value)} 12:00 AM`;
}

export interface CalendarEvent {
  title: string;
  start: string;
  end?: string;
  id: string;
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

  const events: CalendarEvent[] = notices.map((notice) => ({
    id: String(notice.id),
    title: notice.description,
    start: `${notice.date}T${notice.time}:00`,
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

  const handleDeleteEvent = async (id: string) => {
    const shouldDelete = window.confirm("Delete this event?");

    if (!shouldDelete) {
      return;
    }

    try {
      setSubmitError("");
      await onDeleteNotice(Number(id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete event.";
      setSubmitError(message);
    }
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

  const handleCreateEventClick = () => {
    setFormData({
      title: "",
      date: selectedDate,
      time: "09:00",
    });
    setShowModal(true);
  };

  return (
    <div className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="[&_.fc-selected-day]:neo-selected min-h-0 flex-1 [&_.fc-selected-day]:relative [&_.fc-selected-day_.fc-daygrid-day-number]:font-black">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
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
              className="w-full px-4 py-2"
            >
              + Create Event
            </button>
            <h2 className="neo-label text-lg">
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
                No events for this date yet. Click Create Event to add one.
              </p>
            ) : (
              selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="border border-slate-200 bg-transparent p-3"
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
                          className="neo-button-secondary px-3 py-1 text-xs"
                          disabled={isUpdating}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEditEvent(event.id)}
                          className="px-3 py-1 text-xs"
                          disabled={isUpdating}
                        >
                          {isUpdating ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-2">
                      <p className="text-sm font-semibold">
                        {formatEventLabel(event.start)}
                      </p>
                      <p className="neo-label">{event.title}</p>
                      <div className="flex justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => startEditEvent(event)}
                          className="neo-button-secondary px-2 py-0.5 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="neo-button-danger-ghost px-2 py-0.5 text-xs"
                        >
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
            <h2 className="neo-label mb-4 text-xl">Add Event</h2>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="neo-label block text-sm">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter event title"
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
                  className="flex-1 px-4 py-2"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Add Event"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="neo-button-secondary flex-1 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
