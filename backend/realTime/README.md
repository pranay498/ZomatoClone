# 🔔 RealTime Service

Real-time notifications and updates service using Socket.io for ZomatoClone application.

## Features

✅ **Real-time Order Updates** - Live order status changes  
✅ **Location Tracking** - Rider location updates  
✅ **Payment Notifications** - Instant payment confirmations  
✅ **User Notifications** - Push-like notifications  
✅ **Order Management** - Restaurant order real-time sync  
✅ **Authentication** - JWT token verified connections  
✅ **Role-based Broadcasting** - Send messages to specific user roles  

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Environment Variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Required Services
- MongoDB running on `mongodb://localhost:27017`
- Redis (optional, for scaling)

## Development

### Start Development Server
```bash
npm run dev
```

Server runs on `http://localhost:8004`

### Build for Production
```bash
npm run build
npm start
```

## Architecture

```
Frontend (Socket.io Client)
         ↓
    API Gateway
         ↓
  RealTime Service (Socket.io Server)
         ↓
  Event Handlers
  - Order Updates
  - Rider Location
  - Notifications
  - Payment Status
```

## Socket Events

### Order Events
- `order:statusChanged` - Order status update
- `order:preparing` - Order being prepared
- `order:update` - General order update

### Rider Events
- `rider:locationUpdate` - Send rider location
- `rider:orderAccepted` - Rider accepts order
- `rider:locationUpdated` - Broadcast rider location

### Payment Events
- `payment:completed` - Payment successful

### Restaurant Events
- `restaurant:orderReceived` - New order received
- `restaurant:preparingOrder` - Started preparing

### Notification Events
- `notification:send` - Send to specific user
- `notification:broadcast` - Broadcast to role

### Chat Events
- `message:send` - Send message
- `message:received` - Receive message

## Server Response Examples

### Order Update
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "status": "preparing",
  "message": "Your order is being prepared",
  "timestamp": "2026-04-06T10:30:00Z"
}
```

### Rider Location
```json
{
  "riderId": "507f1f77bcf86cd799439012",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "timestamp": "2026-04-06T10:30:00Z"
}
```

### Notification
```json
{
  "id": "507f1f77bcf86cd799439013",
  "title": "Order Confirmed",
  "message": "Your order has been confirmed",
  "type": "order",
  "timestamp": "2026-04-06T10:30:00Z"
}
```

## Configuration

### Environment Variables

```env
# Server
PORT=8004
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/realtime_service

# JWT
JWT_SECRET=your-secret-key

# Gateway
GATEWAY_URL=http://localhost:5173

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "success": true,
  "message": "RealTime Service is running ✅",
  "timestamp": "2026-04-06T10:30:00Z"
}
```

### Root
```bash
GET /
```

Response:
```json
{
  "success": true,
  "message": "RealTime Service API",
  "version": "1.0.0"
}
```

## Debugging

Enable detailed logging:
```bash
NODE_ENV=development npm run dev
```

Console output shows:
- 🔌 Socket connections/disconnections
- 📢 Event broadcasts
- 📍 Location updates
- 💳 Payment events
- 📣 Notifications

## Troubleshooting

### Connection Issues
1. Check JWT token validity
2. Ensure JWT_SECRET matches API Gateway
3. Verify MongoDB connection

### No Events Received
1. Check Socket.io connection in browser DevTools
2. Verify event names match exactly
3. Check user role has access to that event

## Future Enhancements

- [ ] Message persistence with MongoDB
- [ ] Read receipts
- [ ] Typing indicators
- [ ] File sharing
- [ ] Voice/Video calls via WebRTC
- [ ] Redis pub/sub for horizontal scaling

## License

ISC

## Support

For issues or questions, contact the development team.
