import { Router } from "express";
import {
  getCart,
  addToCart,
  syncCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
} from "../controllers/Cart.controller"
import { requireAuth } from "../middlewares/auth.middleware";
 
const router = Router();
 
// All cart routes require authentication
router.use(requireAuth);
 
// ┌─────────────────────────────────────────────────────────┐
// │  METHOD  │  ROUTE                      │  WRITES DB?    │
// ├─────────────────────────────────────────────────────────┤
// │  GET     │  /api/v1/cart               │  ❌ read only  │
// │  POST    │  /api/v1/cart/add           │  ❌ optimistic │
// │  POST    │  /api/v1/cart/sync          │  ✅ YES        │
// │  DELETE  │  /api/v1/cart/remove/:id    │  ❌ optimistic │
// │  PATCH   │  /api/v1/cart/update/:id    │  ❌ optimistic │
// │  DELETE  │  /api/v1/cart/clear         │  ✅ YES        │
// └─────────────────────────────────────────────────────────┘
 
router.get   ("/",              getCart);
router.post  ("/add",           addToCart);
router.post  ("/sync",          syncCart);              // ← NEW
router.delete("/remove/:menuItemId", removeFromCart);
router.patch ("/update/:menuItemId", updateCartItemQuantity);
router.delete("/clear",         clearCart);
 
export default router;