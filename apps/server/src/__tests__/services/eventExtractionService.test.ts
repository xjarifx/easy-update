import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the dependencies
vi.mock("../../utils/errors.js", () => ({
  AppError: class AppError extends Error {
    constructor(public statusCode: number, message: string) {
      super(message);
    }
  },
}));

vi.mock("../../utils/noticeNormalization.js", () => ({
  toCanonicalNoticeDate: vi.fn((date) => date),
  toCanonicalNoticeTime: vi.fn((time) => time),
}));

vi.mock("../../utils/eventExtractionPrompt.js", () => ({
  buildEventExtractionSystemPrompt: vi.fn(() => "Extract events prompt"),
}));

describe("eventExtractionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractEvents", () => {
    it("should extract events from OpenRouter", async () => {
      // Mock fetch for OpenRouter
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
       json: () => ({
         choices: [{ message: { content: '{"events": [{"title": "Test", "date": "2026-05-03", "time": "14:00", "moreInfo": ""}]}' } }],
       }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { extractEvents } = await import("../../services/eventExtractionService.js");

      const result = await extractEvents({
        provider: "openrouter",
        model: "test-model",
        apiKey: "test-key",
        inputText: "Test event",
        requestOrigin: "http://localhost:3000",
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test");
    });

    it("should return empty array for no events", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
       json: () => ({
         choices: [{ message: { content: '{"events": []}' } }],
       }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { extractEvents } = await import("../../services/eventExtractionService.js");

      const result = await extractEvents({
        provider: "openai",
        model: "test-model",
        apiKey: "test-key",
        inputText: "Test event",
        requestOrigin: "http://localhost:3000",
      });

      expect(result).toHaveLength(0);
    });

    it("should handle invalid JSON response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
       json: () => ({
         choices: [{ message: { content: "invalid json" } }],
       }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { extractEvents } = await import("../../services/eventExtractionService.js");

      const result = await extractEvents({
        provider: "openai",
        model: "test-model",
        apiKey: "test-key",
        inputText: "Test event",
        requestOrigin: "http://localhost:3000",
      });

      expect(result).toHaveLength(0);
    });
  });
});
