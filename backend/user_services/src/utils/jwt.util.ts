import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { UserRole } from "../models/user.model";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface TokenPayload {
    id: string;
    role: UserRole;
}

export const generateToken = (payload: TokenPayload): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in the environment variables");
    }

    return jwt.sign(payload, secret, {
        expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any,
    });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in the environment variables");
    }

    return jwt.sign(payload, secret, {
        expiresIn: "30d",
    });
};

export const verifyToken = (token: string): TokenPayload => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in the environment variables");
    }

    return jwt.verify(token, secret) as TokenPayload;
};
