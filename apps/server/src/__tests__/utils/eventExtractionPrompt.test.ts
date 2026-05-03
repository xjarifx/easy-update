import { buildEventExtractionSystemPrompt } from "../../utils/eventExtractionPrompt.js";

describe("eventExtractionPrompt", () => {
  it("instructs weekday-only dates to use the immediate next weekday", () => {
    const prompt = buildEventExtractionSystemPrompt(
      new Date("2026-05-03T12:00:00+06:00"),
    );

    expect(prompt).toContain(
      "If the user says a weekday without an explicit date, choose the immediate next occurrence",
    );
    expect(prompt).toContain(
      '"Monday 2 pm" means 2026-05-04 14:00, not 2026-05-03',
    );
  });
});
