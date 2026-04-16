import { connectDB } from "../config/db";

export const getRestaurantsCollection = async () => {
    const { db } = await connectDB();
    return db.collection("restaurants");
};

export const getRidersCollection = async () => {
    const { db } = await connectDB();
    return db.collection("riders");
};