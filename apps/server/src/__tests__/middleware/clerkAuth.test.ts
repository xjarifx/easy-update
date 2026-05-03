 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyToken } from "@clerk/backend";
import { getAuthenticatedUserId } from "../../middleware/clerkAuth.js";
import { UnauthorizedError } from "../../utils/errors.js";

// Mock @clerk/backend
vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
}));

// Mock email service to avoid Resend initialization
vi.mock("../../services/emailService.js", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock db module
vi.mock("../../db/index.js", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

describe("clerkAuth middleware", () => {
  describe("getAuthenticatedUserId", () => {
    it("should return user id from authUser", () => {
      const req = {
        authUser: { id: 1, email: "test@example.com" },
      };

      const result = getAuthenticatedUserId(req as any);

      expect(result).toBe(1);
    });

    it("should throw UnauthorizedError if no authUser", () => {
      const req = {};

      expect(() => getAuthenticatedUserId(req as any)).toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError if authUser has no id", () => {
      const req = { authUser: {} };

      expect(() => getAuthenticatedUserId(req as any)).toThrow(UnauthorizedError);
    });
  });

  describe("requireAuthentication", () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
      req = {
        get: vi.fn(),
      };
      res = {};
      next = vi.fn();
      vi.clearAllMocks();
    });

    it("should call next with UnauthorizedError if no auth header", async () => {
      req.get.mockReturnValue(undefined);

      const middleware = await import("../../middleware/clerkAuth.js");
      await middleware.requireAuthentication(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should call next with UnauthorizedError if invalid header format", async () => {
      req.get.mockReturnValue("Invalid token");

      const middleware = await import("../../middleware/clerkAuth.js");
      await middleware.requireAuthentication(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should call next with UnauthorizedError if token verification fails", async () => {
      req.get.mockReturnValue("Bearer invalid_token");
      (verifyToken as any).mockRejectedValue(new Error("Invalid token"));

      const middleware = await import("../../middleware/clerkAuth.js");
      await middleware.requireAuthentication(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should set authUser and call next on success", async () => {
      req.get.mockReturnValue("Bearer valid_token");
      (verifyToken as any).mockResolvedValue({
        sub: "clerk_user_123",
      });

      const { db } = await import("../../db/index.js");
      (db.limit as any).mockResolvedValue([]); // No existing user
      (db.returning as any).mockResolvedValue([
        { id: 1, clerkId: "clerk_user_123", email: "test@example.com" },
      ]);

      const middleware = await import("../../middleware/clerkAuth.js");
      await middleware.requireAuthentication(req, res, next);

      expect(req.authUser).toBeDefined();
      expect(req.authUser.id).toBe(1);
      expect(next).toHaveBeenCalledWith(); // Called with no error
    });
  });
});
