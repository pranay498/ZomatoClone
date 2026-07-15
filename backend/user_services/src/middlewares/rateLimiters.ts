import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

// ─────────────────────────────────────────────────────────────
// LOGIN RATE LIMITER — Sliding Window (per email + IP)
// Tracks attempts per email address AND per IP separately.
// An attacker cycling emails from one IP is still blocked.
// ─────────────────────────────────────────────────────────────

const LOGIN_MAX = 5;           // max login attempts
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_WINDOW_SEC = 15 * 60;

export const loginRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.body;
  const clientIp = req.ip || req.socket?.remoteAddress || "unknown";

  if (!email) {
    res.status(400).json({ success: false, message: "Email is required." });
    return;
  }

  const now = Date.now();
  const windowStart = now - LOGIN_WINDOW_MS;

  // Track per-email attempts (primary: stops password guessing on one account)
  const emailKey = `ratelimit:login:email:${email.toLowerCase()}`;
  // Track per-IP attempts (secondary: stops account enumeration from one IP)
  const ipKey = `ratelimit:login:ip:${clientIp}`;

  try {
    // ── Per-email sliding window ──────────────────────────────
    await redis.zRemRangeByScore(emailKey, 0, windowStart);
    const emailCount = await redis.zCard(emailKey);

    if (emailCount >= LOGIN_MAX) {
      const oldest = await redis.zRangeWithScores(emailKey, 0, 0);
      const retryAfter = oldest.length > 0
        ? Math.ceil((Number(oldest[0].score) + LOGIN_WINDOW_MS - now) / 1000)
        : LOGIN_WINDOW_SEC;

      res.status(429).json({
        success: false,
        message: `Too many login attempts for this account. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    // ── Per-IP sliding window (higher threshold: 20 attempts / 15min) ──
    await redis.zRemRangeByScore(ipKey, 0, windowStart);
    const ipCount = await redis.zCard(ipKey);

    if (ipCount >= 20) {
      res.status(429).json({
        success: false,
        message: "Too many login attempts from your connection. Please wait 15 minutes.",
        retryAfterSeconds: LOGIN_WINDOW_SEC,
      });
      return;
    }

    // Record this attempt in both keys
    const entryValue = `${now}-${Math.random().toString(36).slice(2)}`;
    await redis.zAdd(emailKey, { score: now, value: entryValue });
    await redis.expire(emailKey, LOGIN_WINDOW_SEC);

    await redis.zAdd(ipKey, { score: now, value: entryValue });
    await redis.expire(ipKey, LOGIN_WINDOW_SEC);

    // Set informational headers
    res.setHeader("X-RateLimit-Limit", LOGIN_MAX);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, LOGIN_MAX - emailCount - 1));

    next();
  } catch (err) {
    // Fail open — don't block login if Redis is temporarily down
    console.error("[LoginRateLimiter] Redis error:", err);
    next();
  }
};

// ─────────────────────────────────────────────────────────────
// REGISTER RATE LIMITER — Fixed Window (per IP)
// Prevents bulk account creation from one IP.
// ─────────────────────────────────────────────────────────────

const REGISTER_MAX = 5;          // max registrations per window
const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const REGISTER_WINDOW_SEC = 60 * 60;

export const registerRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
  const windowBucket = Math.floor(Date.now() / REGISTER_WINDOW_MS);
  const redisKey = `ratelimit:register:${clientIp}:${windowBucket}`;

  try {
    const count = await redis.incr(redisKey);

    if (count === 1) {
      await redis.expire(redisKey, REGISTER_WINDOW_SEC);
    }

    if (count > REGISTER_MAX) {
      res.status(429).json({
        success: false,
        message: "Too many accounts created from this connection. Try again in 1 hour.",
        retryAfterSeconds: REGISTER_WINDOW_SEC,
      });
      return;
    }

    res.setHeader("X-RateLimit-Limit", REGISTER_MAX);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, REGISTER_MAX - count));

    next();
  } catch (err) {
    // Fail open — never block registration due to Redis error
    console.error("[RegisterRateLimiter] Redis error:", err);
    next();
  }
};
