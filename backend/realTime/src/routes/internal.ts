import express, { Request, Response, NextFunction, Router } from "express";
import { getIO } from "../sokcet";

const router = Router();

/**
 * 🔐 Internal Service Key Verification Middleware
 * Only allows requests from other microservices with valid internal key
 */
const verifyInternalKey = (req: Request, res: Response, next: NextFunction) => {
  const internalKey = req.headers["x-internal-key"];
  const expectedKey = process.env.INTERNAL_SERVICE_KEY;

  console.log("🔑 [Internal Route] Checking internal key...");
  console.log("🔑 Received key:", internalKey ? "✓ Present" : "✗ Missing");

  if (!expectedKey) {
    console.warn("⚠️ INTERNAL_SERVICE_KEY not configured in .env");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  if (!internalKey) {
    console.error("❌ [Internal Route] Missing x-internal-key header");
    return res.status(401).json({ error: "Unauthorized: Missing internal key" });
  }

  if (internalKey !== expectedKey) {
    console.error("❌ [Internal Route] Invalid internal key");
    return res.status(403).json({ error: "Forbidden: Invalid internal key" });
  }

  console.log("✅ [Internal Route] Internal key verified");
  (req as any).isInternalCall = true;
  next();
};

/**
 * POST /internal/notify
 * Broadcast notifications to connected clients
 * 
 * Headers:
 * - x-internal-key: Internal service authentication key
 * 
 * Body:
 * {
 *   userId?: string,
 *   restaurantId?: string,
 *   event: string,
 *   data: any
 * }
 */
router.post("/notify", verifyInternalKey, (req: Request, res: Response) => {
  const {event ,room , payload} = req.body;

  if (!event || !data) {
    return res.status(400).json({
      error: "Missing required fields: event, data",
    });
  }

  const io = getIO();

    console.log(`📢 [Internal Notify] Event: ${event}, Room: ${room || "broadcast"}, Payload:`, payload);

    io.to(room || "broadcast").emit(event, payload ??{});
    return res.json({ message: "Notification sent successfully" });


export default router;
