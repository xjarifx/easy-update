import { apiRequest } from "./http";
import type { ProviderId } from "../types/domain";

export const extractAndCreateEvents = (input: {
  provider: ProviderId;
  model: string;
  apiKey: string;
  inputText: string;
}) => {
  return apiRequest<{ createdCount: number }>(
    "/api/events/extract-and-create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
};
