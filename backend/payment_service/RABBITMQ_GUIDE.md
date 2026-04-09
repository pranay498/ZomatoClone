# RabbitMQ Configuration Guide

## Overview

RabbitMQ is configured as a message broker for asynchronous communication between services in the Zomato Clone application.

## File: `src/config/rabbitmq.ts`

### Features

- **Connection Management**: Automatic connection and channel creation
- **Queue Setup**: Pre-configured queues for different event types
- **Exchange Bindings**: Topic-based routing for messages
- **Error Handling**: Automatic reconnection and error recovery
- **Message Publishing**: Send messages to queues or exchanges
- **Subscriptions**: Consume and process messages from queues

## Queue Structure

```
RIDER_ASSIGNMENT          → New order assignment to rider
RIDER_STATUS_UPDATE       → Rider status changes (active/inactive/on_duty)
DELIVERY_COMPLETED        → Delivery finished successfully
ORDER_PICKUP              → Rider picked up order
RIDER_LOCATION            → Real-time location updates
```

## Exchange Structure

```
RIDER_EVENTS              → All rider-related events
ORDER_EVENTS              → All order-related events
```

## Routing Keys

```
order.created             → Bind to RIDER_ASSIGNMENT
rider.status.*            → Bind to RIDER_STATUS_UPDATE (wildcard)
delivery.completed        → Bind to DELIVERY_COMPLETED
order.pickup              → Bind to ORDER_PICKUP
rider.location.*          → Bind to RIDER_LOCATION (wildcard)
```

## Usage Examples

### Initialize RabbitMQ

```typescript
import rabbitMQService from "./config/rabbitmq";

// In server startup
await rabbitMQService.connect();
```

### Publish Message to Queue

```typescript
const message = {
  orderId: "507f1f77bcf86cd799439011",
  riderId: "507f1f77bcf86cd799439012",
  timestamp: new Date(),
};

await rabbitMQService.publishMessage("rider_assignment_queue", message);
```

### Publish Message to Exchange

```typescript
const message = {
  riderId: "507f1f77bcf86cd799439012",
  status: "on_duty",
  timestamp: new Date(),
};

await rabbitMQService.publishToExchange(
  "rider_events",
  "rider.status.on_duty",
  message
);
```

### Subscribe to Queue

```typescript
await rabbitMQService.subscribe("rider_status_update_queue", async (message) => {
  console.log("Received message:", message);
  // Process the message
  // Automatic acknowledgment after callback completes
});
```

## RabbitMQ Class Methods

### Public Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `connect()` | - | Establish RabbitMQ connection |
| `publishMessage(queue, message, options)` | queue, message, options | Send message to queue |
| `publishToExchange(exchange, routingKey, message, options)` | exchange, routingKey, message, options | Publish to exchange |
| `subscribe(queue, callback)` | queue, callback | Listen for messages from queue |
| `getChannel()` | - | Get current channel instance |
| `getQueueNames()` | - | Get all queue names |
| `getExchangeNames()` | - | Get all exchange names |
| `isConnected()` | - | Check connection status |
| `disconnect()` | - | Close RabbitMQ connection |

## Event Flow Example

### New Order Assignment

```
Restaurant Service
    ↓
  [order.created event]
    ↓
ORDER_EVENTS Exchange
    ↓
[Routing Key: order.created]
    ↓
RIDER_ASSIGNMENT Queue
    ↓
Rider Service
    ↓
[Assign available rider + publish rider.status.assigned]
```

### Real-time Location Update

```
Rider App (Frontend)
    ↓
[PUT /api/riders/location]
    ↓
Rider Service Controller
    ↓
[publishRiderLocationUpdate()]
    ↓
RIDER_EVENTS Exchange
    ↓
[Routing Key: rider.location.{riderId}]
    ↓
RIDER_LOCATION Queue (subscribers)
    ↓
Restaurant Service + Mobile Apps (consume location)
```

## Environment Variables

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

## Default Behavior

- **Persistent Queues**: All queues are durable (survive broker restarts)
- **Persistent Messages**: All messages are marked persistent
- **Prefetch Count**: 1 (fair dispatch - one message per worker)
- **Acknowledgment**: Auto-acknowledge on successful processing
- **Requeue on Error**: Failed messages are requeued for retry

## Error Handling

All errors are logged and include descriptive messages:
- Connection failures trigger automatic reconnection
- Message processing errors trigger message requeue
- Disconnection is detected and logged

## Integration with Services

### File: `src/services/riderEvents.ts`

Helper functions for common rider events:

```typescript
// Initialize all listeners
initializeRiderListeners()

// Publish events
publishRiderAssignmentRequest()
publishRiderStatusUpdate()
publishDeliveryCompleted()
publishRiderLocationUpdate()
```

## Testing

### Manual Testing with RabbitMQ Management UI

```
http://localhost:15672
Username: guest
Password: guest
```

### Monitor Queues

1. Go to "Queues and Streams" tab
2. View messages, connection status, and throughput

## Production Considerations

- Use RabbitMQ cluster for high availability
- Enable authentication with strong passwords
- Monitor queue depth and consumer lag
- Set appropriate TTL for messages
- Use dead-letter exchanges for failed messages
- Implement replay mechanisms for critical messages

## Troubleshooting

### Cannot Connect

```
Check if RabbitMQ server is running:
brew services list (macOS)
systemctl status rabbitmq-server (Linux)
```

### Queue Not Receiving Messages

- Verify exchange and queue bindings in management UI
- Check routing keys match exactly
- Ensure subscribers are actively consuming

### Messages Not Being Acknowledged

- Check callback function completes successfully
- Verify error handling in subscriber callback
- Look for hanging promises in message processing
