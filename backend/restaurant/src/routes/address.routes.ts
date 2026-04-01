import { Router } from "express";
import { validateAndSaveAddress, getSavedAddresses } from "../controllers/address.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/validate", requireAuth, validateAndSaveAddress);
router.get("/saved", requireAuth, getSavedAddresses);

export default router;
