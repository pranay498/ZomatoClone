import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

// Extend Express Request type to include userId and userRole
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
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
  console.log("🟡 [Auth Middleware] requireAuth called");

  const fromGateway = req.headers["x-api-gateway"];
  console.log("🟡 [Auth Middleware] x-api-gateway header:", fromGateway);

  // Check if request came from API Gateway
  if (!fromGateway) {
    console.error("🔴 [Auth Middleware] Not from gateway");
    return next(
      new AppError("Direct access to microservice is forbidden", 403)
    );
  }

  // Extract user identity from gateway headers
  const userId = req.headers["x-user-id"];
  const userRole = req.headers["x-user-role"];

  console.log("🟡 [Auth Middleware] x-user-id:", userId);
  console.log("🟡 [Auth Middleware] x-user-role:", userRole);

  // Validate headers exist
  if (!userId || !userRole) {
    console.error("🔴 [Auth Middleware] Missing userId or userRole");
    return next(
      new AppError(
        "Unauthorized. User identity missing from headers",
        401
      )
    );
  }

  // Attach to request object
  req.userId = userId as string;
  req.userRole = userRole as string;

  console.log("🟢 [Auth Middleware] Auth passed, userId:", req.userId, "userRole:", req.userRole);

  next();
};

/**
 * Middleware to verify if user is a RIDER
 * Must be used after requireAuth middleware
 */
export const requireRider = (req: Request, res: Response, next: NextFunction) => {
  console.log("🟡 [Rider Middleware] requireRider called");
  console.log("🟡 [Rider Middleware] User role:", req.userRole);

  if (!req.userRole) {
    console.error("🔴 [Rider Middleware] User role not found");
    return next(new AppError("User role not found. Please authenticate first", 401));
  }

  if (req.userRole !== "rider") {
    console.error("🔴 [Rider Middleware] User is not a rider, role is:", req.userRole);
    return next(new AppError("Access denied. Only riders can access this resource", 403));
  }

  console.log("🟢 [Rider Middleware] User is rider, allowing access");
  next();
};
