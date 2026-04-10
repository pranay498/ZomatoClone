import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/rider-service";
    
    console.log("🟡 [DB] Connecting to MongoDB...");
    console.log("🟡 [DB] MongoDB URI:", mongoUri.includes("mongodb+srv") ? "✅ Atlas" : "❌ Local");
    
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB Connected for Rider Service");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log("✅ MongoDB Disconnected");
  } catch (error) {
    console.error("❌ MongoDB Disconnection Error:", error);
  }
}
