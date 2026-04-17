import { apiRequest } from "./http";
import type { NoticeItem, ProviderId } from "../types/domain";

export type ExtractAndCreateEventsResponse = {
  createdCount: number;
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
  apiKey: string;
  inputText: string;
  signal?: AbortSignal;
}) => {
  return apiRequest<ExtractAndCreateEventsResponse>(
    "/api/events/extract-and-create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: input.signal,
    },
  );
};
