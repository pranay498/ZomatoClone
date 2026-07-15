import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import multer from "multer";

export const errorHandler = (
    error: any, req: Request,
    res: Response,
    next: NextFunction
): void => {

    if (error?.code === "ECONNABORTED" || error?.message?.includes("aborted")) {
        if (!res.headersSent) {
            res.status(400).json({
                success: false,
                message: "Request aborted",
            });
        }
        return;
    }

    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            res.status(400).json({
                success: false,
                message: "File size exceeds 5MB limit",
            });
            return;
        }

        if (error.code === "LIMIT_FILE_COUNT") {
            res.status(400).json({
                success: false,
                message: "Too many files. Maximum 10 files allowed",
            });
            return;
        }

        res.status(400).json({
            success: false,
            message: error.message || "File upload error",
        });
        return;
    }

    if (error.message && error.message.includes("Only image files are allowed")) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
        return;
    }

    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
        return;
    }

    if (error?.status === 400 && error?.type) {
        res.status(400).json({
            success: false,
            message: error.message || "Bad Request",
        });
        return;
    }

    console.error("Unhandled error:", error);

    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}