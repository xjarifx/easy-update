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
const ENCRYPTION_SECRET_KEY = "easy-update.settings.secret";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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

function InputPage() {
  const [textInput, setTextInput] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [isDropActive, setIsDropActive] = useState(false);
  const [processStatus, setProcessStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

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

  const handleProcess = async () => {
    const trimmedText = textInput.trim();

    if (!trimmedText) {
      setProcessStatus("Add text before processing.");
      return;
    }

    const savedSettings = readSavedSettings();

    if (!savedSettings?.selectedModel) {
      setProcessStatus(
        "Set provider, API key, and model in Setting before processing.",
      );
      return;
    }

    setProcessStatus("Extracting event info and creating events...");

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
      });

      const createdCount = response.createdCount ?? 0;
      setProcessStatus(
        `Created ${createdCount} event${createdCount === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process text.";
      setProcessStatus(`Processing failed: ${message}`);
    }

    if (documents.length > 0 || images.length > 0) {
      setProcessStatus(
        (previous) => `${previous} File extraction is not enabled yet.`,
      );
      return;
    }
  };

  const totalDocumentBytes = documents.reduce(
    (sum, file) => sum + file.size,
    0,
  );
  const totalImageBytes = images.reduce((sum, file) => sum + file.size, 0);

  const imagePreviews = useMemo(() => {
    const previewUrls = images.map((image) => URL.createObjectURL(image));
    return previewUrls;
  }, [images]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [imagePreviews]);

  return (
    <section className="h-full border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Input
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Paste text, drop files, and process everything from one clean panel.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Large input box</span>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste notes, a prompt, transcript text, or draft content here."
              rows={14}
              className="min-h-72 w-full resize-y border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 shadow-inner transition outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </label>

          <div
            className={`grid gap-4 border border-dashed p-4 transition ${
              isDropActive
                ? "border-slate-400 bg-slate-50"
                : "border-slate-200 bg-white"
            }`}
            onDragEnter={() => setIsDropActive(true)}
            onDragLeave={() => setIsDropActive(false)}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDropActive(true);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDropActive(false);
              handleFileUpload(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.rtf,image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Attach documents or images
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Drop files here or browse for PDFs, DOC/DOCX, TXT, MD, RTF,
                  and images.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBrowseFiles}
                className="inline-flex items-center justify-center bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Add files
              </button>
            </div>

            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              <div className="bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Text
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {textInput.trim()
                    ? `${textInput.length.toLocaleString()} chars`
                    : "No text yet"}
                </p>
              </div>
              <div className="bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Documents
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {documents.length} file{documents.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Images
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {images.length} file{images.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Documents
                  </p>
                  <button
                    type="button"
                    onClick={() => setDocuments([])}
                    className="text-xs font-medium text-slate-500 transition hover:text-red-600"
                  >
                    Clear
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Total size {formatFileSize(totalDocumentBytes)}
                </p>
                <div className="mt-3 space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No documents added yet.
                    </p>
                  ) : (
                    documents.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center justify-between gap-3 border border-white/70 bg-white px-3 py-2"
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
                          className="shrink-0 text-xs font-medium text-slate-500 transition hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Images</p>
                  <button
                    type="button"
                    onClick={() => setImages([])}
                    className="text-xs font-medium text-slate-500 transition hover:text-red-600"
                  >
                    Clear
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Total size {formatFileSize(totalImageBytes)}
                </p>
                <div className="mt-3 space-y-3">
                  {images.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No images added yet.
                    </p>
                  ) : (
                    images.map((image, index) => (
                      <div
                        key={`${image.name}-${image.lastModified}-${index}`}
                        className="overflow-hidden border border-white/70 bg-white"
                      >
                        <img
                          src={imagePreviews[index]}
                          alt={image.name}
                          className="h-32 w-full object-cover"
                        />
                        <div className="flex items-center justify-between gap-3 px-3 py-2">
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
                            className="shrink-0 text-xs font-medium text-slate-500 transition hover:text-red-600"
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

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setTextInput("");
                  setDocuments([]);
                  setImages([]);
                  setProcessStatus("");
                }}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Clear all
              </button>

              <button
                type="button"
                onClick={handleProcess}
                className="inline-flex items-center justify-center bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={
                  !textInput.trim() &&
                  documents.length === 0 &&
                  images.length === 0
                }
              >
                Process
              </button>
            </div>

            {processStatus ? (
              <p className="text-sm text-slate-600">{processStatus}</p>
            ) : null}
          </div>
        </div>

        <aside className="border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Summary</p>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="bg-white px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Characters
              </p>
              <p className="mt-1 text-base font-medium text-slate-900">
                {textInput.length.toLocaleString()}
              </p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Files
              </p>
              <p className="mt-1 text-base font-medium text-slate-900">
                {documents.length + images.length}
              </p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Ready
              </p>
              <p className="mt-1 text-base font-medium text-slate-900">
                {textInput.trim() || documents.length > 0 || images.length > 0
                  ? "Yes"
                  : "Not yet"}
              </p>
            </div>
          </div>
        </aside>
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
  });

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
        });
      } else {
        await onUpdateNotice(editingNoticeId, {
          date: formData.date,
          time: formData.time,
          description: formData.description.trim(),
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
    });
    setActionError("");
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

        <div className="flex items-end gap-2">
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
            <div className="grid grid-cols-[140px_120px_minmax(0,1fr)_150px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-600 uppercase">
              <div>Date</div>
              <div>Time</div>
              <div>Description</div>
              <div>Actions</div>
            </div>
            <div className="divide-y divide-slate-200">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="grid grid-cols-[140px_120px_minmax(0,1fr)_150px] items-center px-4 py-3 text-sm text-slate-800"
                >
                  <div className="font-medium text-slate-900">
                    {formatDisplayDate(notice.date)}
                  </div>
                  <div>{notice.time}</div>
                  <div className="truncate">{notice.description}</div>
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

        setSelectedProvider(savedSettings.provider);
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

      const models = await fetchProviderModels(selectedProvider, key);

      const normalizedModels = models
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setAvailableModels(normalizedModels);
      setSelectedModel((previousModel) =>
        normalizedModels.includes(previousModel)
          ? previousModel
          : (normalizedModels[0] ?? ""),
      );

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
        provider: selectedProvider,
        apiKey,
        selectedModel,
      })
        .then(() => {
          setSaveMessage("API key saved locally and encrypted.");
        })
        .catch(() => {
          setSaveMessage("Could not save the API key locally.");
        });
    }, 300);

    return () => {
      window.clearTimeout(persistTimeoutId);
    };
  }, [apiKey, isHydrating, selectedModel, selectedProvider]);

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
        <p className="mt-1 text-xs text-slate-500">
          Model search runs automatically after you paste the API key.
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

          <p className="text-xs text-slate-500">{saveMessage}</p>

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
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isNoticesLoading, setIsNoticesLoading] = useState(true);
  const [noticesError, setNoticesError] = useState("");

  const navItems: { id: Page; label: string }[] = [
    { id: "input", label: "Input" },
    { id: "notice", label: "Notice" },
    { id: "calendar", label: "Calendar" },
    { id: "setting", label: "Setting" },
  ];

  const loadNotices = useCallback(
    async (options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;

      try {
        if (!isBackground) {
          setIsNoticesLoading(true);
        }
        setNoticesError("");

        const noticeData = await fetchNotices();
        setNotices(noticeData ?? []);
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
          {activePage === "input" && <InputPage />}
          {activePage === "notice" && (
            <NoticePage
              notices={notices}
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
              notices={notices}
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
