import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import multer from "multer";

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction) => {
    
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

    // Handle Multer errors
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File size exceeds 5MB limit",
            });
        }
        if (error.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
                success: false,
                message: "Too many files. Maximum 10 files allowed",
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message || "File upload error",
        });
    }

    // Handle custom file validation errors
    if (error.message && error.message.includes("Only image files are allowed")) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    // Handle AppError instances
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }

    // Handle body parsing errors
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
