/**
 * Centralized App Configuration
 * All format settings are managed here to ensure consistency across the app
 */

// Date Format Options
export const DateFormat = {
  DD_MMM_YYYY: "DD-MMM-YYYY" as const, // 17-Apr-2026
  MM_DD_YYYY: "MM/DD/YYYY" as const, // 04/17/2026
  DD_MM_YYYY: "DD/MM/YYYY" as const, // 17/04/2026
  YYYY_MM_DD: "YYYY-MM-DD" as const, // 2026-04-17
  MMM_DD_YYYY: "MMM DD, YYYY" as const, // Apr 17, 2026
  DD_MMM: "DD MMM" as const, // 17 Apr
};

export type DateFormatType = (typeof DateFormat)[keyof typeof DateFormat];

// Time Format Options
export const TimeFormat = {
  TWELVE_HOUR: "hh:mm AM/PM" as const, // 02:30 PM
  TWENTY_FOUR_HOUR: "HH:mm" as const, // 14:30
};

export type TimeFormatType = (typeof TimeFormat)[keyof typeof TimeFormat];

// Font Options
export const AppFont = {
  INTER: "Inter" as const,
  SF_PRO: "SF Pro" as const,
  SYSTEM: "System" as const,
  GEORGIA: "Georgia" as const,
  HELVETICA: "Helvetica" as const,
};

export type AppFontType = (typeof AppFont)[keyof typeof AppFont];

// First day of week options
export const FirstDayOfWeek = {
  SUNDAY: 0 as const,
  MONDAY: 1 as const,
};

export type FirstDayOfWeekType =
  (typeof FirstDayOfWeek)[keyof typeof FirstDayOfWeek];

// Font import URLs (these will be preloaded)
export const FONT_IMPORTS: Record<AppFontType, string | null> = {
  [AppFont.INTER]:
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  [AppFont.SF_PRO]: null, // System font
  [AppFont.SYSTEM]: null, // System font
  [AppFont.GEORGIA]: null, // System font
  [AppFont.HELVETICA]: null, // System font
};

// Font stack definitions
export const FONT_STACKS: Record<AppFontType, string> = {
  [AppFont.INTER]:
    '-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Text", sans-serif',
  [AppFont.SF_PRO]:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  [AppFont.SYSTEM]: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  [AppFont.GEORGIA]: 'Georgia, "Times New Roman", serif',
  [AppFont.HELVETICA]:
    '"Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
};

// Default configuration
export const DEFAULT_CONFIG = {
  dateFormat: DateFormat.DD_MMM_YYYY,
  timeFormat: TimeFormat.TWELVE_HOUR,
  font: AppFont.INTER,
  firstDayOfWeek: FirstDayOfWeek.SUNDAY,
} as const;

// AppConfig type for type safety
export type AppConfigType = {
  dateFormat: DateFormatType;
  timeFormat: TimeFormatType;
  font: AppFontType;
  firstDayOfWeek: FirstDayOfWeekType;
};

// Storage key
export const APP_CONFIG_STORAGE_KEY = "easy-update.app-config.v1";

/**
 * Get all available date formats as options
 */
export function getDateFormatOptions() {
  return Object.values(DateFormat).map((value) => ({
    label: getDateFormatLabel(value),
    value: value,
  }));
}

/**
 * Get all available time formats as options
 */
export function getTimeFormatOptions() {
  return Object.values(TimeFormat).map((value) => ({
    label: value,
    value: value,
  }));
}

/**
 * Get all available fonts as options
 */
export function getFontOptions() {
  return Object.values(AppFont).map((value) => ({
    label: value,
    value: value,
  }));
}

/**
 * Get all available first day of week options
 */
export function getFirstDayOfWeekOptions() {
  return [
    { label: "Sunday", value: FirstDayOfWeek.SUNDAY },
    { label: "Monday", value: FirstDayOfWeek.MONDAY },
  ];
}

/**
 * Get a human-readable label for date format
 */
export function getDateFormatLabel(format: DateFormatType): string {
  const today = new Date(2026, 3, 17); // April 17, 2026
  return formatDate(today, format);
}

/**
 * Format a date according to the specified format
 */
export function formatDate(
  date: Date | string,
  format: DateFormatType,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const monthShort = dateObj.toLocaleString("en-US", { month: "short" });
  const year = dateObj.getFullYear();

  switch (format) {
    case "DD-MMM-YYYY":
      return `${day}-${monthShort}-${year}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "MMM DD, YYYY":
      return `${monthShort} ${day}, ${year}`;
    case "DD MMM":
      return `${day} ${monthShort}`;
    default:
      return `${day}-${monthShort}-${year}`;
  }
}

/**
 * Format a time according to the specified format
 */
export function formatTime(
  date: Date | string,
  format: TimeFormatType,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid time";
  }

  const hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");

  switch (format) {
    case "hh:mm AM/PM": {
      const meridiem = hours >= 12 ? "PM" : "AM";
      const normalizedHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${String(normalizedHour).padStart(2, "0")}:${minutes} ${meridiem}`;
    }
    case "HH:mm":
      return `${String(hours).padStart(2, "0")}:${minutes}`;
    default:
      return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | string,
  dateFormat: DateFormatType,
  timeFormat: TimeFormatType,
): string {
  return `${formatDate(date, dateFormat)} ${formatTime(date, timeFormat)}`;
}

/**
 * Parse and validate config
 */
export function isValidConfig(config: unknown): config is AppConfigType {
  if (typeof config !== "object" || config === null) {
    return false;
  }

  const obj = config as Record<string, unknown>;
  const dateFormatValues = Object.values(DateFormat) as string[];
  const timeFormatValues = Object.values(TimeFormat) as string[];
  const fontValues = Object.values(AppFont) as string[];
  const firstDayValues = Object.values(FirstDayOfWeek) as number[];

  return (
    dateFormatValues.includes(obj.dateFormat as string) &&
    timeFormatValues.includes(obj.timeFormat as string) &&
    fontValues.includes(obj.font as string) &&
    firstDayValues.includes(obj.firstDayOfWeek as number)
  );
}
