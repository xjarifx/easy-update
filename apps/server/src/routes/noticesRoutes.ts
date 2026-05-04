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
import { noticeMutationSchema } from "../utils/validation.js";

export const noticesRouter: ReturnType<typeof Router> = Router();

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
    const parseResult = noticeMutationSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0].message);
    }

    const result = await createNoticeFromInput(userId, parseResult.data);

    if ("error" in result) {
      throw new ValidationError(result.error);
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
    const parseResult = noticeMutationSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0].message);
    }

    const result = await updateNoticeFromInput(id, userId, parseResult.data);

    if ("error" in result) {
      throw new ValidationError(result.error);
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
      throw new ValidationError(result.error);
    }

    res.status(204).send();
  }),
);
