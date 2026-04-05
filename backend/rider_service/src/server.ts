import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";
import { connectRabbitMQ } from "./config/rabbitmq";
import { errorMiddleware, AppError } from "./utils/AppError";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5003;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MIDDLEWARE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(
  cors({
    origin: process.env.GATEWAY_URL || "http://localhost:5000",
    credentials: true,
  })
);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📍 [Rider Service] ${req.method} ${req.path}`);
  next();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Rider Service is running ✅",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  throw new AppError(`Route not found: ${req.originalUrl}`, 404);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ERROR HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(errorMiddleware);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATABASE & SERVER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🚗 RIDER SERVICE STARTED SUCCESSFULLY 🚗            ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on PORT: ${PORT}                           ║
║  Environment: ${process.env.NODE_ENV || "development"}                     ║
║  MongoDB: ${process.env.MONGODB_URI?.split("/").pop() || "rider_service"}                   ║
║  Redis: ${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}              ║
║  RabbitMQ: ${process.env.RABBITMQ_URL?.split("@")[1] || "localhost:5672"}                   ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
