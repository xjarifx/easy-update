import cors from "cors";
import express from "express";
import { eventsRouter } from "./routes/eventsRoutes.js";
import { noticesRouter } from "./routes/noticesRoutes.js";
import { providersRouter } from "./routes/providersRoutes.js";

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

app.use("/api/notices", noticesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/providers", providersRouter);

app.listen(port, () => {
  console.log(`Express API running on http://localhost:${port}`);
});
