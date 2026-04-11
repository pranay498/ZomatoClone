import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import riderRoutes from "./routes/rider.routes";
import { errorMiddleware } from "./utils/AppError";
import { connectDB } from "./config/db";
import { connectRabbitMQ } from "./config/rabbitmq";
import { startOrderReadyConsumer } from "./config/orderReadyConsumer";

// Environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8005; // 8004 is taken by RealTime Service!

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MIDDLEWARE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(
  cors({
    origin: process.env.GATEWAY_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📍 [Rider Service] ${req.method} ${req.path}`);
  next();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use("/api/v1/riders", riderRoutes);
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Rider Service is running ✅",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// AppError Error Handler
app.use(errorMiddleware);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SERVER INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const startServer = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();
    await startOrderReadyConsumer(); // 🎧 Start consuming ORDER_READY events

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🛵 NEW RIDER SERVICE BOOTSTRAPPED SUCCESSFULLY 🛵   ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on PORT: ${PORT}                           ║
║  Environment: ${process.env.NODE_ENV || "development"}                     ║
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
