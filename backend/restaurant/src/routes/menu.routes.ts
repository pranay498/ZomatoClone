import express from "express";
import { requireAuth, requireSeller } from "../middlewares/auth.middleware";
import { uploadSingleFile } from "../middlewares/multer";
import {
  createMenuItemWithImage,
  getMenuItemsByRestaurant,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "../controllers/menuItem.controller";

const router = express.Router();

// Create menu item with image
router.post(
  "/create",
  (req, res, next) => {
    console.log("🟢 [Menu Service] POST /create hit");
    requireAuth(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After requireAuth");
    requireSeller(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After requireSeller");
    uploadSingleFile(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After uploadSingleFile");
    console.log("🟢 [Menu Service] req.body:", req.body);
    console.log("🟢 [Menu Service] req.file:", req.file);
    createMenuItemWithImage(req, res, next);
  }
);

// Get menu items by restaurant
router.get(
  "/restaurant/:restaurantId",
  (req, res, next) => {
    console.log("🟢 [Menu Service] GET /restaurant/:restaurantId hit");
    getMenuItemsByRestaurant(req, res, next);
  }
);

// Get single menu item
router.get(
  "/:id",
  (req, res, next) => {
    console.log("🟢 [Menu Service] GET /:id hit");
    getMenuItemById(req, res, next);
  }
);

// Toggle menu item availability (MUST come before /:id PATCH to avoid route matching issues)
router.patch(
  "/:id/toggle",
  (req, res, next) => {
    console.log("🟢 [Menu Service] PATCH /:id/toggle hit");
    requireAuth(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After requireAuth");
    requireSeller(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After requireSeller");
    toggleMenuItemAvailability(req, res, next);
  }
);

// Update menu item
router.patch(
  "/:id",
  (req, res, next) => {
    console.log("🟢 [Menu Service] PATCH /:id hit");
    requireAuth(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After requireAuth");
    requireSeller(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After requireSeller");
    uploadSingleFile(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After uploadSingleFile");
    console.log("🟢 [Menu Service] req.body:", req.body);
    console.log("🟢 [Menu Service] req.file:", req.file);
    updateMenuItem(req, res, next);
  }
);

// Delete menu item
router.delete(
  "/:id",
  (req, res, next) => {
    console.log("🟢 [Menu Service] DELETE /:id hit");
    requireAuth(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After requireAuth");
    requireSeller(req, res, next);
  },
  (req, res, next) => {
    console.log("🟢 [Menu Service] After requireSeller");
    deleteMenuItem(req, res, next);
  }
);

// Toggle menu item availability

export default router;