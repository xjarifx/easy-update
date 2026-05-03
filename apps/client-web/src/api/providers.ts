import { apiRequest } from "./http";
import type { ProviderId } from "@easy-update/types";

export const fetchProviderModels = (
  provider: ProviderId,
  apiKey: string | undefined,
  token: string | null | undefined,
) => {
  const body: Record<string, unknown> = { provider };

  if (apiKey) {
    body.apiKey = apiKey;
  }

  return apiRequest<string[]>("/api/providers/models", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    requiresAuth: true,
    token,
  });
};
