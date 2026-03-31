import express from "express";
import { requireAuth, requireSeller } from "../middlewares/auth.middleware";
import { uploadSingleFile } from "../middlewares/multer";
import { createRestaurantWithImage, getMyRestaurant, updateRestaurantById, getNearbyRestaurants, getRestaurantById } from "../controllers/restaurant.controller";

const router = express.Router();

// Get my restaurant
router.get("/my-restaurant", (req, res, next) => {
  console.log("🟢 [Restaurant Service] GET /my-restaurant hit");
  requireAuth(req, res, () => getMyRestaurant(req, res, next));
});

// Get nearby restaurants (public route, comes BEFORE /:id to avoid matching issues)
router.get("/nearby", (req, res, next) => {
  console.log("🟢 [Restaurant Service] GET /nearby hit");
  getNearbyRestaurants(req, res, next);
});

// Create restaurant with image upload
router.post(
  "/create",
  (req, res, next) => {
    console.log("🟢 [Restaurant Service] POST /create hit");
    console.log("🟢 [Restaurant Service] Headers:", req.headers);
    console.log("🟢 [Restaurant Service] Content-Type:", req.headers['content-type']);
    requireAuth(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Restaurant Service] After requireAuth");
    requireSeller(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Restaurant Service] After requireSeller");
    uploadSingleFile(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Restaurant Service] After uploadSingleFile");
    console.log("🟢 [Restaurant Service] req.body:", req.body);
    console.log("🟢 [Restaurant Service] req.file:", req.file);
    createRestaurantWithImage(req, res, next);
  }
);

router.get("/:id", getRestaurantById);


// Update restaurant by ID (full update with image)
router.put(
  "/:id",
  (req, res, next) => {
    console.log("🟢 [Restaurant Service] PUT /:id hit");
    requireAuth(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Restaurant Service] After requireAuth");
    requireSeller(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Restaurant Service] After requireSeller");
    uploadSingleFile(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Restaurant Service] After uploadSingleFile");
    console.log("🟢 [Restaurant Service] req.body:", req.body);
    console.log("🟢 [Restaurant Service] req.file:", req.file);
    updateRestaurantById(req, res, next);
  }
);

export default router;
