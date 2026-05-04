import { Router } from "express";
import {
  getUserPreferences,
  updateUserPreferencesFromInput,
} from "../services/userPreferencesService.js";
import { getAuthenticatedUserId } from "../middleware/clerkAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import { userPreferencesMutationSchema } from "../utils/validation.js";

export const userPreferencesRouter: ReturnType<typeof Router> = Router();

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
    const parseResult = userPreferencesMutationSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0].message);
    }

    const result = await updateUserPreferencesFromInput(userId, parseResult.data);

    if ("error" in result) {
      throw new ValidationError(result.error);
    }

    res.json({ data: result.value });
  }),
);
