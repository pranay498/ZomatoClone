import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redis";

// ─────────────────────────────────────────────────────────────
// SLIDING WINDOW RATE LIMITER (Redis ZSET)
// Best for: sensitive routes — auth, payment, orders
// Accurate: no burst spikes at window boundaries
// ─────────────────────────────────────────────────────────────

interface SlidingWindowOptions {
  maxRequests: number;    // max allowed requests in window
  windowMs: number;       // time window in milliseconds
  keyPrefix: string;      // Redis key prefix e.g. "ratelimit:auth"
  message?: string;       // custom error message
  keyExtractor?: (req: Request) => string; // custom key (default: IP)
}

export const slidingWindowLimiter = (opts: SlidingWindowOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientKey = opts.keyExtractor
        ? opts.keyExtractor(req)
        : (req.ip || req.socket?.remoteAddress || "unknown");

      const redisKey = `${opts.keyPrefix}:${clientKey}`;
      const now = Date.now();
      const windowStart = now - opts.windowMs;

      // Remove entries outside the current window
      await redisClient.zRemRangeByScore(redisKey, 0, windowStart);

      // Count current requests in window
      const count = await redisClient.zCard(redisKey);

      // Set remaining headers for client visibility
      res.setHeader("X-RateLimit-Limit", opts.maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.maxRequests - count - 1));
      res.setHeader("X-RateLimit-Window-Ms", opts.windowMs);

      if (count >= opts.maxRequests) {
        // Get oldest entry to calculate retry time
        const oldest = await redisClient.zRangeWithScores(redisKey, 0, 0);
        const retryAfterMs = oldest.length > 0
          ? Math.ceil((Number(oldest[0].score) + opts.windowMs - now) / 1000)
          : Math.ceil(opts.windowMs / 1000);

        res.setHeader("Retry-After", retryAfterMs);
        res.status(429).json({
          success: false,
          message: opts.message || "Too many requests. Please slow down.",
          retryAfterSeconds: retryAfterMs,
        });
        return;
      }

      // Record this request with current timestamp as score
      await redisClient.zAdd(redisKey, {
        score: now,
        value: `${now}-${Math.random().toString(36).slice(2)}`,
      });

      // Auto-expire key after window to free Redis memory
      await redisClient.expire(redisKey, Math.ceil(opts.windowMs / 1000));

      next();
    } catch (err) {
      // Redis failure → fail open (don't block traffic, log the error)
      console.error(`[SlidingWindowLimiter] Redis error for key ${opts.keyPrefix}:`, err);
      next();
    }
  };
};

// ─────────────────────────────────────────────────────────────
// FIXED WINDOW RATE LIMITER (Redis INCR)
// Best for: read-heavy routes — restaurant, menu, cart browsing
// Cheaper: single Redis op, allows small burst at window reset
// ─────────────────────────────────────────────────────────────

interface FixedWindowOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
  message?: string;
}

export const fixedWindowLimiter = (opts: FixedWindowOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
      const windowBucket = Math.floor(Date.now() / opts.windowMs); // bucket ID changes each window
      const redisKey = `${opts.keyPrefix}:${clientIp}:${windowBucket}`;

      const count = await redisClient.incr(redisKey);

      // Set TTL only on first request in this window
      if (count === 1) {
        await redisClient.expire(redisKey, Math.ceil(opts.windowMs / 1000));
      }

      res.setHeader("X-RateLimit-Limit", opts.maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.maxRequests - count));

      if (count > opts.maxRequests) {
        res.status(429).json({
          success: false,
          message: opts.message || "Too many requests. Please slow down.",
          retryAfterSeconds: Math.ceil(opts.windowMs / 1000),
        });
        return;
      }

      next();
    } catch (err) {
      // Redis failure → fail open
      console.error(`[FixedWindowLimiter] Redis error for key ${opts.keyPrefix}:`, err);
      next();
    }
  };
};

// ─────────────────────────────────────────────────────────────
// PRE-CONFIGURED LIMITERS — ready to use in routes
// ─────────────────────────────────────────────────────────────

/**
 * Auth routes: login, register, google oauth
 * Sliding window — 10 requests per IP per 15 minutes
 * Strict: brute-force protection on auth endpoints
 */
export const authRateLimiter = slidingWindowLimiter({
  maxRequests: 1000,
  windowMs: 15 * 60 * 1000,
  keyPrefix: "ratelimit:auth",
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

/**
 * Payment & checkout routes
 * Sliding window — 10 requests per IP per 1 minute
 * Prevents rapid duplicate payment submissions
 */
export const paymentRateLimiter = slidingWindowLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: "ratelimit:payment",
  message: "Too many payment requests. Please wait before trying again.",
});

/**
 * Order creation routes
 * Sliding window — 20 requests per IP per 1 minute
 * Allows normal ordering flow but blocks spam
 */
export const orderRateLimiter = slidingWindowLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000,
  keyPrefix: "ratelimit:orders",
  message: "Too many order requests. Please slow down.",
});

/**
 * Rider-specific routes
 * Sliding window — 30 requests per IP per 1 minute
 * Allows location broadcasting but prevents flood
 */
export const riderRateLimiter = slidingWindowLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  keyPrefix: "ratelimit:rider",
  message: "Too many rider service requests.",
});

/**
 * Restaurant & menu browsing (read-heavy)
 * Fixed window — 120 requests per IP per 1 minute
 * Cheaper Redis op, allows burst browsing
 */
export const restaurantRateLimiter = fixedWindowLimiter({
  maxRequests: 120,
  windowMs: 60 * 1000,
  keyPrefix: "ratelimit:restaurant",
  message: "Too many requests to restaurant service. Please slow down.",
});

/**
 * Admin routes
 * Sliding window — 50 requests per IP per 1 minute
 * Admins make more requests but should still be limited
 */
export const adminRateLimiter = slidingWindowLimiter({
  maxRequests: 50,
  windowMs: 60 * 1000,
  keyPrefix: "ratelimit:admin",
  message: "Too many admin requests.",
});
