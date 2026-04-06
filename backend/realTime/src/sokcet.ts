
import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";

let io: Server;

export const getIO = () => io;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // 🔥 Middleware (Auth)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      console.log("🔐 [Socket Auth] Validating token...");
      console.log("🔐 Token present:", !!token);

      if (!token) {
        console.error("❌ [Socket Auth] No token provided");
        return next(new Error("Unauthorized: Missing token"));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error("❌ [Socket Auth] JWT_SECRET not configured");
        return next(new Error("Server error: JWT_SECRET not configured"));
      }

      const decoded: any = jwt.verify(token, jwtSecret);

      console.log("✅ [Socket Auth] Token verified!", {
        userId: decoded.id || decoded.userId,
        role: decoded.role,
        restaurantId: decoded.restaurantId
      });

      socket.data.user = decoded;
      next();
    } catch (error: any) {
      console.error("❌ [Socket Auth] JWT verification failed:", error.message);
      next(new Error(`Authentication failed: ${error.message}`));
    }
  });

  // 🔥 Connection
  io.on("connection", (socket) => {
    console.log("\n🟢🟢🟢 USER CONNECTED 🟢🟢🟢");
    console.log("📱 Socket ID:", socket.id);
    console.log("🔗 Remote IP:", socket.handshake.address);

    const user = socket.data.user;
    const userId = user?._id || user?.id || user?.userId;
    const restaurantId = user?.restaurantId; // ✅ Extract restaurant ID

    console.log("👤 User ID:", userId);
    console.log("🏪 Restaurant ID:", restaurantId);

    // 🔥 Join rooms
    if (userId) {
      socket.join(userId); // User-specific room
      console.log(`📍 Joined room: ${userId}`);
    }
    if (restaurantId) {
      socket.join(`restaurant:${restaurantId}`); // Restaurant-specific room
      console.log(`📍 Joined room: restaurant:${restaurantId}`);
    }

    // Example event
    socket.on("send_message", (data) => {
      console.log("📩 Message from:", userId, data);
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
      console.log("\n");
    });
  });

  return io;
};