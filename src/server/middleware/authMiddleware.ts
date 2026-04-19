import type { NextFunction, Request, Response } from "express";
import { parseAuthToken } from "../utils/auth.js";
import { UnauthorizedError } from "../utils/errors.js";

type AuthenticatedRequest = Request & {
  authUser?: {
    id: number;
    email: string;
  };
};

const parseBearerToken = (authHeader: string | undefined) => {
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

export const getAuthenticatedUserId = (req: Request) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.authUser?.id) {
    throw new UnauthorizedError("Authentication required");
  }

  return authReq.authUser.id;
};

export const requireAuthentication = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.method.toUpperCase() === "OPTIONS") {
    next();
    return;
  }

  const token = parseBearerToken(req.get("authorization"));

  if (!token) {
    next(new UnauthorizedError("Missing authorization token"));
    return;
  }

  try {
    const payload = parseAuthToken(token);
    (req as AuthenticatedRequest).authUser = {
      id: payload.sub,
      email: payload.email,
    };
    next();
  } catch (error) {
    next(
      error instanceof UnauthorizedError
        ? error
        : new UnauthorizedError("Invalid authorization token"),
    );
  }
};
