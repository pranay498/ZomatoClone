import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { redisClient } from "../config/redis"

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

export const emailRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  const key = `login:${email}`;

  const attempts = await redisClient.incr(key);

  if (attempts === 1) {
    // first attempt → set expiry
    await redisClient.expire(key, WINDOW_SECONDS);
  }

  if (attempts > MAX_ATTEMPTS) {
    throw new AppError(
      "Too many login attempts for this email. Try again later.",
      429
    );
  }
  next();
};
