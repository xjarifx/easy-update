import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import { UnauthorizedError } from "../utils/errors.js";
import type { AuthUser } from "@easy-update/types";
import { sendWelcomeEmail } from "../services/emailService.js";

type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
};

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined in environment variables");
}
const JWT_EXPIRES_IN = "7d";

export const generateToken = (user: { id: number; email: string }): string => {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): { userId: number; email: string } => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      email: string;
    };
    return payload;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const getAuthenticatedUserId = (req: Request) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.authUser?.id) {
    throw new UnauthorizedError("Authentication required");
  }

  return authReq.authUser.id;
};

export const requireAuthentication = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.get("authorization");

  if (!authHeader) {
    next(new UnauthorizedError("Missing authorization token"));
    return;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    next(new UnauthorizedError("Invalid authorization header"));
    return;
  }

  try {
    const payload = verifyToken(token);

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);

    if (!user) {
      next(new UnauthorizedError("User not found"));
      return;
    }

    (req as AuthenticatedRequest).authUser = {
      id: user.id,
      email: user.email,
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

export const registerUser = async (email: string, password: string) => {
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new UnauthorizedError("Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash })
    .returning();

  if (user.email) {
    sendWelcomeEmail().catch((err) =>
      console.error("Failed to send welcome email:", err),
    );
  }

  const token = generateToken({ id: user.id, email: user.email });

  return {
    user: { id: user.id, email: user.email },
    token,
  };
};

export const loginUser = async (email: string, password: string) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const validPassword = await comparePassword(password, user.passwordHash);

  if (!validPassword) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = generateToken({ id: user.id, email: user.email });

  return {
    user: { id: user.id, email: user.email },
    token,
  };
};
