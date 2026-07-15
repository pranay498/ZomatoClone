import { Request, Response } from "express";
import { Collection, ObjectId } from "mongodb";
import { asyncHandler } from "../utils/asyncHandler";
import {
    getRestaurantsCollection,
    getRidersCollection,
} from "../utils/collection";

const validateId = (id: string): boolean => {
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
};

export const getAdminHome = (req: Request, res: Response): void => {
    res.status(200).json({
        success: true,
        message: "Welcome to Admin Service 🚀",
    });
};

export const getAllRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const collection = await getRestaurantsCollection();
    const data = await collection.find().toArray();

    res.json({
        success: true,
        data,
    });
});

export const getPendingRestaurants = asyncHandler(async (req: Request, res: Response) => {
    const collection = await getRestaurantsCollection();
    const data = await collection.find({ isVerified: false }).toArray();

    res.json({
        success: true,
        data,
    });
});

export const getAllRiders = asyncHandler(async (req: Request, res: Response) => {
    const collection = await getRidersCollection();
    const data = await collection.find().toArray();

    res.json({
        success: true,
        data,
    });
});

export const getPendingRiders = asyncHandler(async (req: Request, res: Response) => {
    const collection = await getRidersCollection();
    const data = await collection.find({ isVerified: false }).toArray();

    res.json({
        success: true,
        data,
    });
});

const verifyEntity = ( getCollection: () => Promise<Collection>, name: string) =>asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const id = req.params.id as string;

            if (!validateId(id)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid ${name} ID`,
                });
                return;
            }

            const collection = await getCollection();

            const result = await collection.updateOne(
                {
                    _id: new ObjectId(id),
                },
                {
                    $set: {
                        isVerified: true,
                    },
                }
            );

            if (result.matchedCount === 0) {
                res.status(404).json({
                    success: false,
                    message: `${name} not found`,
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: `${name} verified successfully`,
            });
        }
    );

export const verifyRestaurant = verifyEntity(
    getRestaurantsCollection,
    "Restaurant"
);

export const verifyRider = verifyEntity(
    getRidersCollection,
    "Rider"
);