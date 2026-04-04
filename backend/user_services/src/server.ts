import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import { connectRedis } from "./config/redis";
import authRoutes from "./routes/auth.routes";
import { errorHandler } from "./middlewares/error.middleware";


const app = express();

// Wrapper to catch parsing errors

// Set request limits to prevent oversized payloads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Handle request abortion errors
app.use((req: Request, res: Response, next: NextFunction) => {
    req.on("aborted", () => {
        // Silently log for debugging if needed
        console.debug("[REQUEST ABORTED]", req.method, req.path);
    });
    next();
});

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", 
    credentials: true,
}));


app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "User Service" });
});


app.use("/auth", authRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);


const PORT = process.env.PORT || 8001;

const server = app.listen(PORT, async () => {
    try {
        await connectDB();
        await connectRedis();
        console.log(`User Service running on port ${PORT}`);
    } catch (error) {
        console.error("Startup error:", error);
        process.exit(1);
    }
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
