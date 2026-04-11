import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost:5672");

    channel = await connection.createChannel();

    // ✅ queue ensure karo
    await channel.assertQueue(process.env.PAYMENT_QUEUE!, {
      durable: true,
    });

    // ✅ queue ensure karo
    await channel.assertQueue(process.env.RIDER_QUEUE!, {
      durable: true,
    });


    console.log("🐰 RabbitMQ connected");

    // handle crash
    connection.on("close", () => {
      console.log("❌ RabbitMQ connection closed");
    });

    connection.on("error", (err) => {
      console.log("❌ RabbitMQ error:", err);
    });

  } catch (error) {
    console.error("❌ RabbitMQ connection failed:", error);
  }
};

export const getChannel = (): amqp.Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};
