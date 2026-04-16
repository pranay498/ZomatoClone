import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error.middleware';
import { connectDB } from './config/db';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Configure CORS
app.use(cors({
  origin: "*",
  credentials: true,
}));

app.use(errorHandler)

// Routes
app.use('/api/v1/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'admin service is perfectly running' });
});

const PORT = process.env.PORT;

const server = app.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`User Service running on port ${PORT}`);
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});


export default app;
