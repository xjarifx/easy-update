import { Router } from "express";
import { fetchModelsForProvider } from "../services/providerModelsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError, BadGatewayError } from "../utils/errors.js";
import { providerModelsSchema } from "../utils/validation.js";

export const providersRouter = Router();

providersRouter.post(
  "/models",
  asyncHandler(async (req, res) => {
    const parseResult = providerModelsSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0].message);
    }

    const { provider } = parseResult.data;
    const apiKey = process.env.MANAGED_AI_API_KEY;

    if (!apiKey) {
      throw new ValidationError("AI provider API key is not configured on server");
    }

    try {
      const requestOrigin = req.get("origin") ?? "http://localhost:4000";
      const data = await fetchModelsForProvider(
        provider,
        apiKey,
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
