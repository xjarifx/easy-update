import pino from "pino";

// Create logger instance
const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

export default logger;