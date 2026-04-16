import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { asyncHandler } from "../utils/asyncHandler";
import { getRestaurantsCollection, getRidersCollection } from "../utils/collection";

const validateId = (id: string) => {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
};

// Home
export const getAdminHome = (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Welcome to Admin Service 🚀"
    });
};

// Restaurants
export const getAllRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const collection = await getRestaurantsCollection();
    const data = await collection.find().toArray();
    res.json({ success: true, data });
});

export const getPendingRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const collection = await getRestaurantsCollection();
    const data = await collection.find({ isVerified: false }).toArray();
    res.json({ success: true, data });
});

// Riders
export const getAllRiders = asyncHandler(async (req: Request, res: Response) => {
    const collection = await getRidersCollection();
    const data = await collection.find().toArray();
    res.json({ success: true, data });
});

export const getPendingRiders = asyncHandler(async (req: Request, res: Response) => {
    const collection = await getRidersCollection();
    const data = await collection.find({ isVerified: false }).toArray();
    res.json({ success: true, data });
});

// Generic verify
const verifyEntity = (getCollection: Function, name: string) =>
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!validateId(id)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${name} ID`
            });
        }

        const collection = await getCollection();

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { isVerified: true } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: `${name} not found`
            });
        }

        return res.json({
            success: true,
            message: `${name} verified successfully`
        });
    });

export const verifyRestaurant = verifyEntity(getRestaurantsCollection, "Restaurant");
export const verifyRider = verifyEntity(getRidersCollection, "Rider");