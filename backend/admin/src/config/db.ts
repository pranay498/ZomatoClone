import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let db: Db;


export const connectDB = async () => {
    if (client) return { client, db };

    try {
        const uri = process.env.MONGO_URI;

        if (!uri) {
            throw new Error("MONGO_URI is not defined in the environment variables ❌");
        }

        client = new MongoClient(uri);
        await client.connect();
        db = client.db("RealTime");
        console.log("MongoDB Connected");
        return { client, db };
    } catch (error) {
        console.error("Error Connecting to MongoDB:", error);
        process.exit(1);
    }
};