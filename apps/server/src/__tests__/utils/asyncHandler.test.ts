/* eslint-disable @typescript-eslint/no-explicit-any */
import { asyncHandler } from "../../utils/asyncHandler.js";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("asyncHandler", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {};
    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("should call the handler function", async () => {
    const handler = asyncHandler(async (_req, res) => {
      res.json({ success: true });
    });

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it("should catch async errors and pass to next", async () => {
    const error = new Error("Test error");
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should handle sync errors", async () => {
    const error = new Error("Sync error");
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should pass correct arguments to handler", async () => {
    const handler = asyncHandler(async (req, res, next) => {
      res.json({ req, res, next });
    });

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ req, res, next }),
    );
  });
});
