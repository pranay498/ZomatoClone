import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { UserRole } from "../models/user.model";

// Extend Express Request type to include userId and userRole
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

/**
 * Middleware to require authentication
 * Checks for x-api-gateway header (from API Gateway)
 * Extracts x-user-id and x-user-role headers
 * Attaches userId and userRole to request object
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const fromGateway = req.headers["x-api-gateway"];

  // Check if request came from API Gateway
  if (!fromGateway) {
    return next(
      new AppError("Direct access to microservice is forbidden", 403)
    );
  }

  // Extract user identity from gateway headers
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];

  // Validate headers exist
  if (!userId || !userRole) {
    return next(
      new AppError(
        "Unauthorized. User identity missing from headers",
        401
      )
    );
  }

  // Attach to request object
  req.userId = userId as string;
  req.userRole = userRole as UserRole;

  next();
};
