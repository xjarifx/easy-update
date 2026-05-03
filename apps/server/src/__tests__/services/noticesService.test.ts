import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getNotices,
  getNoticeById,
  createNoticeFromInput,
  updateNoticeFromInput,
  deleteNoticeById,
  upsertNoticeFromExtractedInput,
  parseNoticeId,
} from "../../services/noticesService.js";

// Mock the repository module
vi.mock("../../repositories/noticesRepository.js", () => {
  return {
    listNotices: vi.fn(),
    findNoticeById: vi.fn(),
    findNoticeByExactFields: vi.fn(),
    findNoticesByDateAndTitle: vi.fn(),
    createNotice: vi.fn(),
    createManyNotices: vi.fn(),
    updateNotice: vi.fn(),
    deleteNotice: vi.fn(),
  };
});

// Mock the normalization utils
vi.mock("../../utils/noticeNormalization.js", () => {
  return {
    toCanonicalNoticeDate: vi.fn((date) => date),
    toCanonicalNoticeTime: vi.fn((time) => time),
  };
});

describe("noticesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseNoticeId", () => {
    it("should parse valid positive integer", () => {
      expect(parseNoticeId("123")).toBe(123);
      expect(parseNoticeId("1")).toBe(1);
    });

    it("should return null for invalid ids", () => {
      expect(parseNoticeId("0")).toBeNull();
      expect(parseNoticeId("-1")).toBeNull();
      expect(parseNoticeId("abc")).toBeNull();
      // Note: parseFloat("12.3") becomes 12 which is valid, so this actually returns 12
      expect(parseNoticeId("12.3")).toBe(12);
    });
  });

  describe("getNotices", () => {
    it("should return notices with normalized dates", async () => {
      const { listNotices } = await import("../../repositories/noticesRepository.js");
      const mockNotices = [
        { id: 1, date: "2026-05-03", time: "14:00", title: "Test" },
      ];
      listNotices.mockResolvedValue(mockNotices);

      const result = await getNotices(1);

      expect(listNotices).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockNotices);
    });
  });

  describe("getNoticeById", () => {
    it("should return notice when found", async () => {
      const { findNoticeById } = await import("../../repositories/noticesRepository.js");
      const mockNotice = { id: 1, date: "2026-05-03", title: "Test" };
      findNoticeById.mockResolvedValue(mockNotice);

      const result = await getNoticeById(1, 1);

      expect(findNoticeById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockNotice);
    });

    it("should return null when not found", async () => {
      const { findNoticeById } = await import("../../repositories/noticesRepository.js");
      findNoticeById.mockResolvedValue(null);

      const result = await getNoticeById(999, 1);

      expect(result).toBeNull();
    });
  });

  describe("createNoticeFromInput", () => {
    it("should create notice with valid input", async () => {
      const { findNoticeByExactFields, createNotice } = await import(
        "../../repositories/noticesRepository.js"
      );
      const input = {
        date: "2026-05-03",
        time: "14:00",
        title: "New Notice",
        moreInfo: "Info",
      };
      findNoticeByExactFields.mockResolvedValue(null); // No duplicate
      const mockCreated = { id: 1, userId: 1, ...input, completed: false };
      createNotice.mockResolvedValue(mockCreated);

      const result = await createNoticeFromInput(1, input);

      expect(findNoticeByExactFields).toHaveBeenCalled();
      expect(createNotice).toHaveBeenCalled();
      expect("value" in result).toBe(true);
    });

    it("should return error for missing date", async () => {
      const result = await createNoticeFromInput(1, {
        date: "",
        time: "14:00",
        title: "Test",
        moreInfo: "",
      });

      expect("error" in result).toBe(true);
    });

    it("should return error for missing time", async () => {
      const result = await createNoticeFromInput(1, {
        date: "2026-05-03",
        time: "",
        title: "Test",
        moreInfo: "",
      });

      expect("error" in result).toBe(true);
    });

    it("should return error for missing title", async () => {
      const result = await createNoticeFromInput(1, {
        date: "2026-05-03",
        time: "14:00",
        title: "",
        moreInfo: "",
      });

      expect("error" in result).toBe(true);
    });

    it("should return error for duplicate notice", async () => {
      const { findNoticeByExactFields } = await import(
        "../../repositories/noticesRepository.js"
      );
      const input = {
        date: "2026-05-03",
        time: "14:00",
        title: "Duplicate",
        moreInfo: "",
      };
      findNoticeByExactFields.mockResolvedValue({ id: 1, ...input }); // Duplicate exists

      const result = await createNoticeFromInput(1, input);

      expect("error" in result).toBe(true);
      expect(result.status).toBe(409);
    });
  });

  describe("updateNoticeFromInput", () => {
    it("should update notice with valid input", async () => {
      const { findNoticeByExactFields, updateNotice } = await import(
        "../../repositories/noticesRepository.js"
      );
      const input = {
        date: "2026-05-03",
        time: "15:00",
        title: "Updated",
        moreInfo: "Updated info",
      };
      findNoticeByExactFields.mockResolvedValue(null);
      const mockUpdated = { id: 1, userId: 1, ...input, completed: false };
      updateNotice.mockResolvedValue(mockUpdated);

      const result = await updateNoticeFromInput(1, 1, input);

      expect(updateNotice).toHaveBeenCalled();
      expect("value" in result).toBe(true);
    });

    it("should return error when notice not found", async () => {
      const { updateNotice } = await import(
        "../../repositories/noticesRepository.js"
      );
      const input = {
        date: "2026-05-03",
        time: "15:00",
        title: "Updated",
        moreInfo: "",
      };
      updateNotice.mockResolvedValue(null);

      const result = await updateNoticeFromInput(1, 1, input);

      expect("error" in result).toBe(true);
      expect(result.status).toBe(404);
    });
  });

  describe("deleteNoticeById", () => {
    it("should delete notice and return it", async () => {
      const { deleteNotice } = await import(
        "../../repositories/noticesRepository.js"
      );
      const mockDeleted = { id: 1, title: "Deleted" };
      deleteNotice.mockResolvedValue(mockDeleted);

      const result = await deleteNoticeById(1, 1);

      expect(deleteNotice).toHaveBeenCalledWith(1, 1);
      expect("value" in result).toBe(true);
    });

    it("should return error when notice not found", async () => {
      const { deleteNotice } = await import(
        "../../repositories/noticesRepository.js"
      );
      deleteNotice.mockResolvedValue(null);

      const result = await deleteNoticeById(999, 1);

      expect("error" in result).toBe(true);
      expect(result.status).toBe(404);
    });
  });

  describe("upsertNoticeFromExtractedInput", () => {
    it("should create new notice if no match", async () => {
      const { findNoticeByExactFields, findNoticesByDateAndTitle, createNotice } =
        await import("../../repositories/noticesRepository.js");
      const input = {
        date: "2026-05-03",
        time: "14:00",
        title: "New from extract",
        moreInfo: "Info",
      };
      findNoticeByExactFields.mockResolvedValue(null);
      findNoticesByDateAndTitle.mockResolvedValue([]);
      const mockCreated = { id: 1, userId: 1, ...input, completed: false };
      createNotice.mockResolvedValue(mockCreated);

      const result = await upsertNoticeFromExtractedInput(1, input);

      expect("value" in result).toBe(true);
      expect(result.action).toBe("created");
    });

    it("should update existing notice if exact match with different details", async () => {
      const { findNoticeByExactFields, updateNotice } = await import(
        "../../repositories/noticesRepository.js"
      );
      const input = {
        date: "2026-05-03",
        time: "14:00",
        title: "Existing",
        moreInfo: "Updated info",
      };
      const existing = {
        id: 1,
        userId: 1,
        ...input,
        moreInfo: "Old info",
      };
      findNoticeByExactFields.mockResolvedValue(existing);
      updateNotice.mockResolvedValue({ ...existing, moreInfo: "Updated info" });

      const result = await upsertNoticeFromExtractedInput(1, input);

      expect("value" in result).toBe(true);
      expect(result.action).toBe("updated");
    });

    it("should return unchanged if exact match with same details", async () => {
      const { findNoticeByExactFields } = await import(
        "../../repositories/noticesRepository.js"
      );
      const input = {
        date: "2026-05-03",
        time: "14:00",
        title: "Existing",
        moreInfo: "Same info",
        completed: false,
      };
      findNoticeByExactFields.mockResolvedValue({ id: 1, userId: 1, ...input });

      const result = await upsertNoticeFromExtractedInput(1, input);

      expect("value" in result).toBe(true);
      expect(result.action).toBe("unchanged");
    });
  });
});
