import { Router } from 'express';
import { 
    getAdminHome, 
    getAllRestaurants, 
    getPendingRestaurants, 
    verifyRestaurant,
    getAllRiders,
    getPendingRiders,
    verifyRider
} from '../controllers/admin.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Basic health check route
router.get('/', getAdminHome);

// Protect all following routes with authentication & admin check
router.use(requireAuth, requireAdmin);

// Restaurant management endpoints
router.get('/restaurants', getAllRestaurants);
router.get('/restaurants/pending', getPendingRestaurants);
router.patch('/restaurants/:id/verify', verifyRestaurant);

// Rider management endpoints
router.get('/riders', getAllRiders);
router.get('/riders/pending', getPendingRiders);
router.patch('/riders/:id/verify', verifyRider);

export default router;
