import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { requestIdMiddleware } from "./middleware/requestId.js";
import httpLogger from "./middleware/requestLogger.js";
import { eventsRouter } from "./routes/eventsRoutes.js";
import { noticesRouter } from "./routes/noticesRoutes.js";
import { providersRouter } from "./routes/providersRoutes.js";
import { userPreferencesRouter } from "./routes/userPreferencesRoutes.js";
import authRouter from "./routes/authRoutes.js";
import { requireAuthentication } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, "..", "client_dist");

const app = express();
const port = Number(process.env.PORT ?? 4000);

// Security middleware
app.use(helmet());
// Configure CORS with specific origins
const allowedOrigins = [
  process.env.CLIENT_WEB_URL,
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
// Cookie parser (needed even if we don't use cookies for auth, might be used elsewhere)
app.use(cookieParser());

// Body parsing - must come BEFORE routes and rate limiters
app.use(express.json());

// Mount auth routes (public endpoints)
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "easy-update-express-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);

// Protect all other API routes with authentication
app.use("/api", requireAuthentication);

// Mount API routes
app.use("/api/notices", noticesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/providers", providersRouter);
app.use("/api/preferences", userPreferencesRouter);

// Serve static client files
app.use(express.static(clientDistPath));

// 404 handler for API routes (must be after API routes)
app.use("/api", notFoundHandler);

// SPA fallback - serve index.html for all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Express API running on http://localhost:${port}`);
});
