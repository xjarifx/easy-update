import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Eraser,
  FilePlus2,
  KeyRound,
  Mic,
  MicOff,
  Paperclip,
  Pencil,
  Play,
  Settings2,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import Calendar from "./Calendar";
import { SettingsPanel } from "./SettingsPanel";
import { apiRequest } from "./api/http";
import { extractAndCreateEvents } from "./api/events";
import { fetchProviderModels } from "./api/providers";
import {
  createNotice as createNoticeRequest,
  deleteNotice as deleteNoticeRequest,
  fetchNotices,
  updateNotice as updateNoticeRequest,
} from "./api/notices";
import type {
  NoticeItem,
  NoticeMutationInput,
  ProviderId,
} from "./types/domain";
import { useAppConfigSettings } from "./config/AppConfigContext";
import { formatDate, formatTime } from "./config/appConfig";
import "./App.css";

type Page = "input" | "notice" | "calendar" | "setting";

type EncryptedValue = {
  iv: string;
  data: string;
};

type SavedApiSettings = {
  provider: ProviderId;
  apiKey: EncryptedValue;
  selectedModel: string;
};

const PROVIDER_OPTIONS: Array<{ id: ProviderId; label: string }> = [
  { id: "openrouter", label: "OpenRouter" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
];

const PROVIDER_LABEL_BY_ID: Record<ProviderId, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

const SETTINGS_STORAGE_KEY = "easy-update.settings.v1";
const ACTIVE_PAGE_STORAGE_KEY = "easy-update.active-page.v1";
const ENCRYPTION_SECRET_KEY = "easy-update.settings.secret";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const validPages: Page[] = ["input", "notice", "calendar", "setting"];

function readSavedActivePage() {
  const storedPage = window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);

  if (storedPage && validPages.includes(storedPage as Page)) {
    return storedPage as Page;
  }

  return "calendar";
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = window.atob(base64);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getEncryptionKey() {
  const storedSecret = window.localStorage.getItem(ENCRYPTION_SECRET_KEY);
  let secret = storedSecret;

  if (!secret) {
    const generatedSecret = window.crypto.getRandomValues(new Uint8Array(32));
    secret = bytesToBase64(generatedSecret);
    window.localStorage.setItem(ENCRYPTION_SECRET_KEY, secret);
  }

  return window.crypto.subtle.importKey(
    "raw",
    base64ToBytes(secret),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptValue(value: string): Promise<EncryptedValue> {
  const key = await getEncryptionKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(value),
  );

  return {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encryptedBuffer)),
  };
}

async function decryptValue(payload: EncryptedValue): Promise<string> {
  const key = await getEncryptionKey();
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.data),
  );

  return textDecoder.decode(decryptedBuffer);
}

function readSavedSettings() {
  const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as SavedApiSettings;
  } catch {
    return null;
  }
}

async function saveEncryptedSettings(settings: {
  provider: ProviderId;
  apiKey: string;
  selectedModel: string;
}) {
  if (!settings.apiKey.trim()) {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return;
  }

  const encryptedApiKey = await encryptValue(settings.apiKey.trim());
  const payload: SavedApiSettings = {
    provider: settings.provider,
    apiKey: encryptedApiKey,
    selectedModel: settings.selectedModel,
  };

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
}

type InputPageProps = {
  onEventsCreated?: () => Promise<void> | void;
  onUpdateRecentEvent?: (
    id: number,
    notice: NoticeMutationInput,
  ) => Promise<void>;
  onDeleteRecentEvent?: (id: number) => Promise<void>;
};

function InputPage({
  onEventsCreated,
  onUpdateRecentEvent,
  onDeleteRecentEvent,
}: InputPageProps) {
  const config = useAppConfigSettings();
  const [textInput, setTextInput] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [processStatus, setProcessStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentEvents, setRecentEvents] = useState<NoticeItem[]>([]);
  const [editingRecentEventId, setEditingRecentEventId] = useState<
    number | null
  >(null);
  const [recentEventDraft, setRecentEventDraft] = useState({
    description: "",
    date: "",
    time: "",
  });
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const processAbortControllerRef = useRef<AbortController | null>(null);

  const speechRecognitionWindow = window as Window & {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  };
  const SpeechRecognitionConstructor =
    speechRecognitionWindow.SpeechRecognition ??
    speechRecognitionWindow.webkitSpeechRecognition;
  const isVoiceSupported = Boolean(SpeechRecognitionConstructor);

  const handleFileUpload = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    const nextDocuments = selectedFiles.filter((file) => {
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
    const nextImages = selectedFiles.filter((file) =>
      file.type.startsWith("image/"),
    );

    setDocuments((prev) => [...prev, ...nextDocuments]);
    setImages((prev) => [...prev, ...nextImages]);
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const stopVoiceRecognition = () => {
    speechRecognitionRef.current?.stop?.();
    speechRecognitionRef.current = null;
    setIsListening(false);
  };

  const clearAllInputs = () => {
    setTextInput("");
    setDocuments([]);
    setImages([]);
    setProcessStatus("");
    setRecentEvents([]);
    setEditingRecentEventId(null);
  };

  const startRecentEventEdit = (event: NoticeItem) => {
    setEditingRecentEventId(event.id);
    setRecentEventDraft({
      description: event.description,
      date: event.date,
      time: event.time,
    });
  };

  const cancelRecentEventEdit = () => {
    setEditingRecentEventId(null);
  };

  const saveRecentEventEdit = async (event: NoticeItem) => {
    if (!recentEventDraft.description.trim()) {
      setProcessStatus("Description is required.");
      return;
    }

    if (!recentEventDraft.date || !recentEventDraft.time) {
      setProcessStatus("Date and time are required.");
      return;
    }

    try {
      await onUpdateRecentEvent?.(event.id, {
        description: recentEventDraft.description.trim(),
        date: recentEventDraft.date,
        time: recentEventDraft.time,
        completed: event.completed,
      });

      setRecentEvents((previous) =>
        previous.map((item) =>
          item.id === event.id
            ? {
                ...item,
                description: recentEventDraft.description.trim(),
                date: recentEventDraft.date,
                time: recentEventDraft.time,
              }
            : item,
        ),
      );
      setEditingRecentEventId(null);
      setProcessStatus("Event updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update event.";
      setProcessStatus(`Update failed: ${message}`);
    }
  };

  const deleteRecentEvent = async (event: NoticeItem) => {
    const shouldDelete = window.confirm(
      `Delete event "${event.description}" on ${event.date} ${event.time}?`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await onDeleteRecentEvent?.(event.id);
      setRecentEvents((previous) =>
        previous.filter((item) => item.id !== event.id),
      );
      if (editingRecentEventId === event.id) {
        setEditingRecentEventId(null);
      }
      setProcessStatus("Event deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete event.";
      setProcessStatus(`Delete failed: ${message}`);
    }
  };

  const handleCancelProcess = () => {
    processAbortControllerRef.current?.abort();
    processAbortControllerRef.current = null;
    setIsProcessing(false);
    setProcessStatus("Processing cancelled.");
  };

  const handleVoiceModeToggle = () => {
    if (!isVoiceSupported || !SpeechRecognitionConstructor) {
      return;
    }

    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    const recognition = new SpeechRecognitionConstructor();

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (!transcript) {
        return;
      }

      setTextInput((previous) => {
        const next = previous.trim();

        return next ? `${next} ${transcript}` : transcript;
      });
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      speechRecognitionRef.current = null;
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      speechRecognitionRef.current = null;
      setIsListening(false);
    }
  };

  const handleProcess = async () => {
    const trimmedText = textInput.trim();

    if (!trimmedText) {
      setProcessStatus(
        "Add or dictate your event details first, then click Process.",
      );
      return;
    }

    const savedSettings = readSavedSettings();

    if (!savedSettings?.selectedModel) {
      setProcessStatus(
        "Before processing, open Setting and complete API setup (provider, API key, and model).",
      );
      return;
    }

    setIsProcessing(true);
    setProcessStatus(
      "Processing your input: extracting event details and creating events...",
    );
    setRecentEvents([]);
    setEditingRecentEventId(null);
    const abortController = new AbortController();
    processAbortControllerRef.current = abortController;

    try {
      const decryptedApiKey = await decryptValue(savedSettings.apiKey);

      if (!decryptedApiKey.trim()) {
        setProcessStatus(
          "Your saved API key is empty. Go to Setting and enter a valid API key.",
        );
        return;
      }

      const response = await extractAndCreateEvents({
        provider: savedSettings.provider,
        model: savedSettings.selectedModel,
        apiKey: decryptedApiKey,
        inputText: trimmedText,
        signal: abortController.signal,
      });

      const createdCount = response.createdCount ?? 0;
      const failedCount = response.failedCount ?? 0;
      setRecentEvents(response.events ?? []);
      setProcessStatus(
        failedCount > 0
          ? `Created ${createdCount} event${createdCount === 1 ? "" : "s"}. ${failedCount} event${failedCount === 1 ? "" : "s"} were skipped.`
          : `Created ${createdCount} event${createdCount === 1 ? "" : "s"}.`,
      );

      if (createdCount > 0) {
        await onEventsCreated?.();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setProcessStatus("Processing cancelled.");
        return;
      }

      const message =
        error instanceof Error ? error.message : "Failed to process text.";
      setProcessStatus(`Processing failed: ${message}`);
    } finally {
      if (processAbortControllerRef.current === abortController) {
        processAbortControllerRef.current = null;
      }
      setIsProcessing(false);
    }

    if (documents.length > 0 || images.length > 0) {
      setProcessStatus(
        (previous) =>
          `${previous} Files are attached and ready for the next extraction flow.`,
      );
    }
  };

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.abort?.();
    };
  }, []);

  return (
    <div
      className="relative h-full overflow-hidden p-4 sm:p-6"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleFileUpload(event.dataTransfer.files);
      }}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.rtf,image/*"
              className="hidden"
              onChange={(event) => handleFileUpload(event.target.files)}
            />

            <label className="flex min-h-0 flex-1 flex-col gap-2">
              <textarea
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                placeholder="Paste or dictate notes (meeting recap, message, or schedule) to turn them into events."
                className="h-full min-h-128 w-full flex-1 resize-none px-4 py-4 text-base leading-7"
              />
              <p className="text-xs font-semibold text-slate-600">
                How it works: 1) Add text, 2) optionally attach files or use
                voice, 3) click Process to create events.
              </p>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBrowseFiles}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm"
                >
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  Add files
                </button>

                <button
                  type="button"
                  onClick={handleVoiceModeToggle}
                  disabled={!isVoiceSupported}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm ${
                    isListening
                      ? "bg-amber-300"
                      : isVoiceSupported
                        ? ""
                        : "cursor-not-allowed bg-zinc-300"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isListening ? "Stop recording" : "Use voice"}
                </button>

                <button
                  type="button"
                  onClick={clearAllInputs}
                  className="neo-button-secondary inline-flex items-center gap-2 px-4 py-3 text-sm"
                >
                  <Eraser className="h-4 w-4" aria-hidden="true" />
                  Clear all
                </button>
              </div>

              <button
                type="button"
                onClick={isProcessing ? handleCancelProcess : handleProcess}
                className={`inline-flex items-center justify-center px-7 py-3 text-sm ${isProcessing ? "neo-button-danger" : ""}`}
                disabled={
                  !isProcessing &&
                  !textInput.trim() &&
                  documents.length === 0 &&
                  images.length === 0
                }
              >
                {isProcessing ? (
                  <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {isProcessing ? "Cancel" : "Process input"}
              </button>
            </div>

            {processStatus ? (
              <p className="text-sm leading-6">{processStatus}</p>
            ) : null}
          </div>

          {recentEvents.length > 0 ? (
            <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="neo-label text-sm">
                    Events created in this run
                  </p>
                  <p className="text-xs font-semibold">
                    {recentEvents.length} event
                    {recentEvents.length === 1 ? "" : "s"} created from your
                    latest input.
                  </p>
                </div>
                <span className="neo-pill text-xs">{recentEvents.length}</span>
              </div>

              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border border-slate-200 bg-white px-4 py-3"
                  >
                    {editingRecentEventId === event.id ? (
                      <div className="space-y-3">
                        <label className="neo-label grid gap-1 text-xs tracking-wide uppercase">
                          Title
                          <input
                            type="text"
                            value={recentEventDraft.description}
                            onChange={(eventInput) =>
                              setRecentEventDraft((previous) => ({
                                ...previous,
                                description: eventInput.target.value,
                              }))
                            }
                            className="px-3 py-2 text-sm"
                          />
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="neo-label grid gap-1 text-xs tracking-wide uppercase">
                            Date
                            <input
                              type="date"
                              value={recentEventDraft.date}
                              onChange={(eventInput) =>
                                setRecentEventDraft((previous) => ({
                                  ...previous,
                                  date: eventInput.target.value,
                                }))
                              }
                              className="px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="neo-label grid gap-1 text-xs tracking-wide uppercase">
                            Time
                            <input
                              type="time"
                              value={recentEventDraft.time}
                              onChange={(eventInput) =>
                                setRecentEventDraft((previous) => ({
                                  ...previous,
                                  time: eventInput.target.value,
                                }))
                              }
                              className="px-3 py-2 text-sm"
                            />
                          </label>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelRecentEventEdit}
                            className="neo-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                          >
                            <XCircle
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveRecentEventEdit(event)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                          >
                            <CheckCircle2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="neo-label truncate text-sm">
                            {event.description}
                          </p>
                          <p className="mt-1 text-xs font-semibold">
                            {formatDate(event.date, config.dateFormat)}{" "}
                            {formatTime(
                              event.date + "T" + event.time,
                              config.timeFormat,
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startRecentEventEdit(event)}
                            className="neo-button-secondary inline-flex items-center gap-1 px-2.5 py-1 text-[11px]"
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteRecentEvent(event)}
                            className="neo-button-danger-ghost inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                            Delete
                          </button>
                          <span className="neo-pill shrink-0 px-2 py-1 text-[11px]">
                            <CheckCircle2
                              className="mr-1 inline h-3 w-3"
                              aria-hidden="true"
                            />
                            Added
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getTodayLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const NOTICE_AUTO_REFRESH_INTERVAL_MS = 3000;

const noticeMonthByShortName: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function parseNoticeDateParts(value: string) {
  const trimmed = value.trim();
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const shortMonthMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  const numericDmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const ymdSlashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  const verboseMonthMatch = trimmed.match(
    /^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/,
  );

  if (isoDateMatch) {
    return {
      year: Number(isoDateMatch[1]),
      month: Number(isoDateMatch[2]),
      day: Number(isoDateMatch[3]),
    };
  }

  if (shortMonthMatch) {
    const month = noticeMonthByShortName[shortMonthMatch[2].toUpperCase()];

    if (month) {
      return {
        year: Number(shortMonthMatch[3]),
        month,
        day: Number(shortMonthMatch[1]),
      };
    }
  }

  if (numericDmyMatch) {
    return {
      year: Number(numericDmyMatch[3]),
      month: Number(numericDmyMatch[2]),
      day: Number(numericDmyMatch[1]),
    };
  }

  if (ymdSlashMatch) {
    return {
      year: Number(ymdSlashMatch[1]),
      month: Number(ymdSlashMatch[2]),
      day: Number(ymdSlashMatch[3]),
    };
  }

  if (verboseMonthMatch) {
    const month =
      noticeMonthByShortName[verboseMonthMatch[1].slice(0, 3).toUpperCase()];

    if (month) {
      return {
        year: Number(verboseMonthMatch[3]),
        month,
        day: Number(verboseMonthMatch[2]),
      };
    }
  }

  return null;
}

function isValidNoticeDate(year: number, month: number, day: number) {
  if (year < 0 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function parseNoticeTimeParts(value: string) {
  const trimmed = value.trim();
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);

  if (!timeMatch) {
    return null;
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return { hour, minute, second };
}

function toNoticeSortTimestamp(notice: NoticeItem) {
  const dateParts = parseNoticeDateParts(notice.date);
  const timeParts = parseNoticeTimeParts(notice.time);

  if (!dateParts || !timeParts) {
    return Number.POSITIVE_INFINITY;
  }

  if (!isValidNoticeDate(dateParts.year, dateParts.month, dateParts.day)) {
    return Number.POSITIVE_INFINITY;
  }

  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    timeParts.second,
  ).getTime();
}

function sortNoticesAsc(notices: NoticeItem[]) {
  return [...notices].sort((a, b) => {
    const aTimestamp = toNoticeSortTimestamp(a);
    const bTimestamp = toNoticeSortTimestamp(b);

    if (aTimestamp !== bTimestamp) {
      return aTimestamp - bTimestamp;
    }

    return a.id - b.id;
  });
}

type NoticePageProps = {
  notices: NoticeItem[];
  isLoading: boolean;
  error: string;
  onCreateNotice: (notice: NoticeMutationInput) => Promise<void>;
  onUpdateNotice: (id: number, notice: NoticeMutationInput) => Promise<void>;
  onDeleteNotice: (id: number) => Promise<void>;
};

function NoticePage({
  notices,
  isLoading,
  error,
  onCreateNotice,
  onUpdateNotice,
  onDeleteNotice,
}: NoticePageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const config = useAppConfigSettings();
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [formData, setFormData] = useState({
    date: getTodayLocalDate(),
    time: "09:00",
    description: "",
    completed: false,
  });
  const sortedNoticesForDisplay = useMemo(
    () => sortNoticesAsc(notices),
    [notices],
  );

  const formatDisplayDate = (value: Date | string) => {
    if (value instanceof Date) {
      return formatDate(value, config.dateFormat);
    }

    const parts = parseNoticeDateParts(value);

    if (!parts || !isValidNoticeDate(parts.year, parts.month, parts.day)) {
      return value;
    }

    return formatDate(
      new Date(parts.year, parts.month - 1, parts.day),
      config.dateFormat,
    );
  };

  const resetForm = () => {
    setFormData({
      date: getTodayLocalDate(),
      time: "09:00",
      description: "",
      completed: false,
    });
    setEditingNoticeId(null);
    setActionError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.time || !formData.description.trim()) {
      setActionError("Date, time, and description are required.");
      return;
    }

    try {
      setIsSaving(true);
      setActionError("");

      if (editingNoticeId === null) {
        await onCreateNotice({
          date: formData.date,
          time: formData.time,
          description: formData.description.trim(),
          completed: formData.completed,
        });
      } else {
        await onUpdateNotice(editingNoticeId, {
          date: formData.date,
          time: formData.time,
          description: formData.description.trim(),
          completed: formData.completed,
        });
      }

      resetForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save notice.";
      setActionError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (notice: NoticeItem) => {
    setEditingNoticeId(notice.id);
    setFormData({
      date: notice.date,
      time: notice.time,
      description: notice.description,
      completed: notice.completed,
    });
    setActionError("");
  };

  const handleToggleCompleted = async (notice: NoticeItem) => {
    try {
      setActionError("");
      await onUpdateNotice(notice.id, {
        date: notice.date,
        time: notice.time,
        description: notice.description,
        completed: !notice.completed,
      });

      if (editingNoticeId === notice.id) {
        setFormData((prev) => ({
          ...prev,
          completed: !notice.completed,
        }));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update notice.";
      setActionError(message);
    }
  };

  const handleDelete = async (notice: NoticeItem) => {
    const shouldDelete = window.confirm(
      `Delete notice "${notice.description}" on ${notice.date} ${notice.time}?`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setActionError("");
      await onDeleteNotice(notice.id);

      if (editingNoticeId === notice.id) {
        resetForm();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete notice.";
      setActionError(message);
    }
  };

  return (
    <div className="mx-auto flex h-full flex-col gap-4 overflow-auto p-4 sm:p-6">
      <div>
        <h2 className="neo-label flex items-center gap-2 text-2xl">
          <ClipboardList className="h-6 w-6" aria-hidden="true" />
          Notice
        </h2>
        <p className="mt-1 text-sm font-semibold">
          Add a notice with date/time, edit existing ones, or mark them done.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 border border-slate-200 bg-white p-5 md:grid-cols-[160px_140px_minmax(0,1fr)_auto]"
      >
        <label className="neo-label grid gap-1 text-sm">
          Date
          <input
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, date: e.target.value }))
            }
            className="px-3 py-2"
          />
        </label>

        <label className="neo-label grid gap-1 text-sm">
          Time
          <input
            type="time"
            value={formData.time}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, time: e.target.value }))
            }
            className="px-3 py-2"
          />
        </label>

        <label className="neo-label grid gap-1 text-sm">
          Description
          <input
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Enter notice description"
            className="px-3 py-2"
          />
        </label>

        <div className="flex items-end gap-2 md:col-span-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm"
            disabled={isSaving}
          >
            {editingNoticeId === null ? (
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            {isSaving
              ? "Saving..."
              : editingNoticeId === null
                ? "Add Notice"
                : "Update Notice"}
          </button>
          {editingNoticeId !== null ? (
            <button
              type="button"
              onClick={resetForm}
              className="neo-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="flex items-center justify-between">
        <p className="neo-label text-xs">
          Total notices in database: {notices.length}
        </p>
      </div>

      <div>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading notices...</p>
        ) : error || actionError ? (
          <>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {actionError ? (
              <p className="text-sm text-red-600">{actionError}</p>
            ) : null}
          </>
        ) : notices.length === 0 ? (
          <p className="text-sm text-slate-500">No notices available yet.</p>
        ) : (
          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="grid grid-cols-[72px_140px_120px_minmax(0,1fr)_150px] border-b border-slate-200 px-4 py-4 text-xs tracking-wide text-slate-500 uppercase">
              <div>Done</div>
              <div>Date</div>
              <div>Time</div>
              <div>Description</div>
              <div>Actions</div>
            </div>
            <div>
              {sortedNoticesForDisplay.map((notice) => (
                <div
                  key={notice.id}
                  className="grid grid-cols-[72px_140px_120px_minmax(0,1fr)_150px] items-center border-b border-slate-100 px-4 py-4 text-sm last:border-b-0"
                >
                  <div>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={notice.completed}
                        onChange={() => void handleToggleCompleted(notice)}
                        className="h-4 w-4"
                        aria-label={`Mark notice ${notice.description} as ${
                          notice.completed ? "not completed" : "completed"
                        }`}
                      />
                    </label>
                  </div>
                  <div className="font-medium text-slate-900">
                    {formatDisplayDate(notice.date)}
                  </div>
                  <div>
                    {formatTime(
                      notice.date + "T" + notice.time,
                      config.timeFormat,
                    )}
                  </div>
                  <div
                    className={`truncate ${
                      notice.completed ? "text-slate-400 line-through" : ""
                    }`}
                  >
                    {notice.description}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(notice)}
                      className="neo-button-secondary inline-flex items-center gap-1 px-2 py-1 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(notice)}
                      className="neo-button-danger-ghost inline-flex items-center gap-1 px-1.5 py-0.5 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingPage() {
  const [provider, setProvider] = useState<ProviderId>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState("");
  const [isHydrating, setIsHydrating] = useState(true);
  const [saveMessage, setSaveMessage] = useState(
    "Your API key is saved locally and encrypted.",
  );

  useEffect(() => {
    let isMounted = true;

    const hydrateSettings = async () => {
      const savedSettings = readSavedSettings();

      if (!savedSettings) {
        if (isMounted) {
          setIsHydrating(false);
        }

        return;
      }

      try {
        const decryptedApiKey = await decryptValue(savedSettings.apiKey);

        if (!isMounted) {
          return;
        }

        const restoredProvider = PROVIDER_OPTIONS.some(
          (option) => option.id === savedSettings.provider,
        )
          ? savedSettings.provider
          : "openrouter";

        setProvider(restoredProvider);
        setApiKey(decryptedApiKey);
        setSelectedModel(savedSettings.selectedModel);
        setSaveMessage("Loaded saved API key from local encrypted storage.");
      } catch {
        if (!isMounted) {
          return;
        }

        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
        setApiKey("");
        setSelectedModel("");
        setProvider("openrouter");
        setSaveMessage("Saved API key could not be restored.");
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void hydrateSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadModelsForProvider = useCallback(async () => {
    const key = apiKey.trim();
    setError("");

    if (!key) {
      setError("Please enter your API key first.");
      return;
    }

    try {
      setIsLoadingModels(true);

      const models = await fetchProviderModels(provider, key);

      const normalizedModels = models
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setAvailableModels(normalizedModels);
      setSelectedModel((previousModel) => {
        const nextModel = normalizedModels.includes(previousModel)
          ? previousModel
          : (normalizedModels[0] ?? "");
        return nextModel;
      });

      if (normalizedModels.length === 0) {
        setError("No models returned for this API key.");
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
  }, [apiKey, provider]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    setAvailableModels([]);
    setSelectedModel("");
    setError("");
  }, [provider, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    const key = apiKey.trim();

    if (!key) {
      setAvailableModels([]);
      setSelectedModel("");
      setError("");
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadModelsForProvider();
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [apiKey, isHydrating, loadModelsForProvider]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    const key = apiKey.trim();

    if (!key) {
      return;
    }

    const persistTimeoutId = window.setTimeout(() => {
      void saveEncryptedSettings({
        provider,
        apiKey,
        selectedModel,
      })
        .then(() => {
          setSaveMessage(
            `${PROVIDER_LABEL_BY_ID[provider]} API key saved locally and encrypted.`,
          );
        })
        .catch(() => {
          setSaveMessage(
            `Could not save the ${PROVIDER_LABEL_BY_ID[provider]} API key locally.`,
          );
        });
    }, 300);

    return () => {
      window.clearTimeout(persistTimeoutId);
    };
  }, [apiKey, isHydrating, provider, selectedModel]);

  return (
    <div className="mx-auto flex h-full flex-col gap-6 overflow-auto">
      <div className="flex w-full flex-col gap-6">
        {/* App Configuration */}
        <div>
          <SettingsPanel />
        </div>

        {/* API Settings */}
        <div className="p-4 sm:p-6">
          <div>
            <h2 className="neo-label flex items-center gap-2 text-2xl">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
              API Configuration
            </h2>
            <p className="mt-1 text-sm font-semibold">
              Set up your AI provider so Input can extract events from text.
            </p>
          </div>

          <div className="mt-6 border border-slate-200 bg-white p-5">
            <h3 className="neo-label flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" aria-hidden="true" />
              API Setup
            </h3>
            <p className="mt-1 text-sm font-semibold">
              Step 1: Choose a provider. Step 2: Paste your API key. Step 3:
              Choose a model.
            </p>
            <p className="mt-1 text-xs font-semibold">
              Models load automatically after a valid provider and API key are
              entered.
            </p>

            <div className="mt-4 grid gap-4">
              <label className="neo-label grid gap-1 text-sm">
                Provider
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as ProviderId)}
                  className="px-3 py-2"
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="neo-label grid gap-1 text-sm">
                API Key
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="px-3 py-2"
                />
              </label>

              <label className="neo-label grid gap-1 text-sm">
                Model
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-3 py-2"
                  disabled={availableModels.length === 0 || isLoadingModels}
                >
                  <option value="">
                    {isLoadingModels
                      ? "Loading models..."
                      : availableModels.length === 0
                        ? "No models loaded"
                        : "Select a model"}
                  </option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <p className="text-xs font-semibold">
                  Pick one model to use when converting input text into events.
                </p>
              </label>

              {isLoadingModels ? (
                <p className="text-xs text-slate-500">Loading models...</p>
              ) : null}

              <p className="text-xs text-slate-500">{saveMessage}</p>

              {error ? <p className="text-xs text-red-600">{error}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState<Page>(() =>
    readSavedActivePage(),
  );
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isNoticesLoading, setIsNoticesLoading] = useState(true);
  const [noticesError, setNoticesError] = useState("");
  const sortedNotices = useMemo(() => sortNoticesAsc(notices), [notices]);

  const navItems: { id: Page; label: string; icon: LucideIcon }[] = [
    { id: "input", label: "Input", icon: Sparkles },
    { id: "notice", label: "Notice", icon: ClipboardList },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "setting", label: "Setting", icon: Settings2 },
  ];

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, activePage);
  }, [activePage]);

  const loadNotices = useCallback(
    async (options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;

      try {
        if (!isBackground) {
          setIsNoticesLoading(true);
        }
        setNoticesError("");

        const noticeData = await fetchNotices();
        setNotices(sortNoticesAsc(noticeData ?? []));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load notices.";
        setNoticesError(message);
      } finally {
        if (!isBackground) {
          setIsNoticesLoading(false);
        }
      }
    },
    [],
  );

  const createNotice = useCallback(
    async (notice: NoticeMutationInput) => {
      await createNoticeRequest(notice);

      await loadNotices();
    },
    [loadNotices],
  );

  const updateNotice = useCallback(
    async (id: number, notice: NoticeMutationInput) => {
      await updateNoticeRequest(id, notice);

      await loadNotices();
    },
    [loadNotices],
  );

  const deleteNotice = useCallback(
    async (id: number) => {
      await deleteNoticeRequest(id);

      await loadNotices();
    },
    [loadNotices],
  );

  useEffect(() => {
    let isMounted = true;

    const checkApiHealth = async () => {
      try {
        await apiRequest<{ status: string }>("/api/health");

        if (!isMounted) {
          return;
        }

        setApiStatus("online");
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

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadNotices({ background: true });
    }, NOTICE_AUTO_REFRESH_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void loadNotices({ background: true });
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [loadNotices]);

  return (
    <main className="neo-app-shell h-screen w-screen overflow-hidden">
      <div className="grid h-full w-full md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="neo-sidebar h-full p-6">
          <h1 className="neo-label text-xl tracking-tight">Easy Update</h1>
          <div className="neo-pill mt-3 text-xs">
            <span
              className={`h-2 w-2 ${
                apiStatus === "online"
                  ? "bg-emerald-500"
                  : apiStatus === "offline"
                    ? "bg-red-500"
                    : "bg-amber-500"
              }`}
            />
            {apiStatus === "checking" ? (
              <CircleDashed className="h-3.5 w-3.5 animate-spin" />
            ) : apiStatus === "online" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            API: {apiStatus}
          </div>

          <nav className="mt-5 grid gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`neo-nav-item px-3 py-2 text-left text-sm transition ${
                  activePage === item.id
                    ? "neo-nav-item-active"
                    : "neo-button-secondary"
                }`}
              >
                <item.icon className="mr-2 inline h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 overflow-auto">
          <div className={activePage === "input" ? "block" : "hidden"}>
            <InputPage
              onEventsCreated={loadNotices}
              onUpdateRecentEvent={updateNotice}
              onDeleteRecentEvent={deleteNotice}
            />
          </div>
          {activePage === "notice" && (
            <NoticePage
              notices={sortedNotices}
              isLoading={isNoticesLoading}
              error={noticesError}
              onCreateNotice={createNotice}
              onUpdateNotice={updateNotice}
              onDeleteNotice={deleteNotice}
            />
          )}
          {activePage === "calendar" && (
            <Calendar
              notices={sortedNotices}
              isLoading={isNoticesLoading}
              error={noticesError}
              onCreateNotice={createNotice}
              onUpdateNotice={updateNotice}
              onDeleteNotice={deleteNotice}
            />
          )}
          {activePage === "setting" && <SettingPage />}
        </section>
      </div>
    </main>
  );
}

export default App;
