import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { 
  generateToken, 
  verifyToken, 
  hashPassword, 
  comparePassword,
  UnauthorizedError
} from "../middleware/auth.js";

// Mock the JWT_SECRET environment variable
const MOCK_JWT_SECRET = "test-secret-for-testing-only";

describe("Auth middleware utility functions", () => {
  const testUser = { id: 1, email: "test@example.com" };
  const testPassword = "securePassword123";

  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", MOCK_JWT_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("generateToken", () => {
    it("should generate a JWT token", () => {
      const token = generateToken(testUser);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should contain the user data in the payload", () => {
      const token = generateToken(testUser);
      const payload = verifyToken(token);
      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", () => {
      const token = generateToken(testUser);
      const payload = verifyToken(token);
      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
    });

    it("should throw UnauthorizedError for invalid token", () => {
      expect(() => {
        verifyToken("invalid.token.here");
      }).toThrow(UnauthorizedError);
    });
  });

  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const hash = await hashPassword(testPassword);
      expect(typeof hash).toBe("string");
      expect(hash).not.toBe(testPassword);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for the same password", async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("comparePassword", () => {
    it("should return true for correct password", async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await comparePassword(testPassword, hash);
      expect(isValid).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await comparePassword("wrongPassword", hash);
      expect(isValid).toBe(false);
    });
  });
});