import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication endpoints
 * Limits to 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many attempts, please try again after 15 minutes",
  },
});

/**
 * Rate limiter for login endpoint specifically
 * More strict: 3 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts, please try again after 15 minutes",
  },
});