/**
 * Custom error classes for API error handling
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class BadGatewayError extends AppError {
  constructor(message: string = "Service unavailable") {
    super(502, message);
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}
