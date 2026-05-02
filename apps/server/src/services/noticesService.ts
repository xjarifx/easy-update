import {
  createManyNotices,
  createNotice,
  deleteNotice,
  findNoticeByExactFields,
  findNoticesByDateAndTitle,
  findNoticeById,
  listNotices,
  updateNotice,
} from "../repositories/noticesRepository.js";
import type {
  ExtractedEvent,
  NoticeMutationInput,
  NoticeRecord,
} from "@easy-update/types";
import {
  toCanonicalNoticeDate,
  toCanonicalNoticeTime,
} from "../utils/noticeNormalization.js";

type NormalizedNoticeInput = {
  date: string;
  time: string;
  title: string;
  moreInfo: string;
  completed: boolean;
};

type UserScopedNoticeInput = NormalizedNoticeInput & {
  userId: number;
};

type NoticeInputValidationResult =
  | { error: string }
  | { value: NormalizedNoticeInput };

type NoticeMutationResult =
  | { error: string; status?: number }
  | { value: NoticeRecord };

type ExtractUpsertResult =
  | { error: string; status?: number }
  | { value: NoticeRecord; action: "created" | "updated" | "unchanged" };

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

export const getNotices = async (userId: number) => {
  const notices = await listNotices(userId);

  return notices.map(normalizeNotice);
};

export const getNoticeById = async (id: number, userId: number) => {
  const notice = await findNoticeById(id, userId);

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

  if (!input.title.trim()) {
    return { error: "title is required" } as const;
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
      title: input.title.trim(),
      moreInfo: input.moreInfo?.trim() ?? "",
      completed: typeof input.completed === "boolean" ? input.completed : false,
    },
  } as const;
};

export const createNoticeFromInput = async (
  userId: number,
  input: NoticeMutationInput,
): Promise<NoticeMutationResult> => {
  const normalized = normalizeNoticeInput(input);

  if ("error" in normalized) {
    return normalized;
  }

  const duplicate = await findNoticeByExactFields({
    userId,
    date: normalized.value.date,
    time: normalized.value.time,
    title: normalized.value.title,
  });

  if (duplicate) {
    return {
      error:
        "Duplicate notice already exists for the same date, time, and title.",
      status: 409,
    };
  }

  const created = await createNotice({
    userId,
    ...normalized.value,
  });

  return { value: normalizeNotice(created) } as NoticeMutationResult;
};

export const updateNoticeFromInput = async (
  id: number,
  userId: number,
  input: NoticeMutationInput,
): Promise<NoticeMutationResult> => {
  const normalized = normalizeNoticeInput(input);

  if ("error" in normalized) {
    return normalized;
  }

  const duplicate = await findNoticeByExactFields({
    userId,
    date: normalized.value.date,
    time: normalized.value.time,
    title: normalized.value.title,
  });

  if (duplicate && duplicate.id !== id) {
    return {
      error:
        "Duplicate notice already exists for the same date, time, and title.",
      status: 409,
    };
  }

  const updated = await updateNotice(id, userId, normalized.value);

  if (!updated) {
    return { error: "Notice not found", status: 404 };
  }

  return { value: normalizeNotice(updated) };
};

export const deleteNoticeById = async (
  id: number,
  userId: number,
): Promise<NoticeMutationResult> => {
  const deleted = await deleteNotice(id, userId);

  if (!deleted) {
    return { error: "Notice not found", status: 404 };
  }

  return { value: normalizeNotice(deleted) };
};

const isNoTime = (value: string) => value.trim().toLowerCase() === "no time";

export const upsertNoticeFromExtractedInput = async (
  userId: number,
  input: NoticeMutationInput,
): Promise<ExtractUpsertResult> => {
  const normalized = normalizeNoticeInput(input);

  if ("error" in normalized) {
    return normalized;
  }

  const normalizedInput = normalized.value;
  const exactMatch = await findNoticeByExactFields({
    userId,
    date: normalizedInput.date,
    time: normalizedInput.time,
    title: normalizedInput.title,
  });
  if (exactMatch) {
    const hasDifferentDetails =
      exactMatch.moreInfo !== normalizedInput.moreInfo ||
      exactMatch.completed !== normalizedInput.completed;

    if (!hasDifferentDetails) {
      return { value: normalizeNotice(exactMatch), action: "unchanged" };
    }

    const updated = await updateNotice(exactMatch.id, userId, normalizedInput);

    if (!updated) {
      return { error: "Notice not found", status: 404 };
    }

    return { value: normalizeNotice(updated), action: "updated" };
  }

  const sameDateAndTitle = await findNoticesByDateAndTitle({
    userId,
    date: normalizedInput.date,
    title: normalizedInput.title,
  });
  if (sameDateAndTitle.length > 0) {
    const noticeToUpdate =
      sameDateAndTitle.find((notice) => isNoTime(notice.time)) ??
      sameDateAndTitle[0];

    const updated = await updateNotice(noticeToUpdate.id, userId, {
      ...normalizedInput,
      completed: noticeToUpdate.completed,
    });
    if (!updated) {
      return { error: "Notice not found", status: 404 };
    }

    return { value: normalizeNotice(updated), action: "updated" };
  }

  const created = await createNotice({
    userId,
    ...normalizedInput,
  });
  return { value: normalizeNotice(created), action: "created" };
};
