import type { ExtractedEvent, ProviderId } from "../domain/types.js";
import { AppError } from "../utils/errors.js";
import {
  toCanonicalNoticeDate,
  toCanonicalNoticeTime,
} from "../utils/noticeNormalization.js";
import { eventExtractionSystemPrompt } from "../../../docs/eventExtractionPrompt.js";

const emptyEventsJson = '{"events":[]}';

const readProviderErrorMessage = async (
  response: Response,
  providerName: string,
  fallback: string,
) => {
  const withHint = (message: string) => {
    const normalized = message.trim();

    if (response.status === 429) {
      return `${providerName} rate limit reached (429). ${normalized}`;
    }

    return normalized;
  };

  try {
    const payload = (await response.json()) as {
      error?:
        | {
            message?: string;
            metadata?: {
              raw?: string;
              provider_name?: string;
            };
            code?: string;
          }
        | string;
      message?: string;
    };

    if (typeof payload.error === "string" && payload.error.trim()) {
      return withHint(payload.error);
    }

    if (
      payload.error &&
      typeof payload.error === "object" &&
      typeof payload.error.message === "string" &&
      payload.error.message.trim()
    ) {
      const message = payload.error.message;

      if (
        message.trim().toLowerCase() === "provider returned error" &&
        typeof payload.error.metadata?.raw === "string" &&
        payload.error.metadata.raw.trim()
      ) {
        return withHint(payload.error.metadata.raw);
      }

      return withHint(message);
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return withHint(payload.message);
    }
  } catch {
    // Ignore body parsing failures and use fallback status message.
  }

  return withHint(fallback);
};

const parseJsonObjectFromText = (value: string) => {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a valid JSON object.");
  }

  return JSON.parse(value.slice(start, end + 1)) as { events?: unknown };
};

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
      const normalizedDate = toCanonicalNoticeDate(date);
      const normalizedTime = toCanonicalNoticeTime(time);

      if (!normalizedTitle || !normalizedDate || !normalizedTime) {
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
      const message = await readProviderErrorMessage(
        response,
        "OpenRouter",
        `OpenRouter extraction failed with status ${response.status}`,
      );

      throw new AppError(response.status, message);
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
      const message = await readProviderErrorMessage(
        response,
        "OpenAI",
        `OpenAI extraction failed with status ${response.status}`,
      );

      throw new AppError(response.status, message);
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
      const message = await readProviderErrorMessage(
        response,
        "Anthropic",
        `Anthropic extraction failed with status ${response.status}`,
      );

      throw new AppError(response.status, message);
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
    const message = await readProviderErrorMessage(
      response,
      "Google",
      `Google extraction failed with status ${response.status}`,
    );

    throw new AppError(response.status, message);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? emptyEventsJson;
};

export const extractEvents = async (input: {
  provider: ProviderId;
  model: string;
  apiKey: string;
  inputText: string;
  requestOrigin: string;
}) => {
  const extractionText = await extractEventJsonFromModel(
    input.provider,
    input.model,
    input.apiKey,
    input.inputText,
    input.requestOrigin,
  );

  const parsed = parseJsonObjectFromText(extractionText);

  return validateExtractedEvents(parsed.events);
};
