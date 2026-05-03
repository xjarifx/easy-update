import { Router } from "express";
import {
  getUserPreferences,
  updateUserPreferencesFromInput,
} from "../services/userPreferencesService.js";
import { getAuthenticatedUserId } from "../middleware/clerkAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";

export const userPreferencesRouter = Router();

userPreferencesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const data = await getUserPreferences(userId);

    res.json({ data });
  }),
);

userPreferencesRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const result = await updateUserPreferencesFromInput(userId, req.body ?? {});

    if ("error" in result) {
      const status = result.status ?? 400;
      const error = new ValidationError(result.error);
      error.statusCode = status;
      throw error;
    }

    res.json({ data: result.value });
  }),
);
