import cors from "cors";
import express from "express";
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
        res
            .status(400)
            .json({
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
