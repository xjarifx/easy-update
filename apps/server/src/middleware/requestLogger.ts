import pinoHttp from "pino-http";
import logger from "../utils/logger.js";

/**
 * HTTP request logging middleware
 * Logs incoming requests and responses
 */
// @ts-expect-error - pino-http v11 type definitions are incompatible
const httpLogger = pinoHttp({
  logger,
  // Don't log health check requests to reduce noise
  ignore: (req: { url?: string }) => {
    return req.url === "/api/health";
  },
  // Custom serializers to avoid logging sensitive data
  serializers: {
    req: (req: { method?: string; url?: string; headers?: Record<string, string> }) => ({
      method: req.method,
      url: req.url,
      // Don't log headers that might contain sensitive info
      headers: {
        "content-type": req.headers?.["content-type"],
        "user-agent": req.headers?.["user-agent"],
      },
    }),
    res: (res: { statusCode?: number }) => ({
      statusCode: res.statusCode,
    }),
    err: (err: Error & { type?: string }) => {
      return {
        type: err.type,
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      };
    },
  },
});

export default httpLogger;