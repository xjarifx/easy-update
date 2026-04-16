export type ProviderId = "openrouter" | "openai" | "anthropic" | "google";

export const VALID_PROVIDERS: ProviderId[] = [
  "openrouter",
  "openai",
  "anthropic",
  "google",
];

export type NoticeRecord = {
  id: number;
  date: string;
  time: string;
  description: string;
};

export type NoticeMutationInput = {
  date: string;
  time: string;
  description: string;
};

export type ExtractedEvent = {
  title: string;
  date: string;
  time: string;
};

export type CalendarEventItem = {
  id: string;
  title: string;
  start: string;
};
