import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Calendar from "./Calendar";
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
      setProcessStatus("Add text before processing.");
      return;
    }

    const savedSettings = readSavedSettings();

    if (!savedSettings?.selectedModel) {
      setProcessStatus("Set API key and model in Setting before processing.");
      return;
    }

    setIsProcessing(true);
    setProcessStatus("Extracting event info and creating events...");
    setRecentEvents([]);
    setEditingRecentEventId(null);
    const abortController = new AbortController();
    processAbortControllerRef.current = abortController;

    try {
      const decryptedApiKey = await decryptValue(savedSettings.apiKey);

      if (!decryptedApiKey.trim()) {
        setProcessStatus("Saved API key is empty. Add API key in Setting.");
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
          `${previous} File attachments are queued for the next extraction flow.`,
      );
    }
  };

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.abort?.();
    };
  }, []);

  return (
    <section
      className="relative h-full overflow-hidden border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleFileUpload(event.dataTransfer.files);
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_35%)]" />

      <div className="relative flex h-full min-h-0 flex-col gap-6">
        <div className="min-h-0 flex-1 space-y-5">
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.rtf,image/*"
              className="hidden"
              onChange={(event) => handleFileUpload(event.target.files)}
            />

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Big input field
              </span>
              <textarea
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                placeholder="Paste a detailed event note, transcript, or schedule brief here."
                rows={16}
                className="min-h-88 w-full resize-y rounded-4xl border border-slate-200 bg-white px-5 py-5 text-base leading-7 text-slate-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] transition outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBrowseFiles}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  Add doc or pic
                </button>

                <button
                  type="button"
                  onClick={handleVoiceModeToggle}
                  disabled={!isVoiceSupported}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-sm transition ${
                    isListening
                      ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : isVoiceSupported
                        ? "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                        : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M12 18a4 4 0 0 0 4-4V8a4 4 0 1 0-8 0v6a4 4 0 0 0 4 4Z" />
                    <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
                    <path d="M12 19v3" />
                  </svg>
                  {isListening ? "Stop voice" : "Voice mode"}
                </button>

                <button
                  type="button"
                  onClick={clearAllInputs}
                  className="rounded-full px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Clear
                </button>
              </div>

              <button
                type="button"
                onClick={isProcessing ? handleCancelProcess : handleProcess}
                className={`inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.85)] transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
                  isProcessing
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={
                  !isProcessing &&
                  !textInput.trim() &&
                  documents.length === 0 &&
                  images.length === 0
                }
              >
                {isProcessing ? "Cancel" : "Process"}
              </button>
            </div>

            {processStatus ? (
              <p className="text-sm leading-6 text-slate-600">
                {processStatus}
              </p>
            ) : null}
          </div>

          {recentEvents.length > 0 ? (
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    Newly added events
                  </p>
                  <p className="text-xs text-emerald-700">
                    {recentEvents.length} event
                    {recentEvents.length === 1 ? "" : "s"} created from the
                    latest process run.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {recentEvents.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm"
                  >
                    {editingRecentEventId === event.id ? (
                      <div className="space-y-3">
                        <label className="grid gap-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
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
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="grid gap-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
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
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-semibold tracking-wide text-slate-600 uppercase">
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
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                          </label>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelRecentEventEdit}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveRecentEventEdit(event)}
                            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {event.description}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.date} {event.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startRecentEventEdit(event)}
                            className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteRecentEvent(event)}
                            className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-200"
                          >
                            Delete
                          </button>
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
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

const noticeShortMonthByIndex = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

function formatNoticeDate(value: string) {
  const parts = parseNoticeDateParts(value);

  if (!parts) {
    return value;
  }

  if (!isValidNoticeDate(parts.year, parts.month, parts.day)) {
    return value;
  }

  const month = noticeShortMonthByIndex[parts.month - 1];

  if (!month) {
    return value;
  }

  return `${parts.day.toString().padStart(2, "0")}-${month}-${parts.year}`;
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
  onRefresh: () => Promise<void>;
  onCreateNotice: (notice: NoticeMutationInput) => Promise<void>;
  onUpdateNotice: (id: number, notice: NoticeMutationInput) => Promise<void>;
  onDeleteNotice: (id: number) => Promise<void>;
};

function NoticePage({
  notices,
  isLoading,
  error,
  onRefresh,
  onCreateNotice,
  onUpdateNotice,
  onDeleteNotice,
}: NoticePageProps) {
  const [isSaving, setIsSaving] = useState(false);
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
      const day = String(value.getDate()).padStart(2, "0");
      const month = value.toLocaleString("en-US", { month: "short" });
      const year = value.getFullYear();

      return `${day}-${month}-${year}`;
    }

    return formatNoticeDate(value);
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
    <section className="h-full rounded-none border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Notice</h2>
      <p className="mt-1 text-sm text-slate-600">
        Create, edit, and delete notices backed by your database.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 grid gap-3 border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px_140px_minmax(0,1fr)_auto]"
      >
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Date
          <input
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, date: e.target.value }))
            }
            className="border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Time
          <input
            type="time"
            value={formData.time}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, time: e.target.value }))
            }
            className="border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Description
          <input
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Enter notice description"
            className="border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-4">
          <input
            type="checkbox"
            checked={formData.completed}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, completed: e.target.checked }))
            }
            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Completed
        </label>

        <div className="flex items-end gap-2 md:col-span-4">
          <button
            type="submit"
            className="bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
            disabled={isSaving}
          >
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
              className="border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Total notices: {notices.length}
        </p>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5">
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
            <div className="grid grid-cols-[72px_140px_120px_minmax(0,1fr)_150px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-600 uppercase">
              <div>Done</div>
              <div>Date</div>
              <div>Time</div>
              <div>Description</div>
              <div>Actions</div>
            </div>
            <div className="divide-y divide-slate-200">
              {sortedNoticesForDisplay.map((notice) => (
                <div
                  key={notice.id}
                  className="grid grid-cols-[72px_140px_120px_minmax(0,1fr)_150px] items-center px-4 py-3 text-sm text-slate-800"
                >
                  <div>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={notice.completed}
                        onChange={() => void handleToggleCompleted(notice)}
                        className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Mark notice ${notice.description} as ${
                          notice.completed ? "not completed" : "completed"
                        }`}
                      />
                    </label>
                  </div>
                  <div className="font-medium text-slate-900">
                    {formatDisplayDate(notice.date)}
                  </div>
                  <div>{notice.time}</div>
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
                      className="border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(notice)}
                      className="bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
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
  const [apiKey, setApiKey] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState("");
  const [isHydrating, setIsHydrating] = useState(true);
  const [saveMessage, setSaveMessage] = useState(
    "Your OpenRouter API key is saved locally and encrypted.",
  );

  const filteredModels = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();

    if (!query) {
      return availableModels;
    }

    return availableModels.filter((model) =>
      model.toLowerCase().includes(query),
    );
  }, [availableModels, modelQuery]);

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

        setApiKey(decryptedApiKey);
        setSelectedModel(savedSettings.selectedModel);
        setModelQuery(savedSettings.selectedModel);
        setSaveMessage(
          "Loaded saved OpenRouter API key from local encrypted storage.",
        );
      } catch {
        if (!isMounted) {
          return;
        }

        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
        setApiKey("");
        setSelectedModel("");
        setModelQuery("");
        setSaveMessage("Saved OpenRouter API key could not be restored.");
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

      const models = await fetchProviderModels(key);

      const normalizedModels = models
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setAvailableModels(normalizedModels);
      setSelectedModel((previousModel) => {
        const nextModel = normalizedModels.includes(previousModel)
          ? previousModel
          : (normalizedModels[0] ?? "");

        setModelQuery(nextModel);
        return nextModel;
      });

      if (normalizedModels.length === 0) {
        setError("No free OpenRouter models returned for this API key.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch models.";
      setAvailableModels([]);
      setSelectedModel("");
      setModelQuery("");
      setError(message);
    } finally {
      setIsLoadingModels(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    const key = apiKey.trim();

    if (!key) {
      setAvailableModels([]);
      setSelectedModel("");
      setModelQuery("");
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
        provider: "openrouter",
        apiKey,
        selectedModel,
      })
        .then(() => {
          setSaveMessage("OpenRouter API key saved locally and encrypted.");
        })
        .catch(() => {
          setSaveMessage("Could not save the OpenRouter API key locally.");
        });
    }, 300);

    return () => {
      window.clearTimeout(persistTimeoutId);
    };
  }, [apiKey, isHydrating, selectedModel]);

  return (
    <section className="h-full border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Setting</h2>
      <p className="mt-1 text-sm text-slate-600">
        Configure the OpenRouter API key and choose from the currently usable
        free models.
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
          Step 1: paste your OpenRouter API key. Step 2: load the free models
          that key can use. Step 3: search and pick a model.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Model search runs automatically after you paste the API key.
        </p>

        <div className="mt-4 grid gap-4">
          <div className="border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            Provider:{" "}
            <span className="font-semibold text-slate-900">OpenRouter</span>
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              free models only
            </span>
          </div>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            API Key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="border border-slate-300 px-3 py-2 text-slate-900 ring-blue-500 outline-none focus:ring-2"
            />
          </label>

          <div className="grid gap-1 text-sm font-medium text-slate-700">
            <label htmlFor="model-search">Search AI model</label>
            <input
              id="model-search"
              type="search"
              value={modelQuery}
              onChange={(e) => setModelQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredModels[0]) {
                  e.preventDefault();
                  setSelectedModel(filteredModels[0]);
                  setModelQuery(filteredModels[0]);
                }
              }}
              placeholder="Search free OpenRouter models"
              className="border border-slate-300 px-3 py-2 text-slate-900 ring-blue-500 outline-none focus:ring-2"
            />
            <p className="text-xs font-normal text-slate-500">
              Search across the free OpenRouter model suggestions and click one
              to select it.
            </p>
          </div>

          <div className="border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-xs text-slate-500">
              <span>
                {filteredModels.length} suggestion
                {filteredModels.length === 1 ? "" : "s"}
              </span>
              <span>
                {selectedModel
                  ? `Selected: ${selectedModel}`
                  : "No model selected"}
              </span>
            </div>

            <div className="max-h-72 overflow-auto">
              {availableModels.length === 0 ? (
                <div className="px-3 py-4 text-sm text-slate-500">
                  No models loaded yet.
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="px-3 py-4 text-sm text-slate-500">
                  No free OpenRouter models match your search.
                </div>
              ) : (
                filteredModels.slice(0, 50).map((model) => {
                  const isSelected = model === selectedModel;

                  return (
                    <button
                      key={model}
                      type="button"
                      onClick={() => {
                        setSelectedModel(model);
                        setModelQuery(model);
                      }}
                      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-slate-50 ${
                        isSelected
                          ? "bg-blue-50 text-blue-900"
                          : "text-slate-700"
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium">
                        {model}
                      </span>
                      {isSelected ? (
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Selected
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {isLoadingModels ? (
            <p className="text-xs text-slate-500">Loading models...</p>
          ) : null}

          <p className="text-xs text-slate-500">{saveMessage}</p>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </section>
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

  const navItems: { id: Page; label: string }[] = [
    { id: "input", label: "Input" },
    { id: "notice", label: "Notice" },
    { id: "calendar", label: "Calendar" },
    { id: "setting", label: "Setting" },
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
              onRefresh={loadNotices}
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
