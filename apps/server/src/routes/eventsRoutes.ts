import { Router } from "express";
import {
  type CalendarEventItem,
  type NoticeMutationInput,
  type NoticeRecord,
  type ProviderId,
} from "@easy-update/types";
import {
  createNoticeFromInput,
  getNotices,
  upsertNoticeFromExtractedInput,
} from "../services/noticesService.js";
import { extractEvents } from "../services/eventExtractionService.js";
import { getAuthenticatedUserId } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import { calendarEventSchema, eventExtractionSchema } from "../utils/validation.js";

export const eventsRouter: ReturnType<typeof Router> = Router();

const toCalendarStart = (date: string, time: string) => {
  const normalizedTime =
    time.trim().toLowerCase() === "no time" ? "12:00" : time;

  return `${date}T${normalizedTime}:00`;
};

eventsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const notices = await getNotices(userId);
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
    const parseResult = calendarEventSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0].message);
    }

    const { title, start, moreInfo } = parseResult.data;
    const dateValue = new Date(start);

    if (Number.isNaN(dateValue.getTime())) {
      throw new ValidationError("start must be a valid date string");
    }

    const input: NoticeMutationInput = {
      date: start.slice(0, 10),
      time: `${String(dateValue.getHours()).padStart(2, "0")}:${String(
        dateValue.getMinutes(),
      ).padStart(2, "0")}`,
      title,
      moreInfo,
    };

    const userId = getAuthenticatedUserId(req);
    const result = await createNoticeFromInput(userId, input);

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
    const parseResult = eventExtractionSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0].message);
    }

    const { text, dateFormat, timeFormat } = parseResult.data;

    const provider = process.env.MANAGED_AI_PROVIDER as ProviderId;
    const apiKey = process.env.MANAGED_AI_API_KEY;
    const model = process.env.MANAGED_AI_MODEL;

    if (!provider || !apiKey || !model) {
      throw new ValidationError("AI provider configuration is missing on server");
    }

    const extractedEvents = await extractEvents({
      provider,
      model,
      apiKey,
      inputText: text,
      requestOrigin: req.get("origin") ?? "http://localhost:4000",
      dateFormat,
      timeFormat,
    });

    if (extractedEvents.length === 0) {
      res.json({ data: { createdCount: 0, updatedCount: 0, events: [] } });
      return;
    }

    // Process each extracted event through the API validation pipeline
    const processed: NoticeRecord[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    const failed: Array<{ event: (typeof extractedEvents)[0]; error: string }> =
      [];

    const userId = getAuthenticatedUserId(req);

    for (const event of extractedEvents) {
      const input: NoticeMutationInput = {
        date: event.date,
        time: event.time,
        title: event.title,
        moreInfo: event.moreInfo,
      };

      const result = await upsertNoticeFromExtractedInput(userId, input);

      if ("error" in result) {
        failed.push({ event, error: result.error });
      } else {
        if (result.action === "created") {
          createdCount += 1;
          processed.push(result.value);
        } else if (result.action === "updated") {
          updatedCount += 1;
          processed.push(result.value);
        }
      }
    }

    res.status(200).json({
      data: {
        createdCount,
        updatedCount,
        events: processed,
        failedCount: failed.length,
        failed: failed.length > 0 ? failed : undefined,
      },
    });
  }),
);
