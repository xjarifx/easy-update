export type ProviderId = "openrouter" | "openai" | "anthropic" | "google";

export type NoticeItem = {
  id: number;
  date: string;
  time: string;
  event: string;
};

export type NoticeMutationInput = {
  date: string;
  time: string;
  event: string;
};
