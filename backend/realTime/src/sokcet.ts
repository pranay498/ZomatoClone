
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

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

      // ✅ Best practice
      socket.data.user = decoded;

      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  // 🔥 Connection
  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    const user = socket.data.user;
    const userId = user?._id || user?.id || user?.userId;
    const restaurantId = user?.restaurantId; // ✅ Extract restaurant ID

    console.log("👤 User ID:", userId);
    console.log("🏪 Restaurant ID:", restaurantId);

    // 🔥 Join rooms
    if (userId) {
      socket.join(userId); // User-specific room
    }
    if (restaurantId) {
      socket.join(`restaurant:${restaurantId}`); // Restaurant-specific room
    }

    // Example event
    socket.on("send_message", (data) => {
      console.log("📩 Message from:", userId, data);
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });

  return io;
};