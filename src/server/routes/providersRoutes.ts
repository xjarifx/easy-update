import { Router } from "express";
import { VALID_PROVIDERS, type ProviderId } from "../domain/types.js";
import { fetchModelsForProvider } from "../services/providerModelsService.js";

export const providersRouter = Router();

providersRouter.post("/models", async (req, res) => {
  const { provider, apiKey } = (req.body ?? {}) as {
    provider?: unknown;
    apiKey?: unknown;
  };

  if (
    typeof provider !== "string" ||
    !VALID_PROVIDERS.includes(provider as ProviderId)
  ) {
    res.status(400).json({
      error: "provider must be one of openrouter, openai, anthropic, google",
    });
    return;
  }

  if (typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(400).json({ error: "apiKey is required" });
    return;
  }

  try {
    const requestOrigin = req.get("origin") ?? "http://localhost:4000";
    const data = await fetchModelsForProvider(
      provider as ProviderId,
      apiKey.trim(),
      requestOrigin,
    );

    res.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch models.";
    res.status(502).json({ error: message });
  }
});
