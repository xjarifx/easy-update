import { Router } from "express";
import {
  getAuthUserById,
  signInWithCredentials,
  signUpWithCredentials,
} from "../services/authService.js";
import {
  getAuthenticatedUserId,
  requireAuthentication,
} from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const data = await signUpWithCredentials(req.body ?? {});

    res.status(201).json({ data });
  }),
);

authRouter.post(
  "/signin",
  asyncHandler(async (req, res) => {
    const data = await signInWithCredentials(req.body ?? {});

    res.json({ data });
  }),
);

authRouter.get(
  "/me",
  requireAuthentication,
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const user = await getAuthUserById(userId);

    res.json({ data: user });
  }),
);
