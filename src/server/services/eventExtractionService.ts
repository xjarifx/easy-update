import type { ExtractedEvent, ProviderId } from "../domain/types.js";
import {
  toCanonicalNoticeDate,
  toCanonicalNoticeTime,
} from "../utils/noticeNormalization.js";
import { eventExtractionSystemPrompt } from "../../../docs/eventExtractionPrompt.js";

const emptyEventsJson = '{"events":[]}';

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
