import csrf from "csurf";
import cookieParser from "cookie-parser";
import { type Request, type Response, type NextFunction } from "express";

/**
 * CSRF protection middleware
 * Initializes CSRF protection with cookie storage
 */
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});

/**
 * Middleware to handle CSRF errors
 */
export const csrfErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      error: {
        message: "Invalid or missing CSRF token",
        statusCode: 403,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Pass other errors to the global error handler
  _next(err);
};