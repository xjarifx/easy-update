import { useCallback, useEffect, useState } from "react";
import Calendar, { type CalendarEvent } from "./Calendar";
import "./App.css";

type Page = "input" | "notice" | "calendar" | "setting";

type InputTab = "text" | "documents" | "images";

function InputPage() {
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  const [textInput, setTextInput] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const inputTabs: { id: InputTab; label: string; description: string }[] = [
    {
      id: "text",
      label: "Text",
      description: "Paste long notes, transcripts, or draft content.",
    },
    {
      id: "documents",
      label: "Documents",
      description: "Upload PDFs, DOCX, TXT, or markdown files.",
    },
    {
      id: "images",
      label: "Images",
      description: "Attach screenshots, photos, or reference images.",
    },
  ];

  const formatFileSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDocumentUpload = (files: FileList | null) => {
    const nextDocuments = Array.from(files ?? []).filter((file) => {
      const name = file.name.toLowerCase();
      return (
        file.type.startsWith("text/") ||
        file.type === "application/pdf" ||
        name.endsWith(".doc") ||
        name.endsWith(".docx") ||
        name.endsWith(".txt") ||
        name.endsWith(".md") ||
        name.endsWith(".rtf")
      );
    });

    setDocuments((prev) => [...prev, ...nextDocuments]);
  };

  const handleImageUpload = (files: FileList | null) => {
    const nextImages = Array.from(files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );

    setImages((prev) => [...prev, ...nextImages]);
  };

  useEffect(() => {
    const previewUrls = images.map((image) => URL.createObjectURL(image));
    setImagePreviews(previewUrls);

    return () => {
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [images]);

  return (
    <section className="h-full rounded-none border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Input</h2>
      <p className="mt-1 text-sm text-slate-600">
        Capture large text, documents, and images in one workspace.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-1 shadow-sm">
            {inputTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="block">{tab.label}</span>
                <span
                  className={`block text-xs ${
                    activeTab === tab.id ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {tab.description}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === "text" && (
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Large Text Input
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste long-form notes, meeting transcripts, instructions, or draft content here..."
                    rows={14}
                    className="min-h-80 border border-slate-300 bg-white px-3 py-3 text-slate-900 ring-blue-500 outline-none focus:ring-2"
                  />
                </label>

                <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 sm:grid-cols-3">
                  <div>
                    <p className="text-xs tracking-wide text-slate-500 uppercase">
                      Characters
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {textInput.length.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-wide text-slate-500 uppercase">
                      Words
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {textInput.trim()
                        ? textInput.trim().split(/\s+/).length
                        : 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-wide text-slate-500 uppercase">
                      Best for
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      Long notes
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="grid gap-4">
                <label className="grid cursor-pointer gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 transition hover:border-blue-400 hover:bg-blue-50/40">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Drop or select documents
                    </p>
                    <p className="mt-1">
                      Supports PDF, DOC, DOCX, TXT, MD, and RTF files. Add many
                      files at once.
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.md,.rtf,text/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleDocumentUpload(e.target.files)}
                  />
                </label>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Uploaded documents
                    </p>
                    <p className="text-xs text-slate-500">
                      {documents.length} file{documents.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {documents.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No documents uploaded yet.
                      </p>
                    ) : (
                      documents.map((file, index) => (
                        <div
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDocuments((prev) =>
                                prev.filter(
                                  (_, currentIndex) => currentIndex !== index,
                                ),
                              )
                            }
                            className="shrink-0 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "images" && (
              <div className="grid gap-4">
                <label className="grid cursor-pointer gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 transition hover:border-blue-400 hover:bg-blue-50/40">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Drop or select images
                    </p>
                    <p className="mt-1">
                      Supports PNG, JPG, JPEG, WEBP, and GIF files. Add multiple
                      images for reference.
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                </label>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Image preview
                    </p>
                    <p className="text-xs text-slate-500">
                      {images.length} image{images.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {images.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No images uploaded yet.
                      </p>
                    ) : (
                      images.map((image, index) => (
                        <div
                          key={`${image.name}-${image.lastModified}-${index}`}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <img
                            src={imagePreviews[index]}
                            alt={image.name}
                            className="h-40 w-full object-cover"
                          />
                          <div className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {image.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatFileSize(image.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setImages((prev) =>
                                  prev.filter(
                                    (_, currentIndex) => currentIndex !== index,
                                  ),
                                )
                              }
                              className="shrink-0 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Input Summary</p>
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs tracking-wide text-slate-500 uppercase">
                Text
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {textInput.trim()
                  ? "Ready for processing"
                  : "No text added yet"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs tracking-wide text-slate-500 uppercase">
                Documents
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {documents.length} uploaded
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs tracking-wide text-slate-500 uppercase">
                Images
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {images.length} uploaded
              </p>
            </div>
          </div>
        </div>
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

  const loadModelsForProvider = useCallback(async () => {
    const key = apiKey.trim();
    setError("");

    if (!key) {
      setError("Please enter your API key first.");
      return;
    }

    try {
      setIsLoadingModels(true);

      const res = await fetch("/api/providers/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: key,
        }),
      });

      const payload = (await res.json()) as {
        data?: string[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(
          payload.error ?? `Request failed with status ${res.status}`,
        );
      }

      const normalizedModels = (payload.data ?? [])
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
  }, [apiKey, selectedProvider]);

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
  }, [apiKey, loadModelsForProvider]);

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
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
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

  useEffect(() => {
    let isMounted = true;

    const checkApiHealth = async () => {
      try {
        const res = await fetch("/api/health");

        if (!isMounted) {
          return;
        }

        setApiStatus(res.ok ? "online" : "offline");
      } catch {
        if (!isMounted) {
          return;
        }

        setApiStatus("offline");
      }
    };

    void checkApiHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-100">
      <div className="grid h-full w-full md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-full border-r border-slate-200 bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Easy Update
          </h1>
          <p className="mt-1 text-sm text-slate-600">Workspace</p>
          <div className="mt-3 inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
            <span
              className={`h-2 w-2 rounded-full ${
                apiStatus === "online"
                  ? "bg-emerald-500"
                  : apiStatus === "offline"
                    ? "bg-red-500"
                    : "bg-amber-500"
              }`}
            />
            API: {apiStatus}
          </div>

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
