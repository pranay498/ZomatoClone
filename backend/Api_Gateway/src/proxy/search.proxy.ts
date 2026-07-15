import proxy from "express-http-proxy";
import jwt from "jsonwebtoken";

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || "http://localhost:8004";

export const searchProxy = proxy(
    SEARCH_SERVICE_URL,
    {
        /* PATH REWRITE
           Gateway receives: /api/v1/search?q=pizza
           Search service expects: /search?q=pizza
           → strip the /api/v1 prefix */
        proxyReqPathResolver: (req) => {
            const path = req.originalUrl.replace("/api/v1/search", "/search");
            console.log(`🔍 [Search Proxy] Forwarding: ${path}`);
            return path;
        },

        /* HEADER MODIFY — forward gateway marker + decoded user identity */
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (!proxyReqOpts.headers) {
                proxyReqOpts.headers = {};
            }
            proxyReqOpts.headers["x-api-gateway"] = "true";

            // Decode JWT if present and forward user context (search is public
            // but the service may log/personalise using these headers in future)
            const authHeader = srcReq.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ") && process.env.JWT_SECRET) {
                try {
                    const token = authHeader.split(" ")[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
                    if (decoded && typeof decoded === "object") {
                        proxyReqOpts.headers["x-user-id"] = decoded.id || decoded.userId;
                        proxyReqOpts.headers["x-user-role"] = decoded.role;
                    }
                } catch {
                   
                }
            }

            return proxyReqOpts;
        },

        proxyReqBodyDecorator: (bodyContent, srcReq) => {
            if (srcReq.body && Object.keys(srcReq.body).length > 0) {
                return JSON.stringify(srcReq.body);
            }
            return bodyContent;
        },

        proxyErrorHandler: (_err, res, _next) => {
            res.status(503).json({
                message: "Search service unavailable",
            });
        },

        timeout: 8000,

        parseReqBody: false,
    }
);
