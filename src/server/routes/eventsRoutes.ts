import { Router } from "express";
import {
  VALID_PROVIDERS,
  type CalendarEventItem,
  type NoticeMutationInput,
  type ProviderId,
} from "../domain/types.js";
import {
  createNoticeFromInput,
  createNoticesFromExtractedEvents,
  getNotices,
} from "../services/noticesService.js";
import { extractEvents } from "../services/eventExtractionService.js";

export const eventsRouter = Router();

eventsRouter.get("/", async (_req, res) => {
  const notices = await getNotices();
  const data: CalendarEventItem[] = notices.map((notice) => ({
    id: String(notice.id),
    title: notice.event,
    start: `${notice.date}T${notice.time}:00`,
  }));

  res.json({ data });
});

eventsRouter.post("/", async (req, res) => {
  const { title, start } = (req.body ?? {}) as {
    title?: unknown;
    start?: unknown;
  };

  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  if (typeof start !== "string" || !start.trim()) {
    res.status(400).json({ error: "start is required" });
    return;
  }

  const dateValue = new Date(start);

  if (Number.isNaN(dateValue.getTime())) {
    res.status(400).json({ error: "start must be a valid date string" });
    return;
  }

  const input: NoticeMutationInput = {
    date: start.slice(0, 10),
    time: `${String(dateValue.getHours()).padStart(2, "0")}:${String(
      dateValue.getMinutes(),
    ).padStart(2, "0")}`,
    event: title.trim(),
  };

  const result = await createNoticeFromInput(input);

  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(201).json({
    data: {
      id: String(result.value.id),
      title: result.value.event,
      start: `${result.value.date}T${result.value.time}:00`,
    },
  });
});

eventsRouter.post("/extract-and-create", async (req, res) => {
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
    res.status(400).json({
      error: "provider must be one of openrouter, openai, anthropic, google",
    });
    return;
  }

  if (typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(400).json({ error: "apiKey is required" });
    return;
  }

  if (typeof model !== "string" || !model.trim()) {
    res.status(400).json({ error: "model is required" });
    return;
  }

  if (typeof inputText !== "string" || !inputText.trim()) {
    res.status(400).json({ error: "inputText is required" });
    return;
  }

  try {
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

    const created = await createNoticesFromExtractedEvents(extractedEvents);

    res.status(201).json({
      data: {
        createdCount: created.length,
        events: created,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract events.";
    res.status(502).json({ error: message });
  }
});
