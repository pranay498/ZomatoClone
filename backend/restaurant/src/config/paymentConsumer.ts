import { Order } from "../models/Order";
import { getChannel } from "./rabbitmq";
import axios from "axios";

export const startPaymentConsumer = async () => {
  const channel = getChannel();

  await channel.assertQueue(process.env.PAYMENT_QUEUE!, {
    durable: true,
  });

  channel.consume(process.env.PAYMENT_QUEUE!, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());

      if (event.type !== "PAYMENT_SUCCESS") {
        channel.ack(msg);
        return;
      }

      const { orderId } = event.data;

      // ✅ Important: prevent duplicate updates
      const order = await Order.findOneAndUpdate(
        {
          _id: orderId,
          paymentStatus: { $ne: "paid" }, // already paid na ho
        },
        {
          $set: {
            paymentStatus: "paid",
            status: "placed",
          },
        },
        { new: true },
      );

      if (!order) {
        console.log("⚠️ Order already updated or not found");
      } else {
        console.log("✅ Order updated after payment:", orderId);

        try {
          await axios.post(
            `${process.env.REALTIME_SERVICE_URL}/internal/notify`,
            {
              event: "ORDER_STATUS_UPDATED",
              room: `restaurant:${order.restaurantId}`,
              payload: {
                orderId: order._id,
                status: order.status,
              },
            },
            {
              headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
                "Content-Type": "application/json",
              },
            },
          );

          console.log("📡 Real-time event sent");
        } catch (error: any) {
          console.error("❌ Failed to emit event:", error.message);
        }
      }

      // ✅ Acknowledge the message here so RabbitMQ removes it from the queue
      channel.ack(msg);
      
    } catch (error) {
      console.error("❌ Error in payment consumer:", error);

      // ❗ Retry logic (important)
      channel.nack(msg, false, false);
    }
  });

  console.log("📩 Payment Consumer Started...");
};
