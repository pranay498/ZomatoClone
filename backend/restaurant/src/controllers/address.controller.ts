import { Request, Response } from "express";
import { Address } from "../models/Address";

export const validateAndSaveAddress = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId; // From requireAuth middleware
        
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { fullAddress, addressLine2, landmark, city, state, pincode, addressType, coordinates } = req.body;

        const newAddress = new Address({
            userId,
            fullAddress,
            addressLine2,
            landmark,
            city,
            state,
            pincode,
            addressType,
            coordinates
        });

        await newAddress.save();

        res.status(201).json({
            success: true,
            message: "Address saved successfully",
            addressId: newAddress._id
        });
    } catch (error: any) {
        console.error("Save address error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const getSavedAddresses = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId; 
        
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            addresses
        });
    } catch (error: any) {
        console.error("Get addresses error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
