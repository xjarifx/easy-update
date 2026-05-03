import {
  toCanonicalNoticeDate,
  toCanonicalNoticeTime,
} from "../../utils/noticeNormalization.js";

describe("noticeNormalization", () => {
  describe("toCanonicalNoticeDate", () => {
    it("should parse ISO format YYYY-MM-DD", () => {
      expect(toCanonicalNoticeDate("2026-05-03")).toBe("2026-05-03");
    });

    it("should parse DD-Mon-YYYY format", () => {
      expect(toCanonicalNoticeDate("03-May-2026")).toBe("2026-05-03");
      expect(toCanonicalNoticeDate("3-JAN-2025")).toBe("2025-01-03");
    });

    it("should parse DD/MM/YYYY format", () => {
      expect(toCanonicalNoticeDate("03/05/2026")).toBe("2026-05-03");
    });

    it("should parse YYYY/MM/DD format", () => {
      expect(toCanonicalNoticeDate("2026/05/03")).toBe("2026-05-03");
    });

    it("should parse verbose month format", () => {
      expect(toCanonicalNoticeDate("May 3, 2026")).toBe("2026-05-03");
      expect(toCanonicalNoticeDate("January 15, 2025")).toBe("2025-01-15");
    });

    it("should parse month day without year (assumes current or next year)", () => {
      const result = toCanonicalNoticeDate("May 3");
      expect(result).toMatch(/^\d{4}-05-03$/);
    });

    it("should return null for invalid dates", () => {
      expect(toCanonicalNoticeDate("invalid")).toBeNull();
      expect(toCanonicalNoticeDate("2026-13-01")).toBeNull();
      expect(toCanonicalNoticeDate("32-05-2026")).toBeNull();
    });

    it("should handle edge cases", () => {
      expect(toCanonicalNoticeDate("")).toBeNull();
      expect(toCanonicalNoticeDate("   ")).toBeNull();
    });
  });

  describe("toCanonicalNoticeTime", () => {
    it("should parse 24-hour format HH:MM", () => {
      expect(toCanonicalNoticeTime("14:30")).toBe("14:30");
      expect(toCanonicalNoticeTime("09:05")).toBe("09:05");
    });

    it("should parse 24-hour format with seconds", () => {
      expect(toCanonicalNoticeTime("14:30:00")).toBe("14:30");
    });

    it("should parse 12-hour format with AM/PM", () => {
      expect(toCanonicalNoticeTime("2:30 PM")).toBe("14:30");
      expect(toCanonicalNoticeTime("2:30 AM")).toBe("02:30");
      expect(toCanonicalNoticeTime("12:00 PM")).toBe("12:00");
      expect(toCanonicalNoticeTime("12:00 AM")).toBe("00:00");
    });

    it("should parse 12-hour format with seconds", () => {
      expect(toCanonicalNoticeTime("2:30:45 PM")).toBe("14:30");
    });

    it("should handle 'no time' case", () => {
      expect(toCanonicalNoticeTime("no time")).toBe("no time");
      expect(toCanonicalNoticeTime("No Time")).toBe("no time");
    });

    it("should return null for invalid times", () => {
      expect(toCanonicalNoticeTime("25:00")).toBeNull();
      expect(toCanonicalNoticeTime("14:60")).toBeNull();
      expect(toCanonicalNoticeTime("invalid")).toBeNull();
    });

    it("should handle edge cases", () => {
      expect(toCanonicalNoticeTime("")).toBeNull();
      expect(toCanonicalNoticeTime("   ")).toBeNull();
    });
  });
});
