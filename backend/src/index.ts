import "dotenv/config";
import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { stopCopilotClient } from "./agent/client";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

if (CORS_ORIGIN === "*") {
  console.warn("[CORS] CORS_ORIGIN not set — allowing all origins. Set CORS_ORIGIN in production.");
}

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", rateLimiter, analyzeRouter);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`DayCoach backend running on http://localhost:${PORT}`);
});

async function shutdown() {
  server.close();
  await stopCopilotClient();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
