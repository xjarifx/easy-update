import pinoHttp from "pino-http";
import logger from "./logger.js";

/**
 * HTTP request logging middleware
 * Logs incoming requests and responses
 */
const httpLogger = pinoHttp({
  logger,
  // Don't log health check requests to reduce noise
  ignore: (req, res) => {
    return req.url === "/api/health";
  },
  // Custom serializers to avoid logging sensitive data
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      // Don't log headers that might contain sensitive info
      headers: {
        "content-type": req.headers["content-type"],
        "user-agent": req.headers["user-agent"],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: (err) => {
      return {
        type: err.type,
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      };
    },
  },
});

export default httpLogger;