import { Router } from "express";
import {
  createNoticeFromInput,
  deleteNoticeById,
  getNoticeById,
  getNotices,
  parseNoticeId,
  updateNoticeFromInput,
} from "../services/noticesService.js";

export const noticesRouter = Router();

noticesRouter.get("/", async (_req, res) => {
  const data = await getNotices();

  res.json({ data });
});

noticesRouter.get("/:id", async (req, res) => {
  const id = parseNoticeId(req.params.id);

  if (id === null) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }

  const data = await getNoticeById(id);

  if (!data) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  res.json({ data });
});

noticesRouter.post("/", async (req, res) => {
  const result = await createNoticeFromInput(req.body ?? {});

  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(201).json({ data: result.value });
});

noticesRouter.put("/:id", async (req, res) => {
  const id = parseNoticeId(req.params.id);

  if (id === null) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }

  const result = await updateNoticeFromInput(id, req.body ?? {});

  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }

  res.json({ data: result.value });
});

noticesRouter.delete("/:id", async (req, res) => {
  const id = parseNoticeId(req.params.id);

  if (id === null) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }

  const result = await deleteNoticeById(id);

  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }

  res.json({ data: result.value });
});
