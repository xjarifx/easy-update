import { type Request, type Response, type NextFunction } from "express";
import { doubleCsrf, type DoubleCsrfUtilities } from "csrf-csrf";

const csrfUtilities: DoubleCsrfUtilities = doubleCsrf({
  getSecret: () => process.env.JWT_SECRET || "change-me-in-production",
  getSessionIdentifier: (req: Request) => (req as unknown as { sessionID?: string }).sessionID || (req.headers["x-forwarded-for"] as string) || req.ip || "anonymous",
  cookieName: "csrf_token",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

export const csrfProtection = csrfUtilities.doubleCsrfProtection;

export const generateCsrfToken = (req: Request, res: Response) => {
  const token = csrfUtilities.generateCsrfToken(req, res);
  res.json({ csrfToken: token });
};

export const csrfErrorHandler = (
  err: Error & { code?: string },
  _req: Request,
  res: Response,
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

  _next(err);
};
