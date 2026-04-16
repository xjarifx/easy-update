import { apiRequest } from "./http";

export const fetchProviderModels = (apiKey: string) => {
  return apiRequest<string[]>("/api/providers/models", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider: "openrouter", apiKey }),
  });
};
