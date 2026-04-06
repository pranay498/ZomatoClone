import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized. Token missing or invalid format." });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 

    // Extract user data from token and set gateway headers
    if (typeof decoded === 'object' && decoded !== null) {
      const userId = (decoded as any).id || (decoded as any).userId || (decoded as any)._id;
      const userRole = (decoded as any).role;
      const restaurantId = (decoded as any).restaurantId; // 🔥 For restaurant owners

      console.log(`🟡 [Auth Middleware] Decoded JWT:`, { userId, userRole, restaurantId, allFields: Object.keys(decoded) });

      if (!userId) {
        console.error("❌ [Auth Middleware] No userId found in JWT payload");
        res.status(401).json({ message: "Unauthorized. Invalid token structure." });
        return;
      }

      // Validate role
      const validRoles = ["customer", "rider", "seller"]
      if (userRole && !validRoles.includes(userRole)) {
        res.status(401).json({ message: "Unauthorized. Invalid user role in token." });
        return;
      }

      
      req.headers["x-user-id"] = String(userId);
      req.headers["x-user-role"] = String(userRole || "customer");
      if (restaurantId) {
        req.headers["x-restaurant-id"] = String(restaurantId);
      }
  
      req.headers["x-api-gateway"] = "true";
      console.log(`🟢 [Auth Middleware] Headers set - userId: ${userId}, role: ${userRole}, restaurantId: ${restaurantId || "N/A"}`);
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ message: "Unauthorized. Token invalid or expired." });
  }
};
