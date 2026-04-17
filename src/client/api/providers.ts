import { apiRequest } from "./http";
import type { ProviderId } from "../types/domain";

export const fetchProviderModels = (provider: ProviderId, apiKey: string) => {
  return apiRequest<string[]>("/api/providers/models", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider, apiKey }),
  });
};
