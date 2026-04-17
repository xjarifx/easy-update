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

const toCalendarStart = (date: string, time: string) => {
  const normalizedTime =
    time.trim().toLowerCase() === "no time" ? "12:00" : time;

  return `${date}T${normalizedTime}:00`;
};

eventsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const notices = await getNotices();
    const data: CalendarEventItem[] = notices.map((notice) => ({
      id: String(notice.id),
      title: notice.title,
      start: toCalendarStart(notice.date, notice.time),
      moreInfo: notice.moreInfo,
    }));

    res.json({ data });
  }),
);

eventsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, start, moreInfo } = (req.body ?? {}) as {
      title?: unknown;
      start?: unknown;
      moreInfo?: unknown;
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
      title: title.trim(),
      moreInfo: typeof moreInfo === "string" ? moreInfo.trim() : "",
    };

    const result = await createNoticeFromInput(input);

    if ("error" in result) {
      throw new ValidationError(result.error);
    }

    res.status(201).json({
      data: {
        id: String(result.value.id),
        title: result.value.title,
        start: toCalendarStart(result.value.date, result.value.time),
        moreInfo: result.value.moreInfo,
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
        title: event.title,
        moreInfo: event.moreInfo,
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
