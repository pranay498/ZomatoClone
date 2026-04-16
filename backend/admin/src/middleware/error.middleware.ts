import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Handle request abortion and connection errors gracefully
    if (error?.code === "ECONNABORTED" || error?.message?.includes("aborted")) {
        // Don't log these - they're normal when clients disconnect
        if (!res.headersSent) {
            res.status(400).json({
                success: false,
                message: "Request aborted",
            });
        }
        return;
    }

    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }

    // Handle other body parsing errors
    if (error?.status === 400 && error?.type) {
        return res.status(400).json({
            success: false,
            message: error.message || "Bad Request",
        });
    }

    console.error("Unhandled error:", error);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
