import {
  VALID_APP_FONTS,
  VALID_DATE_FORMATS,
  VALID_TIME_FORMATS,
  type AppDateFormat,
  type AppFont,
  type AppTimeFormat,
  type FirstDayOfWeek,
  type UserPreferences,
  type UserPreferencesMutationInput,
  type UserPreferencesRecord,
} from "@easy-update/types";
import {
  createUserPreferences,
  findUserPreferences,
  upsertUserPreferences,
} from "../repositories/userPreferencesRepository.js";

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  dateFormat: "DD-MMM-YYYY",
  timeFormat: "hh:mm AM/PM",
  font: "Inter",
  firstDayOfWeek: 0,
};

type PreferencesMutationResult =
  | { error: string; status?: number }
  | { value: UserPreferencesRecord };

const isDateFormat = (value: unknown): value is AppDateFormat =>
  typeof value === "string" &&
  (VALID_DATE_FORMATS as readonly string[]).includes(value);

const isTimeFormat = (value: unknown): value is AppTimeFormat =>
  typeof value === "string" &&
  (VALID_TIME_FORMATS as readonly string[]).includes(value);

const isFont = (value: unknown): value is AppFont =>
  typeof value === "string" &&
  (VALID_APP_FONTS as readonly string[]).includes(value);

const isFirstDayOfWeek = (value: unknown): value is FirstDayOfWeek =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6;

const normalizePreferencesInput = (
  existing: UserPreferences,
  input: UserPreferencesMutationInput,
): PreferencesMutationResult | { value: UserPreferences } => {
  const next = { ...existing };

  if (input.dateFormat !== undefined) {
    if (!isDateFormat(input.dateFormat)) {
      return { error: "dateFormat is invalid" };
    }
    next.dateFormat = input.dateFormat;
  }

  if (input.timeFormat !== undefined) {
    if (!isTimeFormat(input.timeFormat)) {
      return { error: "timeFormat is invalid" };
    }
    next.timeFormat = input.timeFormat;
  }

  if (input.font !== undefined) {
    if (!isFont(input.font)) {
      return { error: "font is invalid" };
    }
    next.font = input.font;
  }

  if (input.firstDayOfWeek !== undefined) {
    if (!isFirstDayOfWeek(input.firstDayOfWeek)) {
      return { error: "firstDayOfWeek must be an integer from 0 to 6" };
    }
    next.firstDayOfWeek = input.firstDayOfWeek;
  }

  return { value: next };
};

const toPreferences = (record: UserPreferencesRecord): UserPreferences => ({
  dateFormat: record.dateFormat,
  timeFormat: record.timeFormat,
  font: record.font,
  firstDayOfWeek: record.firstDayOfWeek,
});

export const getUserPreferences = async (userId: number) => {
  const existing = await findUserPreferences(userId);

  if (existing) {
    return existing;
  }

  return createUserPreferences(userId, DEFAULT_USER_PREFERENCES);
};

export const updateUserPreferencesFromInput = async (
  userId: number,
  input: UserPreferencesMutationInput,
): Promise<PreferencesMutationResult> => {
  const existing = await getUserPreferences(userId);
  const normalized = normalizePreferencesInput(toPreferences(existing), input);

  if ("error" in normalized) {
    return normalized;
  }

  const updated = await upsertUserPreferences(userId, normalized.value);

  return { value: updated };
};
