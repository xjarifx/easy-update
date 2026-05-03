import { verifyToken } from "@clerk/backend";
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
     const payload = await verifyToken(token, {
       secretKey: process.env.CLERK_SECRET_KEY,
       issuer: process.env.CLERK_ISSUER,
       clockSkewInMs: 30000, // Allow 30 seconds of clock skew
       authorizedParties: [
         'http://localhost:5173',
         'https://sunny-toad-29.clerk.accounts.dev',
       ],
     });

    const clerkId = payload.sub as string;

    if (!clerkId) {
      next(new UnauthorizedError("Invalid token: missing subject"));
      return;
    }

    // Find user in our DB by Clerk ID
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId))
      .limit(1);

    // If user doesn't exist, create them
    if (!user) {
      const newUser = {
        clerkId: clerkId as string,
        email: (payload.email ?? "") as string,
      };
      [user] = await db
        .insert(usersTable)
        .values(newUser)
        .returning();

      // Send welcome email
      if (user.email) {
        await sendWelcomeEmail(user.email).catch((err) =>
          console.error("Failed to send welcome email:", err),
        );
      }
    }

    (req as AuthenticatedRequest).authUser = {
      id: user.id,
      email: user.email,
      clerkId: user.clerkId,
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
