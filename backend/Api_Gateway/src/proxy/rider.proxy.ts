import proxy from "express-http-proxy";
import jwt from "jsonwebtoken";

const RIDER_SERVICE_URL = process.env.RIDER_SERVICE_URL || "http://localhost:8005";

export const riderProxy = proxy(
    RIDER_SERVICE_URL,
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
                        proxyReqOpts.headers["x-user-role"] = decoded.role;
                    }
                } catch {
                   
                }
            }

            return proxyReqOpts;
        },

        proxyErrorHandler: (err, res, next) => {
            res.status(500).json({
                message: "Rider service unavailable"
            });
        },

        timeout: 8000, // Slightly higher for uploads
        
        parseReqBody: false
    }
);
