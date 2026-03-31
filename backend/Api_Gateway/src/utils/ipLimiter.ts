import rateLimit from "express-rate-limit";

export const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again later.",
  },
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
});
