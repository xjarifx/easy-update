export type ProviderId = "openrouter" | "openai" | "anthropic" | "google";

export type NoticeItem = {
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
