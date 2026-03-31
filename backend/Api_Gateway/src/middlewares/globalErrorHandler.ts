import { Request, Response, NextFunction } from "express";
import  {AppError} from "../utils/AppError";

const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  // Unknown errors ko AppError me convert karo
  if (!(err instanceof AppError)) {
    err = new AppError(message, statusCode);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message,
  });
};

export default globalErrorHandler;
