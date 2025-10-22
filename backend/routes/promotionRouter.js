import express from 'express';
import {
  createPromotion,
  getFarmerPromotions,
  getPromotion,
  updatePromotion,
  deletePromotion,
  getActivePromotions,
  applyPromotionCode
} from '../controllers/promotionController.js';
import { authenticateToken, requireFarmerRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/active', getActivePromotions);
router.post('/apply', applyPromotionCode);

// Protected farmer routes
router.use(authenticateToken);

// Get all promotions for the logged-in farmer
router.get('/farmer', requireFarmerRole, getFarmerPromotions);

// Create a new promotion
router.post('/', requireFarmerRole, createPromotion);

// Get, update, delete specific promotion
router.get('/:id', requireFarmerRole, getPromotion);
router.put('/:id', requireFarmerRole, updatePromotion);
router.delete('/:id', requireFarmerRole, deletePromotion);

export default router;