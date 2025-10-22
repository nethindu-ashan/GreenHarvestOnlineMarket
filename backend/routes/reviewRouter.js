// routes/reviewRouter.js

import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { listReviews, getMyReview, upsertMyReview, deleteMyReview } from '../controllers/reviewController.js';

const router = express.Router();

// Public: list all reviews
router.get('/', listReviews);

// Customer-only: manage own review
router.get('/me', authenticate, getMyReview);
router.post('/me', authenticate, upsertMyReview);
router.put('/me', authenticate, upsertMyReview);
router.delete('/me', authenticate, deleteMyReview);

export default router;
