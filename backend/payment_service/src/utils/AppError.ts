import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Wrong MongoDB ID error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // JWT expired error
  if (err.name === "JsonWebTokenError") {
    const message = `Json Web Token is invalid, Try again `;
    return res.status(401).json({
      success: false,
      message,
    });
  }

  // JWT expired error
  if (err.name === "TokenExpiredError") {
    const message = `Json Web Token is expired, Try again `;
    return res.status(401).json({
      success: false,
      message,
    });
  }

  // Duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
    return res.status(409).json({
      success: false,
      message,
    });
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
