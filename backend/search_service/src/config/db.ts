import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/search-service";

  await mongoose.connect(mongoUri);
  console.log("✅ MongoDB Connected for Search Service");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("✅ MongoDB Disconnected");
}
