import type { ProviderId } from "../domain/types.js";

const normalizeModels = (models: string[]) => {
  return models.filter(Boolean).sort((a, b) => a.localeCompare(b));
};

export const fetchModelsForProvider = async (
  provider: ProviderId,
  apiKey: string,
  requestOrigin: string,
) => {
  if (provider === "openrouter") {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": requestOrigin,
        "X-Title": "Easy Update",
      },
    });

    if (!response.ok) {
      throw new Error(
        `OpenRouter request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return normalizeModels((payload.data ?? []).map((item) => item.id));
  }

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return normalizeModels((payload.data ?? []).map((item) => item.id));
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return normalizeModels((payload.data ?? []).map((item) => item.id));
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
  );

  if (!response.ok) {
    throw new Error(`Google request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    models?: Array<{ name: string }>;
  };
  return normalizeModels((payload.models ?? []).map((item) => item.name));
};
