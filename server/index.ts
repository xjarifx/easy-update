import cors from "cors";
import express from "express";
import { asc, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { noticesTable } from "./db/schema.js";

type EventItem = {
  id: string;
  title: string;
  start: string;
};

type ProviderId = "openrouter" | "openai" | "anthropic" | "google";

type NoticeRecord = {
  id: number;
  date: string;
  time: string;
  event: string;
};

type ExtractedEvent = {
  title: string;
  date: string;
  time: string;
};

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

const events: EventItem[] = [
  {
    id: "1",
    title: "Event 1",
    start: new Date().toISOString(),
  },
];

const validProviders: ProviderId[] = [
  "openrouter",
  "openai",
  "anthropic",
  "google",
];

const normalizeModels = (models: string[]) => {
  return models.filter(Boolean).sort((a, b) => a.localeCompare(b));
};

const eventExtractionSystemPrompt = `You extract event information only.

Rules:
1. Return only JSON with this exact shape: {"events":[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM"}]}
2. Extract only concrete event info from the input.
3. Do not include explanations, notes, markdown, or any extra keys.
4. If no event info exists, return {"events":[]}.
5. Use 24-hour time format HH:MM.
6. Keep title concise and meaningful.`;

const emptyEventsJson = '{"events":[]}';

const parseJsonObjectFromText = (value: string) => {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a valid JSON object.");
  }

  return JSON.parse(value.slice(start, end + 1)) as { events?: unknown };
};

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(value);

const validateExtractedEvents = (input: unknown): ExtractedEvent[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const { title, date, time } = item as {
        title?: unknown;
        date?: unknown;
        time?: unknown;
      };

      if (
        typeof title !== "string" ||
        typeof date !== "string" ||
        typeof time !== "string"
      ) {
        return null;
      }

      const normalizedTitle = title.trim();
      const normalizedDate = date.trim();
      const normalizedTime = time.trim();

      if (
        !normalizedTitle ||
        !isValidDate(normalizedDate) ||
        !isValidTime(normalizedTime)
      ) {
        return null;
      }

      return {
        title: normalizedTitle,
        date: normalizedDate,
        time: normalizedTime,
      };
    })
    .filter((event): event is ExtractedEvent => Boolean(event));
};

const extractEventJsonFromModel = async (
  provider: ProviderId,
  model: string,
  apiKey: string,
  inputText: string,
  requestOrigin: string,
) => {
  if (provider === "openrouter") {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": requestOrigin,
          "X-Title": "Easy Update",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: eventExtractionSystemPrompt },
            { role: "user", content: inputText },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `OpenRouter extraction failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    return payload.choices?.[0]?.message?.content ?? emptyEventsJson;
  }

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: eventExtractionSystemPrompt },
          { role: "user", content: inputText },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI extraction failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    return payload.choices?.[0]?.message?.content ?? emptyEventsJson;
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        temperature: 0,
        system: eventExtractionSystemPrompt,
        messages: [{ role: "user", content: inputText }],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic extraction failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = payload.content?.find((item) => item.type === "text")?.text;
    return text ?? emptyEventsJson;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${eventExtractionSystemPrompt}\n\nInput:\n${inputText}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Google extraction failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? emptyEventsJson;
};

const parseNoticeId = (value: string) => {
  const id = Number.parseInt(value, 10);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const fetchModelsForProvider = async (
  provider: ProviderId,
  apiKey: string,
  requestOrigin: string,
) => {
  if (provider === "openrouter") {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": requestOrigin,
        "X-Title": "Easy Update",
      },
    });

    if (!response.ok) {
      throw new Error(
        `OpenRouter request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return normalizeModels((payload.data ?? []).map((item) => item.id));
  }

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return normalizeModels((payload.data ?? []).map((item) => item.id));
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return normalizeModels((payload.data ?? []).map((item) => item.id));
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
  );

  if (!response.ok) {
    throw new Error(`Google request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    models?: Array<{ name: string }>;
  };
  return normalizeModels((payload.models ?? []).map((item) => item.name));
};

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "easy-update-express-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/events", (_req, res) => {
  res.json({ data: events });
});

app.get("/api/notices", async (_req, res) => {
  const notices = await db
    .select()
    .from(noticesTable)
    .orderBy(
      asc(noticesTable.date),
      asc(noticesTable.time),
      asc(noticesTable.id),
    );

  res.json({ data: notices as NoticeRecord[] });
});

app.get("/api/notices/:id", async (req, res) => {
  const noticeId = parseNoticeId(req.params.id);

  if (noticeId === null) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }

  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(eq(noticesTable.id, noticeId))
    .limit(1);

  if (!notice) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  res.json({ data: notice as NoticeRecord });
});

app.post("/api/notices", async (req, res) => {
  const { date, time, event } = (req.body ?? {}) as {
    date?: unknown;
    time?: unknown;
    event?: unknown;
  };

  if (typeof date !== "string" || !date.trim()) {
    res.status(400).json({ error: "date is required" });
    return;
  }

  if (typeof time !== "string" || !time.trim()) {
    res.status(400).json({ error: "time is required" });
    return;
  }

  if (typeof event !== "string" || !event.trim()) {
    res.status(400).json({ error: "event is required" });
    return;
  }

  const [notice] = await db
    .insert(noticesTable)
    .values({
      date: date.trim(),
      time: time.trim(),
      event: event.trim(),
    })
    .returning();

  res.status(201).json({ data: notice });
});

app.put("/api/notices/:id", async (req, res) => {
  const noticeId = parseNoticeId(req.params.id);

  if (noticeId === null) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }

  const { date, time, event } = (req.body ?? {}) as {
    date?: unknown;
    time?: unknown;
    event?: unknown;
  };

  if (typeof date !== "string" || !date.trim()) {
    res.status(400).json({ error: "date is required" });
    return;
  }

  if (typeof time !== "string" || !time.trim()) {
    res.status(400).json({ error: "time is required" });
    return;
  }

  if (typeof event !== "string" || !event.trim()) {
    res.status(400).json({ error: "event is required" });
    return;
  }

  const [existingNotice] = await db
    .select()
    .from(noticesTable)
    .where(eq(noticesTable.id, noticeId))
    .limit(1);

  if (!existingNotice) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  const [updatedNotice] = await db
    .update(noticesTable)
    .set({
      date: date.trim(),
      time: time.trim(),
      event: event.trim(),
    })
    .where(eq(noticesTable.id, noticeId))
    .returning();

  res.json({ data: (updatedNotice ?? existingNotice) as NoticeRecord });
});

app.delete("/api/notices/:id", async (req, res) => {
  const noticeId = parseNoticeId(req.params.id);

  if (noticeId === null) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }

  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(eq(noticesTable.id, noticeId))
    .limit(1);

  if (!notice) {
    res.status(404).json({ error: "Notice not found" });
    return;
  }

  await db.delete(noticesTable).where(eq(noticesTable.id, noticeId));

  res.json({ data: notice as NoticeRecord });
});

app.post("/api/events/extract-and-create", async (req, res) => {
  const { provider, apiKey, model, inputText } = (req.body ?? {}) as {
    provider?: unknown;
    apiKey?: unknown;
    model?: unknown;
    inputText?: unknown;
  };

  if (
    typeof provider !== "string" ||
    !validProviders.includes(provider as ProviderId)
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
    const requestOrigin = req.get("origin") ?? `http://localhost:${port}`;
    const extractionText = await extractEventJsonFromModel(
      provider as ProviderId,
      model.trim(),
      apiKey.trim(),
      inputText,
      requestOrigin,
    );

    const parsed = parseJsonObjectFromText(extractionText);
    const extractedEvents = validateExtractedEvents(parsed.events);

    if (extractedEvents.length === 0) {
      res.json({ data: { createdCount: 0, events: [] } });
      return;
    }

    const created = await db
      .insert(noticesTable)
      .values(
        extractedEvents.map((event) => ({
          date: event.date,
          time: event.time,
          event: event.title,
        })),
      )
      .returning();

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

app.post("/api/events", (req, res) => {
  const { title, start } = (req.body ?? {}) as {
    title?: unknown;
    start?: unknown;
  };

  if (typeof title !== "string" || typeof start !== "string") {
    res.status(400).json({ error: "title and start are required strings" });
    return;
  }

  const newEvent: EventItem = {
    id: String(events.length + 1),
    title,
    start,
  };

  events.push(newEvent);
  res.status(201).json({ data: newEvent });
});

app.post("/api/providers/models", async (req, res) => {
  const { provider, apiKey } = (req.body ?? {}) as {
    provider?: unknown;
    apiKey?: unknown;
  };

  if (
    typeof provider !== "string" ||
    !validProviders.includes(provider as ProviderId)
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

  try {
    const requestOrigin = req.get("origin") ?? `http://localhost:${port}`;
    const models = await fetchModelsForProvider(
      provider as ProviderId,
      apiKey.trim(),
      requestOrigin,
    );
    res.json({ data: models });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch models.";
    res.status(502).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Express API running on http://localhost:${port}`);
});
