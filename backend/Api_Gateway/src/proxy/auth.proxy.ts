import proxy from "express-http-proxy"
import jwt from "jsonwebtoken"

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8001";

export const authProxy = proxy(
    AUTH_SERVICE_URL,
    {

        /* PATH REWRITE */

        proxyReqPathResolver: (req) => {
            return req.originalUrl.replace("/api/v1/auth", "/auth")
        },

        /* HEADER MODIFY */

        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {

            proxyReqOpts.headers["x-api-gateway"] = "true"

        
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

            return proxyReqOpts

        },



        proxyErrorHandler: (err, res, next) => {

            res.status(500).json({
                message: "Auth service unavailable"
            })

        },

        timeout: 5000,
        
        parseReqBody: false

    }
)