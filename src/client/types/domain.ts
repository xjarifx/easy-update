export type ProviderId = "openrouter" | "openai" | "anthropic" | "google";

export type NoticeItem = {
  id: number;
  date: string;
  time: string;
  title: string;
  moreInfo: string;
  completed: boolean;
};

export type NoticeMutationInput = {
  date: string;
  time: string;
  title: string;
  moreInfo?: string;
  completed?: boolean;
};
