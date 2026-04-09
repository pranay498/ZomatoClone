import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";

declare global {
  namespace Express {
    interface Request {
      riderId?: string;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Auth middleware that reads user ID from headers (set by API Gateway)
 * API Gateway extracts JWT and forwards: x-user-id, x-user-role
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ✅ Get user ID from headers set by API Gateway
    const userId = req.headers["x-user-id"] as string;
    const userRole = req.headers["x-user-role"] as string;
    const fromGateway = req.headers["x-api-gateway"];

    console.log(`🟡 [Auth] Checking auth headers:`, {
      userId: userId || "missing",
      userRole: userRole || "missing",
      fromGateway: fromGateway || "missing",
      allHeaders: Object.keys(req.headers).filter(k => k.startsWith('x-')),
    });

    if (!userId) {
      console.error(`❌ [Auth] No userId in headers! Available headers:`, req.headers);
      return next(new AppError("Please login to access this resource", 401));
    }

    // Attach to request object
    req.userId = userId;
    req.userRole = userRole || "customer";

    console.log(`🟢 [Auth] User verified: ${userId} (role: ${req.userRole})`);
    next();
  } catch (error: any) {
    return next(new AppError(error.message || "Authentication failed", 401));
  }
};

/**
 * Legacy: Auth middleware that reads JWT token directly
 * Used when JWT token is in Authorization header
 */
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
