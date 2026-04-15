import cors from "cors";
import express from "express";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { noticesTable } from "./db/schema.js";
const app = express();
const port = Number(process.env.PORT ?? 4000);
app.use(cors());
app.use(express.json());
const events = [
    {
        id: "1",
        title: "Event 1",
        start: new Date().toISOString(),
    },
];
const validProviders = [
    "openrouter",
    "openai",
    "anthropic",
    "google",
];
const normalizeModels = (models) => {
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
const parseJsonObjectFromText = (value) => {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("Model did not return a valid JSON object.");
    }
    return JSON.parse(value.slice(start, end + 1));
};
const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTime = (value) => /^\d{2}:\d{2}$/.test(value);
const validateExtractedEvents = (input) => {
    if (!Array.isArray(input)) {
        return [];
    }
    return input
        .map((item) => {
        if (!item || typeof item !== "object") {
            return null;
        }
        const { title, date, time } = item;
        if (typeof title !== "string" ||
            typeof date !== "string" ||
            typeof time !== "string") {
            return null;
        }
        const normalizedTitle = title.trim();
        const normalizedDate = date.trim();
        const normalizedTime = time.trim();
        if (!normalizedTitle ||
            !isValidDate(normalizedDate) ||
            !isValidTime(normalizedTime)) {
            return null;
        }
        return {
            title: normalizedTitle,
            date: normalizedDate,
            time: normalizedTime,
        };
    })
        .filter((event) => Boolean(event));
};
const extractEventJsonFromModel = async (provider, model, apiKey, inputText, requestOrigin) => {
    if (provider === "openrouter") {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        });
        if (!response.ok) {
            throw new Error(`OpenRouter extraction failed with status ${response.status}`);
        }
        const payload = (await response.json());
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
            throw new Error(`OpenAI extraction failed with status ${response.status}`);
        }
        const payload = (await response.json());
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
            throw new Error(`Anthropic extraction failed with status ${response.status}`);
        }
        const payload = (await response.json());
        const text = payload.content?.find((item) => item.type === "text")?.text;
        return text ?? emptyEventsJson;
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
    });
    if (!response.ok) {
        throw new Error(`Google extraction failed with status ${response.status}`);
    }
    const payload = (await response.json());
    return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? emptyEventsJson;
};
const parseNoticeId = (value) => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};
const monthIndexByShortName = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
};
const parseNoticeDateParts = (value) => {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        return {
            year: Number(isoMatch[1]),
            month: Number(isoMatch[2]),
            day: Number(isoMatch[3]),
        };
    }
    const dmyShortMonthMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (dmyShortMonthMatch) {
        const shortMonth = dmyShortMonthMatch[2].toUpperCase();
        const monthIndex = monthIndexByShortName[shortMonth];
        if (monthIndex !== undefined) {
            return {
                year: Number(dmyShortMonthMatch[3]),
                month: monthIndex + 1,
                day: Number(dmyShortMonthMatch[1]),
            };
        }
    }
    const dmyNumericMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyNumericMatch) {
        return {
            year: Number(dmyNumericMatch[3]),
            month: Number(dmyNumericMatch[2]),
            day: Number(dmyNumericMatch[1]),
        };
    }
    const ymdSlashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (ymdSlashMatch) {
        return {
            year: Number(ymdSlashMatch[1]),
            month: Number(ymdSlashMatch[2]),
            day: Number(ymdSlashMatch[3]),
        };
    }
    const verboseMonthMatch = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
    if (verboseMonthMatch) {
        const shortMonth = verboseMonthMatch[1].slice(0, 3).toUpperCase();
        const monthIndex = monthIndexByShortName[shortMonth];
        if (monthIndex !== undefined) {
            return {
                year: Number(verboseMonthMatch[3]),
                month: monthIndex + 1,
                day: Number(verboseMonthMatch[2]),
            };
        }
    }
    return null;
};
const parseNoticeTimeParts = (value) => {
    const normalized = value.trim().toUpperCase();
    const twentyFourHourSecondsMatch = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (twentyFourHourSecondsMatch) {
        return {
            hours: Number(twentyFourHourSecondsMatch[1]),
            minutes: Number(twentyFourHourSecondsMatch[2]),
        };
    }
    const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        return {
            hours: Number(twentyFourHourMatch[1]),
            minutes: Number(twentyFourHourMatch[2]),
        };
    }
    const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    const meridiemSecondsMatch = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/);
    if (meridiemSecondsMatch) {
        const rawHours = Number(meridiemSecondsMatch[1]);
        const minutes = Number(meridiemSecondsMatch[2]);
        const meridiem = meridiemSecondsMatch[4];
        if (rawHours < 1 || rawHours > 12) {
            return null;
        }
        const hours = (rawHours % 12) + (meridiem === "PM" ? 12 : 0);
        return { hours, minutes };
    }
    if (!meridiemMatch) {
        return null;
    }
    const rawHours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2]);
    const meridiem = meridiemMatch[3];
    if (rawHours < 1 || rawHours > 12) {
        return null;
    }
    const hours = (rawHours % 12) + (meridiem === "PM" ? 12 : 0);
    return { hours, minutes };
};
const isValidDateParts = (year, month, day) => {
    if (year < 0 || month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }
    const candidate = new Date(year, month - 1, day);
    return (candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day);
};
const toCanonicalNoticeDate = (value) => {
    const parsed = parseNoticeDateParts(value);
    if (!parsed) {
        return null;
    }
    const { year, month, day } = parsed;
    if (!isValidDateParts(year, month, day)) {
        return null;
    }
    return `${year.toString().padStart(4, "0")}-${month
        .toString()
        .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};
const toCanonicalNoticeTime = (value) => {
    const parsed = parseNoticeTimeParts(value);
    if (!parsed) {
        return null;
    }
    const { hours, minutes } = parsed;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
};
const fetchModelsForProvider = async (provider, apiKey, requestOrigin) => {
    if (provider === "openrouter") {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": requestOrigin,
                "X-Title": "Easy Update",
            },
        });
        if (!response.ok) {
            throw new Error(`OpenRouter request failed with status ${response.status}`);
        }
        const payload = (await response.json());
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
        const payload = (await response.json());
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
            throw new Error(`Anthropic request failed with status ${response.status}`);
        }
        const payload = (await response.json());
        return normalizeModels((payload.data ?? []).map((item) => item.id));
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) {
        throw new Error(`Google request failed with status ${response.status}`);
    }
    const payload = (await response.json());
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
    const noticeOrderTimestamp = sql `
    COALESCE(
      CASE
        WHEN ${noticesTable.date} ~ '^\\d{4}-\\d{1,2}-\\d{1,2}$' THEN to_timestamp(${noticesTable.date} || ' ' || ${noticesTable.time}, 'YYYY-MM-DD HH24:MI')
        WHEN ${noticesTable.date} ~* '^\\d{1,2}-[A-Za-z]{3}-\\d{4}$' THEN to_timestamp(${noticesTable.date} || ' ' || ${noticesTable.time}, 'DD-Mon-YYYY HH24:MI')
        WHEN ${noticesTable.date} ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_timestamp(${noticesTable.date} || ' ' || ${noticesTable.time}, 'DD/MM/YYYY HH24:MI')
        WHEN ${noticesTable.date} ~ '^\\d{4}/\\d{1,2}/\\d{1,2}$' THEN to_timestamp(${noticesTable.date} || ' ' || ${noticesTable.time}, 'YYYY/MM/DD HH24:MI')
        ELSE NULL
      END,
      to_timestamp('9999-12-31 23:59', 'YYYY-MM-DD HH24:MI')
    )
  `;
    const notices = (await db
        .select()
        .from(noticesTable)
        .orderBy(noticeOrderTimestamp, asc(noticesTable.id)));
    const normalizedNotices = notices.map((notice) => {
        const canonicalDate = toCanonicalNoticeDate(notice.date);
        const canonicalTime = toCanonicalNoticeTime(notice.time);
        return {
            ...notice,
            date: canonicalDate ?? notice.date,
            time: canonicalTime ?? notice.time,
        };
    });
    res.json({ data: normalizedNotices });
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
    res.json({ data: notice });
});
app.post("/api/notices", async (req, res) => {
    const { date, time, event } = (req.body ?? {});
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
    const normalizedDate = toCanonicalNoticeDate(date);
    if (!normalizedDate) {
        res.status(400).json({ error: "date format is invalid" });
        return;
    }
    const normalizedTime = toCanonicalNoticeTime(time);
    if (!normalizedTime) {
        res.status(400).json({ error: "time format is invalid" });
        return;
    }
    const [notice] = await db
        .insert(noticesTable)
        .values({
        date: normalizedDate,
        time: normalizedTime,
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
    const { date, time, event } = (req.body ?? {});
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
    const normalizedDate = toCanonicalNoticeDate(date);
    if (!normalizedDate) {
        res.status(400).json({ error: "date format is invalid" });
        return;
    }
    const normalizedTime = toCanonicalNoticeTime(time);
    if (!normalizedTime) {
        res.status(400).json({ error: "time format is invalid" });
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
        date: normalizedDate,
        time: normalizedTime,
        event: event.trim(),
    })
        .where(eq(noticesTable.id, noticeId))
        .returning();
    res.json({ data: (updatedNotice ?? existingNotice) });
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
    res.json({ data: notice });
});
app.post("/api/events/extract-and-create", async (req, res) => {
    const { provider, apiKey, model, inputText } = (req.body ?? {});
    if (typeof provider !== "string" ||
        !validProviders.includes(provider)) {
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
        const extractionText = await extractEventJsonFromModel(provider, model.trim(), apiKey.trim(), inputText, requestOrigin);
        const parsed = parseJsonObjectFromText(extractionText);
        const extractedEvents = validateExtractedEvents(parsed.events);
        if (extractedEvents.length === 0) {
            res.json({ data: { createdCount: 0, events: [] } });
            return;
        }
        const created = await db
            .insert(noticesTable)
            .values(extractedEvents.map((event) => ({
            date: event.date,
            time: event.time,
            event: event.title,
        })))
            .returning();
        res.status(201).json({
            data: {
                createdCount: created.length,
                events: created,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Failed to extract events.";
        res.status(502).json({ error: message });
    }
});
app.post("/api/events", (req, res) => {
    const { title, start } = (req.body ?? {});
    if (typeof title !== "string" || typeof start !== "string") {
        res.status(400).json({ error: "title and start are required strings" });
        return;
    }
    const newEvent = {
        id: String(events.length + 1),
        title,
        start,
    };
    events.push(newEvent);
    res.status(201).json({ data: newEvent });
});
app.post("/api/providers/models", async (req, res) => {
    const { provider, apiKey } = (req.body ?? {});
    if (typeof provider !== "string" ||
        !validProviders.includes(provider)) {
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
        const models = await fetchModelsForProvider(provider, apiKey.trim(), requestOrigin);
        res.json({ data: models });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch models.";
        res.status(502).json({ error: message });
    }
});
app.listen(port, () => {
    console.log(`Express API running on http://localhost:${port}`);
});
