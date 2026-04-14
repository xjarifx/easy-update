import { useEffect, useState } from "react";
import Calendar, { type CalendarEvent } from "./Calendar";
import "./App.css";

type Page = "input" | "notice" | "calendar" | "setting";

function InputPage() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  return (
    <section className="h-full rounded-none border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Input</h2>
      <p className="mt-1 text-sm text-slate-600">
        Capture quick information for your workflow.
      </p>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            className="border border-slate-300 px-3 py-2 text-slate-900 ring-blue-500 outline-none focus:ring-2"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Details
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add details"
            rows={5}
            className="border border-slate-300 px-3 py-2 text-slate-900 ring-blue-500 outline-none focus:ring-2"
          />
        </label>
      </div>

      <div className="mt-5 border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">Preview</p>
        <p className="mt-2 text-sm text-slate-900">{title || "No title yet"}</p>
        <p className="mt-1 text-sm text-slate-600">
          {details || "No details yet"}
        </p>
      </div>
    </section>
  );
}

function getTodayLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

interface NoticePageProps {
  events: CalendarEvent[];
}

function NoticePage({ events }: NoticePageProps) {
  const parseEventDate = (value: Date | string) => {
    if (value instanceof Date) {
      return value;
    }

    return new Date(value.includes("T") ? value : `${value}T00:00:00`);
  };

  const formatDisplayDate = (value: Date | string) => {
    const date = parseEventDate(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  const formatDisplayTime = (value: string) => {
    const date = parseEventDate(value);

    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getEventDate = (value: string) => {
    return formatDisplayDate(value);
  };

  const getEventTime = (value: string) => {
    return value.includes("T") ? formatDisplayTime(value) : "12:00 AM";
  };

  return (
    <section className="h-full rounded-none border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Notice</h2>
      <p className="mt-1 text-sm text-slate-600">
        All events are shown in ascending date and time order.
      </p>

      <div className="mt-5">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No events available yet.</p>
        ) : (
          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="grid grid-cols-[140px_120px_minmax(0,1fr)] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-600 uppercase">
              <div>Date</div>
              <div>Time</div>
              <div>Event</div>
            </div>
            <div className="divide-y divide-slate-200">
              {events
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.start).getTime() - new Date(b.start).getTime(),
                )
                .map((event) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-[140px_120px_minmax(0,1fr)] items-center px-4 py-3 text-sm text-slate-800"
                  >
                    <div className="font-medium text-slate-900">
                      {getEventDate(event.start)}
                    </div>
                    <div>{getEventTime(event.start)}</div>
                    <div className="truncate">{event.title}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SettingPage() {
  type ProviderId = "openrouter" | "openai" | "anthropic" | "google";

  const providerOptions: { id: ProviderId; label: string }[] = [
    { id: "openrouter", label: "OpenRouter" },
    { id: "openai", label: "OpenAI" },
    { id: "anthropic", label: "Anthropic" },
    { id: "google", label: "Google" },
  ];

  const [selectedProvider, setSelectedProvider] =
    useState<ProviderId>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState("");

  const loadModelsForProvider = async () => {
    const key = apiKey.trim();
    setError("");

    if (!key) {
      setError("Please enter your API key first.");
      return;
    }

    try {
      setIsLoadingModels(true);

      let models: string[] = [];

      if (selectedProvider === "openrouter") {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "Easy Update",
          },
        });

        if (!res.ok) {
          throw new Error(
            `OpenRouter request failed with status ${res.status}`,
          );
        }

        const payload = (await res.json()) as {
          data?: Array<{ id: string }>;
        };
        models = (payload.data ?? []).map((item) => item.id);
      }

      if (selectedProvider === "openai") {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${key}`,
          },
        });

        if (!res.ok) {
          throw new Error(`OpenAI request failed with status ${res.status}`);
        }

        const payload = (await res.json()) as {
          data?: Array<{ id: string }>;
        };
        models = (payload.data ?? []).map((item) => item.id);
      }

      if (selectedProvider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
        });

        if (!res.ok) {
          throw new Error(`Anthropic request failed with status ${res.status}`);
        }

        const payload = (await res.json()) as {
          data?: Array<{ id: string }>;
        };
        models = (payload.data ?? []).map((item) => item.id);
      }

      if (selectedProvider === "google") {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        );

        if (!res.ok) {
          throw new Error(`Google request failed with status ${res.status}`);
        }

        const payload = (await res.json()) as {
          models?: Array<{ name: string }>;
        };
        models = (payload.models ?? []).map((item) => item.name);
      }

      const normalizedModels = models
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setAvailableModels(normalizedModels);
      setSelectedModel(normalizedModels[0] ?? "");

      if (normalizedModels.length === 0) {
        setError("No models returned for this provider and API key.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch models.";
      setAvailableModels([]);
      setSelectedModel("");
      setError(message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    const key = apiKey.trim();

    if (!key) {
      setAvailableModels([]);
      setSelectedModel("");
      setError("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadModelsForProvider();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [apiKey, selectedProvider]);

  return (
    <section className="h-full border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Setting</h2>
      <p className="mt-1 text-sm text-slate-600">
        Configure app preferences and workflow defaults.
      </p>

      <div className="mt-5 grid gap-3 text-sm text-slate-800">
        <div className="border border-slate-200 bg-slate-50 p-3">
          Date format: DD-MMM-YYYY
        </div>
        <div className="border border-slate-200 bg-slate-50 p-3">
          Time format: hh:mm AM/PM
        </div>
        <div className="border border-slate-200 bg-slate-50 p-3">
          Font: JetBrains Mono
        </div>
      </div>

      <div className="mt-8 border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-semibold text-slate-900">API Key</h3>
        <p className="mt-1 text-sm text-slate-600">
          Step 1: choose your provider. Step 2: paste that provider&apos;s API
          key. Step 3: load and select a model available for that key.
        </p>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Provider (Choose One)
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value as ProviderId);
                setAvailableModels([]);
                setSelectedModel("");
                setError("");
              }}
              className="border border-slate-300 bg-white px-3 py-2 text-slate-900 ring-blue-500 outline-none focus:ring-2"
            >
              {providerOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            API Key (For Selected Provider)
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                selectedProvider === "openrouter"
                  ? "sk-or-v1-..."
                  : `Enter ${selectedProvider} key`
              }
              className="border border-slate-300 px-3 py-2 text-slate-900 ring-blue-500 outline-none focus:ring-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            AI Model (Available for This Key)
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="border border-slate-300 bg-white px-3 py-2 text-slate-900 ring-blue-500 outline-none focus:ring-2"
              disabled={availableModels.length === 0}
            >
              {availableModels.length === 0 ? (
                <option value="">No models loaded</option>
              ) : (
                availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              )}
            </select>
          </label>

          {isLoadingModels ? (
            <p className="text-xs text-slate-500">Loading models...</p>
          ) : null}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [activePage, setActivePage] = useState<Page>("calendar");
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: "1",
      title: "Event 1",
      start: `${getTodayLocalDate()}T09:00:00`,
    },
  ]);

  const navItems: { id: Page; label: string }[] = [
    { id: "input", label: "Input" },
    { id: "notice", label: "Notice" },
    { id: "calendar", label: "Calendar" },
    { id: "setting", label: "Setting" },
  ];

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-100">
      <div className="grid h-full w-full md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-full border-r border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Easy Update
          </h1>
          <p className="mt-1 text-sm text-slate-600">Workspace</p>

          <nav className="mt-5 grid gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`px-3 py-2 text-left text-sm font-medium transition ${
                  activePage === item.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 overflow-auto p-4 md:p-6">
          {activePage === "input" && <InputPage />}
          {activePage === "notice" && <NoticePage events={events} />}
          {activePage === "calendar" && (
            <Calendar events={events} setEvents={setEvents} />
          )}
          {activePage === "setting" && <SettingPage />}
        </section>
      </div>
    </main>
  );
}

export default App;
