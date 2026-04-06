import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Socket.IO middleware to verify JWT tokens
 */
export const socketAuthMiddleware = (socket: Socket, next: any) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.warn("⚠️ [Socket Auth] No token provided");
      return next(new AppError("Authentication token required", 401));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("❌ [Socket Auth] JWT_SECRET not configured");
      return next(new AppError("Server configuration error", 500));
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (decoded && typeof decoded === "object") {
      const userId = decoded.id || decoded.userId || decoded._id;
      const userRole = decoded.role || "customer";

      if (!userId) {
        console.error("❌ [Socket Auth] No userId in token");
        return next(new AppError("Invalid token structure", 401));
      }

      // Attach user info to socket
      socket.data.userId = userId;
      socket.data.userRole = userRole;

      console.log(`✅ [Socket Auth] User ${userId} connected`);
      next();
    } else {
      return next(new AppError("Invalid token", 401));
    }
  } catch (error: any) {
    console.error("❌ [Socket Auth] Error:", error.message);
    return next(new AppError(`Authentication failed: ${error.message}`, 401));
  }
};

/**
 * Verify user has required role
 */
export const requireRole = (requiredRoles: string[]) => {
  return (socket: Socket, next: any) => {
    const userRole = socket.data.userRole;

    if (!userRole || !requiredRoles.includes(userRole)) {
      console.warn(`⚠️ [Socket Auth] User ${socket.data.userId} lacks required role`);
      return next(new AppError("Insufficient permissions", 403));
    }

    next();
  };
};
