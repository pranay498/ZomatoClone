import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./src/config/db";
import { connectRabbitMQ } from "./src/config/rabbitmq";
import { elasticService } from "./src/services/elastic.service";
import { startSearchConsumer } from "./src/consumer/searchConsumer";
import searchRoutes from "./src/routes/search.routes";
import { errorHandler } from "./src/middleware/error.middleware";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK", service: "Search Service" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/search", searchRoutes);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8004;

const start = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    await connectRabbitMQ();

    await elasticService.createIndices();

    await startSearchConsumer();
    console.log("✅ Search consumer started");

    app.listen(PORT, () => {
      console.log(`🔍 Search Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Search Service startup failed:", error);
    process.exit(1);
  }
};

start();

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
