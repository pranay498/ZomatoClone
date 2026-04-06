import proxy from "express-http-proxy";
import jwt from "jsonwebtoken";

const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || "http://localhost:8004";

/**
 * RealTime Service Proxy
 * Routes notifications and real-time requests to the realtime service
 */
export const realtimeProxy = proxy(REALTIME_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    let newPath = req.originalUrl;

    // Route: /api/v1/notifications/* → /internal/*
    if (req.originalUrl.startsWith("/api/v1/notifications")) {
      newPath = req.originalUrl.replace("/api/v1/notifications", "/internal");
    }

    console.log("🔄 [RealTime Proxy] Rewrite:", req.originalUrl, "→", newPath);
    return newPath;
  },

  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    console.log("🟡 [RealTime Proxy] Request method:", srcReq.method);
    console.log("🟡 [RealTime Proxy] Content-Type:", srcReq.headers["content-type"]);

    proxyReqOpts.headers["x-api-gateway"] = "true";

    // ✅ Add internal service key for internal routes
    const internalKey = process.env.INTERNAL_SERVICE_KEY;
    if (internalKey) {
      proxyReqOpts.headers["x-internal-key"] = internalKey;
      console.log("🔑 [RealTime Proxy] Added internal service key");
    }

    // ✅ Extract and verify JWT from Authorization header
    const authHeader = srcReq.headers.authorization;

    if (!authHeader) {
      console.warn("⚠️ [RealTime Proxy] Missing Authorization header");
    } else if (!authHeader.startsWith("Bearer ")) {
      console.warn("⚠️ [RealTime Proxy] Invalid Authorization header format");
    } else {
      try {
        const token = authHeader.slice(7); // Remove "Bearer "

        // ✅ Verify JWT signature with API Gateway's JWT_SECRET
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error("❌ [RealTime Proxy] JWT_SECRET not configured in .env");
          throw new Error("JWT_SECRET not configured");
        }

        const decoded = jwt.verify(token, jwtSecret) as any;

        if (decoded) {
          const userId = decoded.id || decoded.userId || decoded._id;
          const userRole = decoded.role || "customer";
          const restaurantId = decoded.restaurantId; // 🔥 Restaurant ID for sellers

          if (!userId) {
            console.error("❌ [RealTime Proxy] No userId found in JWT");
            return proxyReqOpts;
          }

          proxyReqOpts.headers["x-user-id"] = String(userId);
          proxyReqOpts.headers["x-user-role"] = String(userRole);
          if (restaurantId) {
            proxyReqOpts.headers["x-restaurant-id"] = String(restaurantId);
          }

          console.log("🟢 [RealTime Proxy] JWT verified ✅", {
            userId,
            userRole,
            restaurantId: restaurantId || "N/A",
          });
        }
      } catch (error: any) {
        console.error("❌ [RealTime Proxy] JWT verification error:", error.message);
        // Still continue - let the realtime service handle missing auth
      }
    }

    return proxyReqOpts;
  },

  userResDecorator: (proxyRes, proxyResData) => {
    console.log(`🟢 [RealTime Proxy] Response status:`, proxyRes.statusCode);
    return proxyResData;
  },
});
