import rabbitMQService from "../config/rabbitmq";
import { updateRiderStatusAfterDelivery, updateRiderLocation } from "../controllers/rider.controller";

/**
 * Initialize RabbitMQ event listeners for Rider Service
 */
export const initializeRiderListeners = async (): Promise<void> => {
  const queueNames = rabbitMQService.getQueueNames();

  try {
    // Listen for rider assignment events
    await rabbitMQService.subscribe(
      queueNames.RIDER_ASSIGNMENT,
      async (message: any) => {
        console.log("🎯 [Rider Assignment] Received event:", message);
        // Handle rider assignment logic here
        // This will be called when a new order is created
      }
    );

    // Listen for status update events
    await rabbitMQService.subscribe(
      queueNames.RIDER_STATUS_UPDATE,
      async (message: any) => {
        console.log("📍 [Rider Status Update] Received event:", message);
        // Update rider status in database
        if (message.riderId && message.status) {
          // await updateRiderStatusAfterDelivery(message);
        }
      }
    );

    // Listen for delivery completed events
    await rabbitMQService.subscribe(
      queueNames.DELIVERY_COMPLETED,
      async (message: any) => {
        console.log("✅ [Delivery Completed] Received event:", message);
        // Update order status and rider stats
        if (message.riderId && message.orderId) {
          // Increment total deliveries
          // Update rider rating if applicable
        }
      }
    );

    // Listen for order pickup events
    await rabbitMQService.subscribe(
      queueNames.ORDER_PICKUP,
      async (message: any) => {
        console.log("📦 [Order Pickup] Received event:", message);
        // Handle order pickup confirmation
      }
    );

    // Listen for location updates
    await rabbitMQService.subscribe(
      queueNames.RIDER_LOCATION,
      async (message: any) => {
        console.log("📍 [Location Update] Received event:", message);
        // Update rider location in real-time
        if (message.riderId && message.latitude && message.longitude) {
          // await updateRiderLocation(message);
        }
      }
    );

    console.log("✅ All RabbitMQ listeners initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize RabbitMQ listeners:", error);
    throw error;
  }
};

/**
 * Publish rider assignment request
 */
export const publishRiderAssignmentRequest = async (
  orderId: string,
  restaurantLocation: { latitude: number; longitude: number },
  deliveryLocation: { latitude: number; longitude: number },
  timeSlot: string
): Promise<void> => {
  try {
    const message = {
      orderId,
      restaurantLocation,
      deliveryLocation,
      timeSlot,
      timestamp: new Date().toISOString(),
    };

    const queueNames = rabbitMQService.getQueueNames();
    await rabbitMQService.publishMessage(queueNames.RIDER_ASSIGNMENT, message);

    console.log(`✅ Rider assignment request published for order ${orderId}`);
  } catch (error) {
    console.error("❌ Failed to publish rider assignment:", error);
    throw error;
  }
};

/**
 * Publish rider status update
 */
export const publishRiderStatusUpdate = async (
  riderId: string,
  status: string,
  orderId: string
): Promise<void> => {
  try {
    const message = {
      riderId,
      status,
      orderId,
      timestamp: new Date().toISOString(),
    };

    const exchangeNames = rabbitMQService.getExchangeNames();
    await rabbitMQService.publishToExchange(
      exchangeNames.RIDER_EVENTS,
      `rider.status.${status}`,
      message
    );

    console.log(`✅ Rider status update published: ${riderId} -> ${status}`);
  } catch (error) {
    console.error("❌ Failed to publish rider status update:", error);
    throw error;
  }
};

/**
 * Publish delivery completion event
 */
export const publishDeliveryCompleted = async (
  riderId: string,
  orderId: string,
  rating?: number
): Promise<void> => {
  try {
    const message = {
      riderId,
      orderId,
      rating,
      timestamp: new Date().toISOString(),
    };

    const queueNames = rabbitMQService.getQueueNames();
    await rabbitMQService.publishMessage(queueNames.DELIVERY_COMPLETED, message);

    console.log(`✅ Delivery completion published for order ${orderId}`);
  } catch (error) {
    console.error("❌ Failed to publish delivery completion:", error);
    throw error;
  }
};

/**
 * Publish real-time location update
 */
export const publishRiderLocationUpdate = async (
  riderId: string,
  latitude: number,
  longitude: number
): Promise<void> => {
  try {
    const message = {
      riderId,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    };

    const exchangeNames = rabbitMQService.getExchangeNames();
    await rabbitMQService.publishToExchange(
      exchangeNames.RIDER_EVENTS,
      `rider.location.${riderId}`,
      message
    );

    console.log(`✅ Location update published for rider ${riderId}`);
  } catch (error) {
    console.error("❌ Failed to publish location update:", error);
    throw error;
  }
};
