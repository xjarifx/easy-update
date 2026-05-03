import { type Request, type Response, type NextFunction } from "express";
import { AppError } from "../utils/errors.js";

interface ErrorResponse {
  error: {
    message: string;
    statusCode: number;
    timestamp: string;
  };
  stack?: string;
}

/**
 * Global error handling middleware
 * Must be added after all other middleware and routes
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  const isDevelopment = process.env.NODE_ENV === "development";

  let statusCode = 500;
  let message = "Internal server error";

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Handle other known error types
  else if (err instanceof SyntaxError) {
    statusCode = 400;
    message = "Invalid request format";
  }

  const response: ErrorResponse = {
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack trace in development
  if (isDevelopment && !(err instanceof AppError)) {
    response.stack = err.stack;
  }

  // Log error
  console.error(`[${response.error.statusCode}]`, {
    message: err.message,
    stack: err.stack,
    timestamp: response.error.timestamp,
  });

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found middleware
 * Must be added before error handler
 */
export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: "Route not found",
      statusCode: 404,
      timestamp: new Date().toISOString(),
    },
  });
};
