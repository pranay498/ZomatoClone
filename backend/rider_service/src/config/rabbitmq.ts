import amqp, { Connection, Channel } from "amqplib";

class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  // Queue names
  private readonly QUEUES = {
    RIDER_ASSIGNMENT: "rider_assignment_queue",
    RIDER_STATUS_UPDATE: "rider_status_update_queue",
    DELIVERY_COMPLETED: "delivery_completed_queue",
    ORDER_PICKUP: "order_pickup_queue",
    RIDER_LOCATION: "rider_location_update_queue",
  };

  // Exchange names
  private readonly EXCHANGES = {
    RIDER_EVENTS: "rider_events",
    ORDER_EVENTS: "order_events",
  };

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<void> {
    try {
      const rabbitMQUrl = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

      this.connection = await amqp.connect(rabbitMQUrl);
      this.channel = await this.connection.createChannel();

      console.log("✅ RabbitMQ connected successfully");

      // Handle connection close
      this.connection.on("close", () => {
        console.log("⚠️ RabbitMQ connection closed");
        this.connection = null;
        this.channel = null;
      });

      // Handle connection errors
      this.connection.on("error", (err) => {
        console.error("❌ RabbitMQ connection error:", err);
      });

      // Setup queues and exchanges
      await this.setupQueuesAndExchanges();
    } catch (error) {
      console.error("❌ RabbitMQ connection failed:", error);
      throw error;
    }
  }

  /**
   * Create queues and exchanges
   */
  private async setupQueuesAndExchanges(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    try {
      // Declare exchanges
      await this.channel.assertExchange(this.EXCHANGES.RIDER_EVENTS, "topic", {
        durable: true,
      });
      await this.channel.assertExchange(this.EXCHANGES.ORDER_EVENTS, "topic", {
        durable: true,
      });

      // Declare queues
      await this.channel.assertQueue(this.QUEUES.RIDER_ASSIGNMENT, {
        durable: true,
      });
      await this.channel.assertQueue(this.QUEUES.RIDER_STATUS_UPDATE, {
        durable: true,
      });
      await this.channel.assertQueue(this.QUEUES.DELIVERY_COMPLETED, {
        durable: true,
      });
      await this.channel.assertQueue(this.QUEUES.ORDER_PICKUP, {
        durable: true,
      });
      await this.channel.assertQueue(this.QUEUES.RIDER_LOCATION, {
        durable: true,
      });

      // Bind queues to exchanges
      await this.channel.bindQueue(
        this.QUEUES.RIDER_ASSIGNMENT,
        this.EXCHANGES.ORDER_EVENTS,
        "order.created"
      );
      await this.channel.bindQueue(
        this.QUEUES.RIDER_STATUS_UPDATE,
        this.EXCHANGES.RIDER_EVENTS,
        "rider.status.*"
      );
      await this.channel.bindQueue(
        this.QUEUES.DELIVERY_COMPLETED,
        this.EXCHANGES.RIDER_EVENTS,
        "delivery.completed"
      );
      await this.channel.bindQueue(
        this.QUEUES.ORDER_PICKUP,
        this.EXCHANGES.ORDER_EVENTS,
        "order.pickup"
      );
      await this.channel.bindQueue(
        this.QUEUES.RIDER_LOCATION,
        this.EXCHANGES.RIDER_EVENTS,
        "rider.location.*"
      );

      console.log("✅ Queues and exchanges setup completed");
    } catch (error) {
      console.error("❌ Failed to setup queues:", error);
      throw error;
    }
  }

  /**
   * Get channel
   */
  getChannel(): Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    return this.channel;
  }

  /**
   * Publish message to queue
   */
  async publishMessage(
    queue: string,
    message: Record<string, any>,
    options?: any
  ): Promise<boolean> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const sent = this.channel.sendToQueue(queue, messageBuffer, {
        persistent: true,
        contentType: "application/json",
        ...options,
      });

      console.log(`📤 Message published to ${queue}`);
      return sent;
    } catch (error) {
      console.error(`❌ Failed to publish message to ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Publish message to exchange
   */
  async publishToExchange(
    exchange: string,
    routingKey: string,
    message: Record<string, any>,
    options?: any
  ): Promise<boolean> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const sent = this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        contentType: "application/json",
        ...options,
      });

      console.log(`📤 Message published to exchange ${exchange} with routing key ${routingKey}`);
      return sent;
    } catch (error) {
      console.error(
        `❌ Failed to publish message to exchange ${exchange}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Subscribe to queue
   */
  async subscribe(
    queue: string,
    callback: (message: any) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    try {
      // Set prefetch count for fair dispatch
      await this.channel.prefetch(1);

      await this.channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            console.log(`📥 Message received from ${queue}:`, content);

            await callback(content);

            // Acknowledge message after successful processing
            this.channel!.ack(msg);
          } catch (error) {
            console.error(
              `❌ Error processing message from ${queue}:`,
              error
            );

            // Reject and requeue on error
            this.channel!.nack(msg, false, true);
          }
        }
      });

      console.log(`✅ Subscribed to queue: ${queue}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("✅ RabbitMQ disconnected");
    } catch (error) {
      console.error("❌ Error disconnecting RabbitMQ:", error);
      throw error;
    }
  }

  /**
   * Get queue names
   */
  getQueueNames() {
    return this.QUEUES;
  }

  /**
   * Get exchange names
   */
  getExchangeNames() {
    return this.EXCHANGES;
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

// Export singleton instance
const rabbitMQService = new RabbitMQService();

export default rabbitMQService;
