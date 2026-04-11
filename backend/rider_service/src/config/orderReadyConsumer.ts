import axios from "axios";
import { getChannel } from "./rabbitmq";
import { Rider } from "../models/Rider";

/**
 * ORDER_READY Consumer — Rider Service
 *
 * Full Flow:
 *  1. Restaurant marks order "ready_for_rider"
 *  2. Restaurant service publishes ORDER_READY → RabbitMQ
 *  3. THIS consumer receives it
 *  4. Finds nearby available + verified riders (MongoDB $near, 5km radius)
 *  5. Broadcasts NEW_ORDER_AVAILABLE via Realtime Service (Socket.IO)
 *     to each nearby rider's personal room
 *  6. ACKs the message ✅
 */
export const startOrderReadyConsumer = async () => {
  const channel = getChannel();
  const queue = process.env.ORDER_READY_QUEUE!;

  // Make sure queue exists (safe to call multiple times)
  await channel.assertQueue(queue, { durable: true });

  // Process one message at a time — fairer dispatch
  channel.prefetch(1);

  console.log(`👂 [Rider Consumer] Listening on queue: "${queue}"`);

  channel.consume(
    queue,
    async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());

        console.log(`\n📦 [Rider Consumer] Event received: ${event.type}`);

        // ── Only process ORDER_READY events ───────────────────────────────────
        if (event.type !== "ORDER_READY") {
          console.warn(`⚠️  [Rider Consumer] Unknown type "${event.type}" — skipping`);
          channel.ack(msg);
          return;
        }

        const {
          orderId,
          restaurantId,
          restaurantName,
          restaurantLocation, // 📍 Now using restaurant location from payload
          deliveryAddress,
          totalAmount,
          items,
        } = event.data;

        // 📍 Pickup Location (Restaurant)
        const [restLng, restLat] = restaurantLocation?.coordinates || [0, 0];
        // 🏠 Dropoff Location (Customer)
        const { formattedAddress: custAddr, latitude: custLat, longitude: custLng } = deliveryAddress;

        console.log(`   Order ID     : ${orderId}`);
        console.log(`   Restaurant   : ${restaurantName}`);
        console.log(`   Pickup At    : ${restaurantLocation?.formattedAddress || "Unknown"}`);
        console.log(`   Deliver to   : ${custAddr}`);
        console.log(`   💰 Total     : ₹${totalAmount}`);
        console.log(`   📦 Items     : ${items.map((i: any) => i.name).join(", ")}`);

        // ── Step 1: Find nearby available + verified riders (within 5km of RESTAURANT) ──────
        // MongoDB GeoJSON requires coordinates as [longitude, latitude]
        const nearbyRiders = await Rider.find({
          isAvailable: true,
          isVerified: true,
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [restLng, restLat], // 📍 Search near the PICKUP point
              },
              $maxDistance: 5000, // 5km radius in metres
            },
          },
        }).limit(10);

        console.log(
          `🔍 [Rider Consumer] Found ${nearbyRiders.length} available rider(s) within 5km of ${restaurantName}`
        );

        if (nearbyRiders.length === 0) {
          console.warn(
            `⚠️  [Rider Consumer] No available riders near restaurant for orderId: ${orderId}`
          );
          channel.ack(msg);
          return;
        }

        // ── Step 2: Broadcast to each nearby rider via Realtime Service ────────
        // Realtime Service API: POST /internal/notify → { event, room, payload }
        // Each rider socket joins a room with their userId on connect
        const realtimeUrl = `${process.env.REALTIME_SERVICE_URL}/internal/notify`;

        const orderPayload = {
          orderId,
          restaurantId,
          restaurantName,
          deliveryAddress,
          totalAmount,
          items,
        };

        const notifyPromises = nearbyRiders.map((rider) =>
          axios
            .post(
              realtimeUrl,
              {
                event: "order:available",
                room: rider.userId.toString(),       // ← rider's personal Socket.IO room (matching socket.ts)
                payload: orderPayload,
              },
              {
                headers: {
                  "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
                  "Content-Type": "application/json",
                },
              }
            )
            .then(() =>
              console.log(`📡 [Rider Consumer] Notified rider: ${rider.userId}`)
            )
            .catch((err) =>
              console.error(
                `❌ [Rider Consumer] Failed to notify rider ${rider.userId}:`,
                err.message
              )
            )
        );

        // Wait for all notifications (failures are logged, not thrown)
        await Promise.allSettled(notifyPromises);

        console.log(
          `✅ [Rider Consumer] Dispatched to ${nearbyRiders.length} rider(s) for orderId: ${orderId}`
        );

        channel.ack(msg); // ✅ Successfully processed

      } catch (error: any) {
        console.error(`❌ [Rider Consumer] Error processing message:`, error.message);
        // NACK without requeue — prevents infinite loop on bad messages
        channel.nack(msg, false, false);
      }
    },
    { noAck: false } // Manual ACK mode
  );
};
