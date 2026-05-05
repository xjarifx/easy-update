import { Router } from "express";
import { z } from "zod";
import {
  registerUser,
  loginUser,
} from "../middleware/auth.js";
import { UnauthorizedError } from "../utils/errors.js";
import { authLimiter, loginLimiter } from "../middleware/rateLimiter.js";

const router: ReturnType<typeof Router> = Router();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      throw new UnauthorizedError(result.error.issues[0].message);
    }

    const { email, password } = result.data;

    const { user, token } = await registerUser(email, password);

    res.status(201).json({ data: { user, token } });
  } catch (error) {
    next(error);
  }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      throw new UnauthorizedError(result.error.issues[0].message);
    }

    const { email, password } = result.data;

    const { user, token } = await loginUser(email, password);

    res.json({ data: { user, token } });
  } catch (error) {
    next(error);
  }
});

export default router;