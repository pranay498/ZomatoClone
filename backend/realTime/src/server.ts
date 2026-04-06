import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { initSocket } from "./sokcet";
import internalRoutes from "./routes/internal";
import http from "http";

const app = express();

// Set request limits to prevent oversized payloads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

// 🔥 Internal routes (for inter-service communication)
app.use("/internal", internalRoutes);

const server =http.createServer(app);

initSocket(server)

// Serve static files from uploads directory

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "Restaurant Service" });
});

// Connect to database

const PORT = 8004;

server.listen(PORT, () => {
    console.log(`🚀 RealTime Service running on port ${PORT}`);
    console.log(`✅ Socket.io initialized and ready for WebSocket connections`);
});

export default app;