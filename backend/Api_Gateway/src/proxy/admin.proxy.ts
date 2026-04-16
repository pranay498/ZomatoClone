import proxy from "express-http-proxy";
import jwt from "jsonwebtoken";

const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || "http://localhost:8006";

export const adminProxy = proxy(
    ADMIN_SERVICE_URL,
    {
        /* PATH REWRITE */
        proxyReqPathResolver: (req) => {
            return req.originalUrl;
        },

        /* HEADER MODIFY */
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (!proxyReqOpts.headers) {
                proxyReqOpts.headers = {};
            }
            proxyReqOpts.headers["x-api-gateway"] = "true";

            const authHeader = srcReq.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ") && process.env.JWT_SECRET) {
                try {
                    const token = authHeader.split(" ")[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
                    if (decoded && typeof decoded === 'object') {
                        proxyReqOpts.headers["x-user-id"] = decoded.id || decoded.userId;
                        proxyReqOpts.headers["x-user-role"] = "admin";
                    }
                } catch {

                }
            }

            return proxyReqOpts;
        },

        proxyErrorHandler: (err, res, next) => {
            res.status(500).json({
                message: "Admin service unavailable"
            });
        },

        timeout: 8000,

        parseReqBody: false
    }
);
