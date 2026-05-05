import { apiRequest } from "./http";
import type { NoticeItem, ProviderId } from "@easy-update/types";

export type ExtractAndCreateEventsResponse = {
  createdCount: number;
  updatedCount?: number;
  events: NoticeItem[];
  failedCount?: number;
  failed?: Array<{
    event: {
      title: string;
      moreInfo: string;
      date: string;
      time: string;
    };
    error: string;
  }>;
};

export const extractAndCreateEvents = (input: {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  inputText: string;
  signal?: AbortSignal;
  token?: string | null;
}) => {
  const body: Record<string, unknown> = {
    provider: input.provider,
    model: input.model,
    inputText: input.inputText,
  };

  if (input.apiKey) {
    body.apiKey = input.apiKey;
  }

  return apiRequest<ExtractAndCreateEventsResponse>(
    "/api/events/extract-and-create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      requiresAuth: true,
      signal: input.signal,
      token: input.token,
    },
  );
};
