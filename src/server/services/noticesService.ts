import {
  createManyNotices,
  createNotice,
  deleteNotice,
  findNoticeById,
  listNotices,
  updateNotice,
} from "../repositories/noticesRepository.js";
import type {
  ExtractedEvent,
  NoticeMutationInput,
  NoticeRecord,
} from "../domain/types.js";
import {
  toCanonicalNoticeDate,
  toCanonicalNoticeTime,
} from "../utils/noticeNormalization.js";

type NormalizedNoticeInput = {
  date: string;
  time: string;
  event: string;
};

type NoticeInputValidationResult =
  | { error: string }
  | { value: NormalizedNoticeInput };

type NoticeMutationResult =
  | { error: string; status?: number }
  | { value: NoticeRecord };

export const parseNoticeId = (value: string) => {
  const id = Number.parseInt(value, 10);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeNotice = (notice: NoticeRecord): NoticeRecord => {
  const canonicalDate = toCanonicalNoticeDate(notice.date);
  const canonicalTime = toCanonicalNoticeTime(notice.time);

  return {
    ...notice,
    date: canonicalDate ?? notice.date,
    time: canonicalTime ?? notice.time,
  };
};

export const getNotices = async () => {
  const notices = await listNotices();

  return notices.map(normalizeNotice);
};

export const getNoticeById = async (id: number) => {
  const notice = await findNoticeById(id);

  return notice ? normalizeNotice(notice) : null;
};

const normalizeNoticeInput = (
  input: NoticeMutationInput,
): NoticeInputValidationResult => {
  if (!input.date.trim()) {
    return { error: "date is required" } as const;
  }

  if (!input.time.trim()) {
    return { error: "time is required" } as const;
  }

  if (!input.event.trim()) {
    return { error: "event is required" } as const;
  }

  const normalizedDate = toCanonicalNoticeDate(input.date);

  if (!normalizedDate) {
    return { error: "date format is invalid" } as const;
  }

  const normalizedTime = toCanonicalNoticeTime(input.time);

  if (!normalizedTime) {
    return { error: "time format is invalid" } as const;
  }

  return {
    value: {
      date: normalizedDate,
      time: normalizedTime,
      event: input.event.trim(),
    },
  } as const;
};

export const createNoticeFromInput = async (
  input: NoticeMutationInput,
): Promise<NoticeMutationResult> => {
  const normalized = normalizeNoticeInput(input);

  if ("error" in normalized) {
    return normalized;
  }

  const created = await createNotice(normalized.value);

  return { value: normalizeNotice(created) } as NoticeMutationResult;
};

export const updateNoticeFromInput = async (
  id: number,
  input: NoticeMutationInput,
): Promise<NoticeMutationResult> => {
  const normalized = normalizeNoticeInput(input);

  if ("error" in normalized) {
    return normalized;
  }

  const updated = await updateNotice(id, normalized.value);

  if (!updated) {
    return { error: "Notice not found", status: 404 };
  }

  return { value: normalizeNotice(updated) };
};

export const deleteNoticeById = async (
  id: number,
): Promise<NoticeMutationResult> => {
  const deleted = await deleteNotice(id);

  if (!deleted) {
    return { error: "Notice not found", status: 404 };
  }

  return { value: normalizeNotice(deleted) };
};

export const createNoticesFromExtractedEvents = async (
  events: ExtractedEvent[],
) => {
  const values = events.map((event) => ({
    date: event.date,
    time: event.time,
    event: event.title,
  }));

  const created = await createManyNotices(values);

  return created.map(normalizeNotice);
};
