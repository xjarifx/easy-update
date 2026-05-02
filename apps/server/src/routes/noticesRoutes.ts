import { Router } from "express";
import {
  createNoticeFromInput,
  deleteNoticeById,
  getNoticeById,
  getNotices,
  parseNoticeId,
  updateNoticeFromInput,
} from "../services/noticesService.js";
import { getAuthenticatedUserId } from "../middleware/clerkAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

export const noticesRouter = Router();

noticesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const data = await getNotices(userId);
    res.json({ data });
  }),
);

noticesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseNoticeId(req.params.id as string);

    if (id === null) {
      throw new ValidationError("id must be a positive integer");
    }

    const userId = getAuthenticatedUserId(req);
    const data = await getNoticeById(id, userId);

    if (!data) {
      throw new NotFoundError("Notice");
    }

    res.json({ data });
  }),
);

noticesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const result = await createNoticeFromInput(userId, req.body ?? {});

    if ("error" in result) {
      const status = result.status ?? 400;
      const error = new ValidationError(result.error);
      error.statusCode = status;
      throw error;
    }

    res.status(201).json({ data: result.value });
  }),
);

noticesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseNoticeId(req.params.id as string);

    if (id === null) {
      throw new ValidationError("id must be a positive integer");
    }

    const userId = getAuthenticatedUserId(req);
    const result = await updateNoticeFromInput(id, userId, req.body ?? {});

    if ("error" in result) {
      const status = result.status ?? 400;
      const error = new ValidationError(result.error);
      error.statusCode = status;
      throw error;
    }

    res.json({ data: result.value });
  }),
);

noticesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseNoticeId(req.params.id as string);

    if (id === null) {
      throw new ValidationError("id must be a positive integer");
    }

    const userId = getAuthenticatedUserId(req);
    const result = await deleteNoticeById(id, userId);

    if ("error" in result) {
      const status = result.status ?? 400;
      const error = new ValidationError(result.error);
      error.statusCode = status;
      throw error;
    }

    res.status(204).send();
  }),
);
