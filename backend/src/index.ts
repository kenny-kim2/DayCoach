import "dotenv/config";
import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", analyzeRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DayCoach backend running on http://localhost:${PORT}`);
});

export default app;
