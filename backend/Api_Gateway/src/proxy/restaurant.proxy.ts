import proxy from "express-http-proxy";
import jwt from "jsonwebtoken";

const RESTAURANT_SERVICE_URL =
  process.env.RESTAURANT_SERVICE_URL || "http://localhost:8002";

export const restaurantProxy = proxy(RESTAURANT_SERVICE_URL, {
  /* PATH REWRITE */

  proxyReqPathResolver: (req) => {
    let newPath = req.originalUrl;

    if (req.originalUrl.startsWith("/api/v1/restaurant")) {
      newPath = req.originalUrl.replace("/api/v1/restaurant", "/restaurant");
    } else if (req.originalUrl.startsWith("/api/v1/menu")) {
      newPath = req.originalUrl.replace("/api/v1/menu", "/menu");
    } else if (req.originalUrl.startsWith("/api/v1/cart")) {
      newPath = req.originalUrl.replace("/api/v1/cart", "/cart");
    } else if (req.originalUrl.startsWith("/api/v1/user/address")) {
      newPath = req.originalUrl.replace("/api/v1/user/address", "/address");
    } else if (req.originalUrl.startsWith("/api/v1/checkout")) {
      newPath = req.originalUrl.replace("/api/v1/checkout", "/checkout");
    } else if (req.originalUrl.startsWith("/api/v1/orders")) {
      newPath = req.originalUrl.replace("/api/v1/orders", "/orders");
    }

    console.log(
      "🟡 [API Gateway] Path rewrite:",
      req.originalUrl,
      "->",
      newPath,
    );

    return newPath;
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    console.log("🟡 [API Gateway] proxyReqOptDecorator called");
    console.log("🟡 [API Gateway] Request method:", srcReq.method);
    console.log(
      "🟡 [API Gateway] Content-Type:",
      srcReq.headers["content-type"],
    );

    proxyReqOpts.headers["x-api-gateway"] = "true";

    const authHeader = srcReq.headers.authorization;
    console.log(
      "🟡 [API Gateway] Auth header:",
      authHeader ? "present" : "missing",
    );

    if (
      authHeader &&
      authHeader.startsWith("Bearer ") &&
      process.env.JWT_SECRET
    ) {
      try {
        const token = authHeader.split(" ")[1];
        console.log("🟡 [API Gateway] Token extracted from Bearer auth");
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        console.log("🟡 [API Gateway] JWT decoded:", decoded);

        if (decoded && typeof decoded === "object") {
          const userId = decoded.id || decoded.userId;
          const userRole = decoded.role;

          proxyReqOpts.headers["x-user-id"] = String(userId);
          proxyReqOpts.headers["x-user-role"] = String(userRole);

          console.log(
            "🟡 [API Gateway] Headers set - x-user-id:",
            String(userId),
          );
          console.log(
            "🟡 [API Gateway] Headers set - x-user-role:",
            String(userRole),
          );
        }
      } catch (error) {
        console.error("🔴 [API Gateway] JWT verification error:", error);
      }
    } else {
      console.warn(
        "🟡 [API Gateway] No Bearer token found in Authorization header",
      );
    }

    return proxyReqOpts;
  },

  proxyReqBodyDecorator: (bodyContent, srcReq) => {
    console.log("🟡 [API Gateway] proxyReqBodyDecorator called");
    
    const contentType = srcReq.headers["content-type"];
    console.log("🟡 [API Gateway] Content-Type:", contentType);
    
    if (contentType && contentType.includes("multipart/form-data")) {
      console.log("🟡 [API Gateway] Multipart request - passing raw stream");
    } else if (contentType && contentType.includes("application/json")) {
      console.log("🟡 [API Gateway] JSON request - body will be streamed");
    }
    
    return bodyContent;  // Pass body through as-is
  },

  proxyErrorHandler: (err, res, next) => {
    console.error("🔴 [API Gateway] Proxy error:", err);
    res.status(500).json({
      message: "Restaurant service unavailable",
    });
  },

  timeout: 15000,
  parseReqBody: false,  // ✅ Keep as false for proper streaming
});
