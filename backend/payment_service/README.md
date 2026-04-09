# 🚗 Rider Service

Microservice for managing delivery riders for the Zomato Clone application.

## 📁 Project Structure

```
rider_service/
├── src/
│   ├── config/          # Database & Redis configurations
│   ├── controllers/      # Business logic handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route definitions
│   ├── middlewares/      # Custom middleware functions
│   ├── utils/           # Helper utilities & error handlers
│   └── server.ts        # Express app entry point
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript configuration
├── .env.example         # Environment variables template
└── README.md           # This file
```

## 🚀 Getting Started

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Required services:**
   - MongoDB running on localhost:27017
   - Redis running on localhost:6379

### Available Scripts

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Watch TypeScript changes
npm run watch
```

## 📚 API Endpoints

### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/riders/register` | Register a new rider |

### Protected Routes (Requires Auth Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/riders/profile` | Get rider profile |
| PUT | `/api/riders/location` | Update rider location |
| PUT | `/api/riders/status` | Update rider status |
| POST | `/api/riders/available` | Get available riders near location |

### Admin Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/riders` | Get all riders |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

## 📝 Request/Response Examples

### Register Rider

**Request:**
```json
POST /api/riders/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "secured_password",
  "vehicle": {
    "type": "bike",
    "licensePlate": "MH12AB1234"
  },
  "documents": {
    "licenseNumber": "DL1234567890",
    "licenseExpiry": "2025-12-31",
    "aadharNumber": "123456789012"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rider registered successfully. Awaiting verification.",
  "riderId": "507f1f77bcf86cd799439011"
}
```

### Update Location

**Request:**
```json
PUT /api/riders/location
Authorization: Bearer <token>
{
  "latitude": 28.7041,
  "longitude": 77.1025
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "rider": { ... }
}
```

## 🗂️ Database Schema

### Rider Model

```typescript
{
  userId: ObjectId,           // Reference to User
  name: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  profileImage: String,
  vehicle: {
    type: "bike" | "scooter" | "car",
    licensePlate: String (unique)
  },
  documents: {
    licenseNumber: String,
    licenseExpiry: Date,
    licenseImage: String,
    aadharNumber: String,
    aadharImage: String
  },
  location: {
    latitude: Number,
    longitude: Number,
    lastUpdated: Date
  },
  status: "active" | "inactive" | "on_duty" | "off_duty" | "suspended",
  isVerified: Boolean,
  rating: Number (0-5),
  totalDeliveries: Number,
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String
  },
  timestamps: true
}
```

## 🔐 Authentication

- JWT tokens required for protected routes
- Token format: `Authorization: Bearer <JWT_TOKEN>`
- Token claims include: `riderId`, `userId`

## 🎯 Features

- ✅ Rider registration and profile management
- ✅ Real-time location tracking
- ✅ Status management (active/inactive/on_duty/off_duty)
- ✅ Vehicle and document verification
- ✅ Rating and delivery statistics
- ✅ Bank account management for payouts
- ✅ Geospatial queries for nearby riders

## 🔄 Integration Points

- **API Gateway:** For request routing and load balancing
- **User Service:** For user authentication
- **Restaurant Service:** For order delivery
- **RabbitMQ:** For event-driven communication (rider assignment, status updates)

## 📦 Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **redis**: Caching and session management
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **amqplib**: RabbitMQ connection (for future queue integration)
- **cors**: Cross-origin requests
- **dotenv**: Environment variable management

## 🛠️ Development Notes

- TypeScript strict mode enabled for type safety
- Error handling middleware for consistent API responses
- Async/await pattern for cleaner async code
- MongoDB geospatial indexing for location-based queries

## 📞 Support

For issues or questions regarding the Rider Service, please contact the development team.
