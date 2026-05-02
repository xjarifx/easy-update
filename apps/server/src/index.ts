import cors from "cors";
import express from "express";
import { eventsRouter } from "./routes/eventsRoutes.js";
import { noticesRouter } from "./routes/noticesRoutes.js";
import { providersRouter } from "./routes/providersRoutes.js";
import { requireAuthentication } from "./middleware/clerkAuth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "easy-update-express-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", requireAuthentication);

app.use("/api/notices", noticesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/providers", providersRouter);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Express API running on http://localhost:${port}`);
});
