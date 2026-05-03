export type ProviderId = "openrouter" | "openai" | "anthropic" | "google";

export const VALID_PROVIDERS: ProviderId[] = [
  "openrouter",
  "openai",
  "anthropic",
  "google",
];

export type AuthUser = {
  id: number;
  email: string;
  clerkId: string;
};

export type NoticeRecord = {
  id: number;
  userId: number;
  date: string;
  time: string;
  title: string;
  moreInfo: string;
  completed: boolean;
};

export type NoticeItem = Omit<NoticeRecord, "userId">;

export type NoticeMutationInput = {
  date: string;
  time: string;
  title: string;
  moreInfo?: string;
  completed?: boolean;
};

export type ExtractedEvent = {
  title: string;
  moreInfo: string;
  date: string;
  time: string;
};

export type CalendarEventItem = {
  id: string;
  title: string;
  start: string;
  moreInfo: string;
};

export const VALID_DATE_FORMATS = [
  "DD-MMM-YYYY",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
  "MMM DD, YYYY",
  "DD MMM",
] as const;

export const VALID_TIME_FORMATS = ["hh:mm AM/PM", "HH:mm"] as const;

export const VALID_APP_FONTS = [
  "Inter",
  "SF Pro",
  "System",
  "Georgia",
  "Helvetica",
] as const;

export type AppDateFormat = (typeof VALID_DATE_FORMATS)[number];
export type AppTimeFormat = (typeof VALID_TIME_FORMATS)[number];
export type AppFont = (typeof VALID_APP_FONTS)[number];
export type FirstDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type UserPreferences = {
  dateFormat: AppDateFormat;
  timeFormat: AppTimeFormat;
  font: AppFont;
  firstDayOfWeek: FirstDayOfWeek;
};

export type UserPreferencesRecord = UserPreferences & {
  id: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type UserPreferencesMutationInput = Partial<UserPreferences>;
