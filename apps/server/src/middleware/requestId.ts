import { v4 as uuidv4 } from "uuid";
import type { Request, Response, NextFunction } from "express";

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 */
export const requestIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const requestId = req.get("X-Request-ID") ?? uuidv4();
  (req as any).requestId = requestId;
  
  // Also set it on the response header for client access
  _res.set("X-Request-ID", requestId);
  
  next();
};

/**
 * Request logging middleware with request ID
 * Logs requests with timing and request ID
 */
export const requestLoggerWithId = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId;
  const startTime = Date.now();
  
  // Log request start
  // We'll use the existing pino logger for this
  
  // Attach request ID to response when finished
  _res.on("finish", () => {
    const duration = Date.now() - startTime;
    // Import logger here to avoid circular dependencies
    const logger = (global as any).logger || require("../utils/logger.js").default;
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: _res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });
  });
  
  next();
};