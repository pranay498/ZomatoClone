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
      const userId = (decoded as any).id || (decoded as any).userId;
      const userRole = (decoded as any).role;

      // Validate role
      const validRoles = ["customer", "rider", "seller"]
      if (userRole && !validRoles.includes(userRole)) {
        res.status(401).json({ message: "Unauthorized. Invalid user role in token." });
        return;
      }

      
      req.headers["x-user-id"] = userId;
      req.headers["x-user-role"] = userRole;
      
  
      req.headers["x-api-gateway"] = "true";
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ message: "Unauthorized. Token invalid or expired." });
  }
};
