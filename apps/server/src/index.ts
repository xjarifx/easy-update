import "dotenv/config";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { requestIdMiddleware } = from "./middleware/requestId.js";
import httpLogger from "./middleware/requestLogger.js";
import { csrfProtection, csrfErrorHandler } = from "./middleware/csrfProtection.js";
import { eventsRouter } from "./routes/eventsRoutes.js";
import { noticesRouter } from "./routes/noticesRoutes.js";
import { providersRouter } from "./routes/providersRoutes.js";
import { userPreferencesRouter } from "./routes/userPreferencesRoutes.js";
import authRouter from "./routes/authRoutes.js";
import { requireAuthentication } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

// Security middleware
app.use(helmet());
// Configure CORS with specific origins
const allowedOrigins = [
  process.env.CLIENT-WEB_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://easy-update.vercel.app"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
// Request ID middleware
app.use(requestIdMiddleware);
// Request logging
app.use(httpLogger);
// Cookie parser for CSRF
app.use(cookieParser());
// CSRF protection - exempt auth routes since they don't need CSRF
app.use("/api/auth/", (req, res, next) => {
  // Skip CSRF for auth routes
  next();
});
app.use(csrfProtection);
// CSRF error handling
app.use(csrfErrorHandler);
// Compression
app.use(compression());
// Body parsing
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "easy-update-express-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);

app.use("/api", requireAuthentication);

app.use("/api/notices", noticesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/providers", providersRouter);
app.use("/api/preferences", userPreferencesRouter);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Express API running on http://localhost:${port}`);
});
