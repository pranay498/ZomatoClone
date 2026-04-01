import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";

declare global {
  namespace Express {
    interface Request {
      riderId?: string;
      userId?: string;
    }
  }
}

export const authenticateRider = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new AppError("Please login to access this resource", 401));
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "secret");

    req.riderId = decoded.riderId;
    req.userId = decoded.userId;

    next();
  } catch (error: any) {
    return next(new AppError(error.message || "Invalid Token", 401));
  }
};
