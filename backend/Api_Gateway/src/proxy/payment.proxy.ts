import proxy from "express-http-proxy";
import jwt from "jsonwebtoken";

const RIDER_SERVICE_URL =
  process.env.RIDER_SERVICE_URL || "http://localhost:8003";

export const paymentProxy = proxy(RIDER_SERVICE_URL, {
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
    else if (req.originalUrl.startsWith("/api/v1/checkout")) {
      newPath = req.originalUrl.replace("/api/v1/checkout", "/checkout");
    }
    // Payment routes fallback
    else if (req.originalUrl.startsWith("/api/v1/payment")) {
      newPath = req.originalUrl.replace("/api/v1/payment", "/payment");
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
    console.log("🟡 [API Gateway - Payment] Request method:", srcReq.method);
    console.log(
      "🟡 [API Gateway - Payment] Content-Type:",
      srcReq.headers["content-type"]
    );

    proxyReqOpts.headers["x-api-gateway"] = "true";

    // Add JWT user info to headers
    const authHeader = srcReq.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const decoded: any = jwt.decode(token);

        if (decoded) {
          proxyReqOpts.headers["x-user-id"] = decoded.id || decoded.userId;
          proxyReqOpts.headers["x-user-role"] = decoded.role || "user";
          console.log(
            "🟢 [API Gateway - Payment] User headers set:",
            decoded.id || decoded.userId
          );
        }
      } catch (error) {
        console.error("❌ [API Gateway - Payment] Token decode error:", error);
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
