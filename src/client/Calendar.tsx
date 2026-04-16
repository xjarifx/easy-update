import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { NoticeItem } from "./types/domain";

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

function formatCalendarEventChip(start: Date | null, title: string) {
  if (!start) {
    return title;
  }

  const hours = start.getHours();
  const minutes = String(start.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return `${displayHour}.${minutes}${suffix} ${title}`;
}

export interface CalendarEvent {
  title: string;
  start: string;
  end?: string;
  id: string;
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
  onDeleteNotice: (id: number) => Promise<void>;
};

export default function Calendar({
  notices,
  isLoading,
  error,
  onCreateNotice,
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

  const selectedDayEvents = events.filter(
    (event) => event.start.split("T")[0] === selectedDate,
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

  const handleCreateEventClick = () => {
    setFormData({
      title: "",
      date: selectedDate,
      time: "09:00",
    });
    setShowModal(true);
  };

  return (
    <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-0 flex-col gap-4">
        <div className="min-h-0 flex-1 [&_.fc-button-primary]:border-blue-600 [&_.fc-button-primary]:bg-blue-600 [&_.fc-button-primary.fc-button-active]:bg-blue-800 [&_.fc-button-primary:hover]:bg-blue-700 [&_.fc-selected-day]:relative [&_.fc-selected-day]:bg-blue-100 [&_.fc-selected-day]:ring-2 [&_.fc-selected-day]:ring-blue-500 [&_.fc-selected-day]:ring-inset [&_.fc-selected-day_.fc-daygrid-day-number]:font-bold [&_.fc-selected-day_.fc-daygrid-day-number]:text-blue-700">
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
            eventContent={(arg) =>
              formatCalendarEventChip(arg.event.start, arg.event.title)
            }
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
        <div className="flex h-full flex-col border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 space-y-3">
            <button
              onClick={handleCreateEventClick}
              className="w-full bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              + Create Event
            </button>
            <h2 className="text-lg font-semibold text-slate-900">
              Events for {formatDisplayDate(selectedDate)}
            </h2>
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading events...</p>
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
              <p className="text-slate-500">
                No events for this date yet. Click Create Event to add one.
              </p>
            ) : (
              selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border border-slate-200 bg-blue-50 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{event.title}</p>
                    <p className="text-sm text-slate-600">
                      {formatEventLabel(event.start)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Add Event Modal */}
      {showModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Add Event</h2>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Event Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter event title"
                  className="mt-1 block w-full border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="mt-1 block w-full border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  className="mt-1 block w-full border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Add Event"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
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
