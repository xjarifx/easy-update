import { Router } from "express";
import {
  VALID_PROVIDERS,
  type CalendarEventItem,
  type NoticeMutationInput,
  type NoticeRecord,
  type ProviderId,
} from "../domain/types.js";
import {
  createNoticeFromInput,
  getNotices,
} from "../services/noticesService.js";
import { extractEvents } from "../services/eventExtractionService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";

export const eventsRouter = Router();

eventsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const notices = await getNotices();
    const data: CalendarEventItem[] = notices.map((notice) => ({
      id: String(notice.id),
      title: notice.description,
      start: `${notice.date}T${notice.time}:00`,
    }));

    res.json({ data });
  }),
);

eventsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, start } = (req.body ?? {}) as {
      title?: unknown;
      start?: unknown;
    };

    if (typeof title !== "string" || !title.trim()) {
      throw new ValidationError("title is required");
    }

    if (typeof start !== "string" || !start.trim()) {
      throw new ValidationError("start is required");
    }

    const dateValue = new Date(start);

    if (Number.isNaN(dateValue.getTime())) {
      throw new ValidationError("start must be a valid date string");
    }

    const input: NoticeMutationInput = {
      date: start.slice(0, 10),
      time: `${String(dateValue.getHours()).padStart(2, "0")}:${String(
        dateValue.getMinutes(),
      ).padStart(2, "0")}`,
      description: title.trim(),
    };

    const result = await createNoticeFromInput(input);

    if ("error" in result) {
      throw new ValidationError(result.error);
    }

    res.status(201).json({
      data: {
        id: String(result.value.id),
        title: result.value.description,
        start: `${result.value.date}T${result.value.time}:00`,
      },
    });
  }),
);

eventsRouter.post(
  "/extract-and-create",
  asyncHandler(async (req, res) => {
    const { provider, apiKey, model, inputText } = (req.body ?? {}) as {
      provider?: unknown;
      apiKey?: unknown;
      model?: unknown;
      inputText?: unknown;
    };

    if (
      typeof provider !== "string" ||
      !VALID_PROVIDERS.includes(provider as ProviderId)
    ) {
      throw new ValidationError(
        "provider must be one of openrouter, openai, anthropic, google",
      );
    }

    if (typeof apiKey !== "string" || !apiKey.trim()) {
      throw new ValidationError("apiKey is required");
    }

    if (typeof model !== "string" || !model.trim()) {
      throw new ValidationError("model is required");
    }

    if (typeof inputText !== "string" || !inputText.trim()) {
      throw new ValidationError("inputText is required");
    }

    const extractedEvents = await extractEvents({
      provider: provider as ProviderId,
      model: model.trim(),
      apiKey: apiKey.trim(),
      inputText,
      requestOrigin: req.get("origin") ?? "http://localhost:4000",
    });

    if (extractedEvents.length === 0) {
      res.json({ data: { createdCount: 0, events: [] } });
      return;
    }

    // Process each extracted event through the API validation pipeline
    const created: NoticeRecord[] = [];
    const failed: Array<{ event: (typeof extractedEvents)[0]; error: string }> =
      [];

    for (const event of extractedEvents) {
      const input: NoticeMutationInput = {
        date: event.date,
        time: event.time,
        description: event.title,
      };

      const result = await createNoticeFromInput(input);

      if ("error" in result) {
        failed.push({ event, error: result.error });
      } else {
        created.push(result.value);
      }
    }

    res.status(201).json({
      data: {
        createdCount: created.length,
        events: created,
        failedCount: failed.length,
        failed: failed.length > 0 ? failed : undefined,
      },
    });
  }),
);
