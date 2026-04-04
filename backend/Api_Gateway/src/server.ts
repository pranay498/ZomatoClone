import dotenv from "dotenv"
dotenv.config()
import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import proxyRoutes from "./routes/proxy.routes"
import { ipLimiter } from "./utils/ipLimiter";
import { loggerMiddleware } from "./middlewares/logger.middleware";

const app = express();

app.use(helmet());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(cookieParser());
app.use(loggerMiddleware);

app.use((req: Request, res: Response, next: NextFunction) => {
  req.on("aborted", () => console.log("Request aborted by client"));
  req.on("error", (error: any) => console.log("Request error:", error.message));
  next();
});

// ✅ Proxy routes FIRST — body stream is raw here
app.use("/api/v1", proxyRoutes);

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// ✅ Body parsers AFTER proxy — only for gateway's own routes
app.use(express.json());
app.use(express.urlencoded({ extended: true,}));

app.get("/", (req, res) => {
  res.json({ status: "API Gateway is running" });
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`API Gateway is running on port ${port}`);
});