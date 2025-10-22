// routes/productRouter.js

import express from 'express';
import { listProducts, newProducts, delProducts, updateProducts, reduceStock, getSingleProduct, getProductsByFarmerId } from '../controllers/productController.js';  // Import product controller methods
import { authenticate } from '../middleware/authMiddleware.js';  // Import authenticate middleware

const router = express.Router();

// Route to list all products (public)
router.get('/', listProducts);

// TEST ROUTE - to verify route ordering
router.get('/test', (req, res) => {
  res.json({ message: 'Test route works!', timestamp: new Date().toISOString() });
});

// Route to list farmer's products (authenticated farmers only)
router.get('/farmer', (req, res, next) => {
  console.log('🎯 /farmer route matched!');
  next();
}, authenticate, listProducts);

// Route to list products by farmer ID (public)
router.get('/farmer/:farmerId', getProductsByFarmerId);

// Public single product detail - Must come after specific routes
router.get('/:productId', (req, res, next) => {
  console.log('🎯 /:productId route matched with productId:', req.params.productId);
  next();
}, getSingleProduct);

// Route to create a new product (only farmers can add products)
router.post('/', authenticate, newProducts);

// Route to update a product (farmers can update their own products)
router.put('/:productId', authenticate, updateProducts);

// Route to delete a product (farmers can delete their own products)
router.delete('/:productId', authenticate, delProducts);

// Route to reduce stock when an order is placed
router.post('/reduce-stock', authenticate, reduceStock);

export default router;
