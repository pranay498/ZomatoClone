import { createClient } from "redis";

const redisClient = createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error("❌ Redis connection failed after 10 retries");
        return new Error("Redis max retries");
      }
      return retries * 100;
    },
  },
});

redisClient.on("error", (err: Error) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("✅ Redis connected"));

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("❌ Redis connection error:", error);
  }
};

export default redisClient;
