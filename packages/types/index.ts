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
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
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

export type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
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
