import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { connectDB } from "./config/db";
import { errorHandler } from "./middlewares/error.middleware";
import restaurantRoutes from "./routes/restaurant.routes";
import menuRoutes from "./routes/menu.routes";
import cartRoutes from "./routes/cart.routes";

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
    origin: "*",
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

// Error handling middleware (must be last)
app.use(errorHandler);


const PORT = process.env.PORT || 8002;

app.listen(PORT, () => {
    console.log(`Restaurant Service running on port ${PORT}`);
});

export default app;