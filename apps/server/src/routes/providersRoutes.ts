import { Router } from "express";
import { VALID_PROVIDERS, type ProviderId } from "@easy-update/types";
import { fetchModelsForProvider } from "../services/providerModelsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError, BadGatewayError } from "../utils/errors.js";

export const providersRouter = Router();

providersRouter.post(
  "/models",
  asyncHandler(async (req, res) => {
    const { provider, apiKey } = (req.body ?? {}) as {
      provider?: unknown;
      apiKey?: unknown;
    };

    if (
      typeof provider !== "string" ||
      !VALID_PROVIDERS.includes(provider as ProviderId)
    ) {
      throw new ValidationError(
        "provider must be one of openrouter, openai, anthropic, google",
      );
    }

    const apiKeyFromBody =
      typeof apiKey === "string" && apiKey.trim()
        ? apiKey.trim()
        : process.env.MANAGED_AI_API_KEY;

    if (!apiKeyFromBody) {
      throw new ValidationError("apiKey is required");
    }

    try {
      const requestOrigin = req.get("origin") ?? "http://localhost:4000";
      const data = await fetchModelsForProvider(
        provider as ProviderId,
        apiKeyFromBody,
        requestOrigin,
      );

      res.json({ data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch models.";
      throw new BadGatewayError(message);
    }
  }),
);
