import { AppError, ValidationError, NotFoundError, UnauthorizedError, ConflictError, BadGatewayError } from "../../utils/errors.js";

describe("Error classes", () => {
  describe("AppError", () => {
    it("should create error with status code and message", () => {
      const error = new AppError(500, "Internal server error");
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Internal server error");
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("ValidationError", () => {
    it("should create 400 error", () => {
      const error = new ValidationError("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Invalid input");
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe("NotFoundError", () => {
    it("should create 404 error with default message", () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Resource not found");
    });

    it("should create 404 error with custom resource", () => {
      const error = new NotFoundError("Notice");
      expect(error.message).toBe("Notice not found");
    });
  });

  describe("UnauthorizedError", () => {
    it("should create 401 error with default message", () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
    });

    it("should create 401 error with custom message", () => {
      const error = new UnauthorizedError("Invalid token");
      expect(error.message).toBe("Invalid token");
    });
  });

  describe("ConflictError", () => {
    it("should create 409 error", () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Resource already exists");
    });
  });

  describe("BadGatewayError", () => {
    it("should create 502 error", () => {
      const error = new BadGatewayError();
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe("Service unavailable");
    });
  });
});
