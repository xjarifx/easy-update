/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import {
  listNotices,
  findNoticeById,
  findNoticeByExactFields,
  findNoticesByDateAndTitle,
  createNotice,
  createManyNotices,
  updateNotice,
  deleteNotice,
} from "../../repositories/noticesRepository.js";
import { noticesTable } from "../../db/schema.js";

// Mock the db module
vi.mock("../../db/index.js", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  return { db: mockDb };
});

describe("noticesRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listNotices", () => {
    it("should return list of notices for user", async () => {
      const mockNotices = [
        { id: 1, userId: 1, date: "2026-05-03", title: "Test" },
        { id: 2, userId: 1, date: "2026-05-04", title: "Test 2" },
      ];
      const { db } = await import("../../db/index.js");
      (db.orderBy as any).mockResolvedValue(mockNotices);

      const result = await listNotices(1);

      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalledWith(noticesTable);
      expect(db.where).toHaveBeenCalled();
      expect(result).toEqual(mockNotices);
    });
  });

  describe("findNoticeById", () => {
    it("should return notice when found", async () => {
      const mockNotice = { id: 1, userId: 1, title: "Test" };
      const { db } = await import("../../db/index.js");
      (db.limit as any).mockResolvedValue([mockNotice]);

      const result = await findNoticeById(1, 1);

      expect(result).toEqual(mockNotice);
    });

    it("should return null when not found", async () => {
      const { db } = await import("../../db/index.js");
      (db.limit as any).mockResolvedValue([]);

      const result = await findNoticeById(999, 1);

      expect(result).toBeNull();
    });
  });

  describe("findNoticeByExactFields", () => {
    it("should find notice by exact fields", async () => {
      const mockNotice = {
        id: 1,
        userId: 1,
        date: "2026-05-03",
        time: "14:00",
        title: "Test",
      };
      const { db } = await import("../../db/index.js");
      (db.limit as any).mockResolvedValue([mockNotice]);

      const result = await findNoticeByExactFields({
        userId: 1,
        date: "2026-05-03",
        time: "14:00",
        title: "Test",
      });

      expect(result).toEqual(mockNotice);
    });
  });

  describe("findNoticesByDateAndTitle", () => {
    it("should return notices matching date and title", async () => {
      const mockNotices = [
        { id: 1, userId: 1, date: "2026-05-03", title: "Test" },
        { id: 2, userId: 1, date: "2026-05-03", title: "Test" },
      ];
      const { db } = await import("../../db/index.js");
      (db.orderBy as any).mockResolvedValue(mockNotices);

      const result = await findNoticesByDateAndTitle({
        userId: 1,
        date: "2026-05-03",
        title: "Test",
      });

      expect(result).toEqual(mockNotices);
    });
  });

  describe("createNotice", () => {
    it("should create and return new notice", async () => {
      const input = {
        userId: 1,
        date: "2026-05-03",
        time: "14:00",
        title: "New Notice",
        moreInfo: "Info",
        completed: false,
      };
      const mockCreated = { id: 1, ...input };
      const { db } = await import("../../db/index.js");
      (db.returning as any).mockResolvedValue([mockCreated]);

      const result = await createNotice(input);

      expect(db.insert).toHaveBeenCalledWith(noticesTable);
      expect(db.values).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockCreated);
    });
  });

  describe("createManyNotices", () => {
    it("should create multiple notices", async () => {
      const values = [
        { userId: 1, date: "2026-05-03", time: "14:00", title: "Test 1", moreInfo: "", completed: false },
        { userId: 1, date: "2026-05-04", time: "15:00", title: "Test 2", moreInfo: "", completed: false },
      ];
      const mockCreated = values.map((v, i) => ({ id: i + 1, ...v }));
      const { db } = await import("../../db/index.js");
      (db.returning as any).mockResolvedValue(mockCreated);

      const result = await createManyNotices(values);

      expect(result).toEqual(mockCreated);
    });

    it("should return empty array for empty input", async () => {
      const result = await createManyNotices([]);
      expect(result).toEqual([]);
    });
  });

  describe("updateNotice", () => {
    it("should update and return notice", async () => {
      const input = {
        date: "2026-05-03",
        time: "14:00",
        title: "Updated",
        moreInfo: "Updated info",
        completed: true,
      };
      const mockUpdated = { id: 1, userId: 1, ...input };
      const { db } = await import("../../db/index.js");
      (db.returning as any).mockResolvedValue([mockUpdated]);

      const result = await updateNotice(1, 1, input);

      expect(result).toEqual(mockUpdated);
    });

    it("should return null when notice not found", async () => {
      const { db } = await import("../../db/index.js");
      (db.returning as any).mockResolvedValue([]);

      const result = await updateNotice(999, 1, {
        date: "2026-05-03",
        time: "14:00",
        title: "Updated",
        moreInfo: "",
        completed: false,
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteNotice", () => {
    it("should delete and return notice", async () => {
      const mockDeleted = { id: 1, userId: 1, title: "Deleted" };
      const { db } = await import("../../db/index.js");
      (db.returning as any).mockResolvedValue([mockDeleted]);

      const result = await deleteNotice(1, 1);

      expect(result).toEqual(mockDeleted);
    });

    it("should return null when notice not found", async () => {
      const { db } = await import("../../db/index.js");
      (db.returning as any).mockResolvedValue([]);

      const result = await deleteNotice(999, 1);

      expect(result).toBeNull();
    });
  });
});
