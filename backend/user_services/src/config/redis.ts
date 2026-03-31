import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
	throw new Error("REDIS_URL environment variable is not defined");
}

export const redis = createClient({
	url: redisUrl,
});

redis.on("error", (err: unknown) => {
	console.error("Redis Error", err);
});

export const connectRedis = async () => {
	if (!redis.isOpen) {
		await redis.connect();
	}
	console.log("Redis connected");
};