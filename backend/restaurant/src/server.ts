import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { connectDB } from "./config/db";
import { connectRabbitMQ } from "./config/rabbitmq";
import {  startPaymentConsumer } from "./config/paymentConsumer";
import { errorHandler } from "./middlewares/error.middleware";
import restaurantRoutes from "./routes/restaurant.routes";
import menuRoutes from "./routes/menu.routes";
import cartRoutes from "./routes/cart.routes";
import addressRoutes from "./routes/address.routes";
import orderRoutes from "./routes/order.routes";

const app = express();

// Set request limits to prevent oversized payloads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Handle request abortion errors
app.use((req: Request, res: Response, next: NextFunction) => {
    req.on("aborted", () => {
        console.log("Request aborted by client");
    });
    req.on("error", (error: any) => {
        console.log("Request error:", error.message);
    });
    next();
});


app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "Restaurant Service" });
});

// Connect to database
connectDB();

// Restaurant routes
app.use("/restaurant", restaurantRoutes);

// Menu routes
app.use("/menu", menuRoutes);

// Cart routes
app.use("/cart", cartRoutes);

// Address routes
app.use("/address", addressRoutes);

// Order routes
app.use("/orders", orderRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);


const PORT = process.env.PORT || 8005;

const startServer = async () => {
  try {
    // Connect to database
    console.log("📦 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected");

    // Connect to RabbitMQ
    console.log("🐰 Connecting to RabbitMQ...");
    await connectRabbitMQ();
    console.log("✅ RabbitMQ connected");

    // Start consuming payment success events
    console.log("💳 Starting payment consumer...");
    await startPaymentConsumer();
    console.log("✅ Payment consumer started");

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═════════════════════════════════════════════════════════════╗
║     🍽️  RESTAURANT SERVICE STARTED SUCCESSFULLY 🍽️         ║
╠═════════════════════════════════════════════════════════════╣
║  Server running on PORT: ${PORT}                             ║
║  Environment: ${process.env.NODE_ENV || "development"}                      ║
╚═════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;