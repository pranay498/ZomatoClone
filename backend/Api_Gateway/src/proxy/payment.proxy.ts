import proxy from "express-http-proxy";
import jwt from "jsonwebtoken";

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:8003";

export const paymentProxy = proxy(PAYMENT_SERVICE_URL, {
  /* PATH REWRITE */

  proxyReqPathResolver: (req) => {
    let newPath = req.originalUrl;

    // Route 1: Create Razorpay Order
    // /api/v1/checkout/razorpay/order → /checkout/razorpay/order
    if (req.originalUrl.includes("/api/v1/checkout/razorpay/order")) {
      newPath = req.originalUrl.replace("/api/v1/checkout", "/checkout");
    }
    // Route 2: Verify Razorpay Payment
    // /api/v1/checkout/razorpay/verify → /checkout/razorpay/verify
    else if (req.originalUrl.includes("/api/v1/checkout/razorpay/verify")) {
      newPath = req.originalUrl.replace("/api/v1/checkout", "/checkout");
    }
    // Other checkout routes
    else if (req.originalUrl.startsWith("/api/v1/checkout/confirm-cod")) {
      newPath = req.originalUrl.replace("/api/v1/checkout", "/checkout");
    }

    console.log(
      "🔄 [Payment Proxy] Rewrite: " + req.method,
      req.originalUrl,
      "→",
      newPath
    );

    return newPath;
  },

  /* REQUEST DECORATOR */

  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    console.log("🟡 [Payment Proxy] Request method:", srcReq.method);
    console.log(
      "🟡 [Payment Proxy] Content-Type:",
      srcReq.headers["content-type"]
    );
    console.log("🟡 [Payment Proxy] Incoming headers:", {
      "authorization": srcReq.headers.authorization ? "Bearer ***" : "missing",
      "x-user-id": srcReq.headers["x-user-id"],
      "x-user-role": srcReq.headers["x-user-role"],
      "x-internal-key": srcReq.headers["x-internal-key"] ? "present" : "missing",
      "x-api-gateway": srcReq.headers["x-api-gateway"],
    });

    proxyReqOpts.headers["x-api-gateway"] = "true";

    // ✅ Forward x-internal-key if present (from rider service)
    const internalKey = srcReq.headers["x-internal-key"];
    if (internalKey) {
      proxyReqOpts.headers["x-internal-key"] = String(internalKey);
      console.log("🟡 [Payment Proxy] Forwarding x-internal-key from rider service");
    }

    // ✅ Extract and verify JWT from Authorization header
    const authHeader = srcReq.headers.authorization;
    const xUserId = srcReq.headers["x-user-id"];

    // Check if x-user-id is already set by API Gateway
    if (xUserId) {
      console.log("✅ [Payment Proxy] Using x-user-id from API Gateway:", xUserId);
      proxyReqOpts.headers["x-user-id"] = xUserId;
      proxyReqOpts.headers["x-user-role"] = srcReq.headers["x-user-role"] || "customer";
      return proxyReqOpts;
    }

    if (!authHeader) {
      console.error("❌ [Payment Proxy] Missing Authorization header and x-user-id");
      return proxyReqOpts;
    } else if (!authHeader.startsWith("Bearer ")) {
      console.error("❌ [Payment Proxy] Invalid Authorization header format");
    } else {
      try {
        const token = authHeader.slice(7); // Remove "Bearer "

        // ✅ Verify JWT signature with API Gateway's JWT_SECRET
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error("❌ [Payment Proxy] JWT_SECRET not configured in .env");
          throw new Error("JWT_SECRET not configured");
        }

        const decoded = jwt.verify(token, jwtSecret) as any;

        if (decoded) {
          const userId = decoded.id || decoded.userId || decoded._id;
          const userRole = decoded.role || "customer";

          if (!userId) {
            console.error("❌ [Payment Proxy] No userId found in JWT");
            return proxyReqOpts;
          }

          proxyReqOpts.headers["x-user-id"] = String(userId);
          proxyReqOpts.headers["x-user-role"] = String(userRole);

          console.log(
            "🟢 [Payment Proxy] JWT verified ✅ User ID:",
            userId
          );
        }
      } catch (error: any) {
        console.error("❌ [Payment Proxy] JWT verification error:", error.message);
        // Still continue - let the rider service handle missing auth
      }
    }

    return proxyReqOpts;
  },

  /* RESPONSE HANDLER */

  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    console.log(
      "🟢 [API Gateway - Payment] Response status:",
      proxyRes.statusCode
    );
    return proxyResData;
  },

  /* ERROR HANDLER */

  proxyErrorHandler: (err, res, next) => {
    console.error("🔴 [API Gateway] Proxy error:", err);
    res.status(500).json({
      message: "Restaurant service unavailable",
    });
  },

  timeout: 15000,
  parseReqBody: false,  // ✅ Keep as false for proper streaming
});
