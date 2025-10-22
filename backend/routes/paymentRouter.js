import express from 'express';
import { 
  createFarmerSubscriptionPayment, 
  createCartPayment,
  createFoodSubscriptionPayment,
  handlePayHereNotification,
  createInstantFarmerSubscription,
  createInstantCartPayment,
  getFarmerCapabilities,
  cancelOrder,
  getCancelledOrders,
  cancelTestOrder,
  getAllOrdersStatus,
  processRefund,
  finalizeCartPaymentAfterReturn
} from '../controllers/paymentController.js';

const router = express.Router();

// Create farmer subscription payment
router.post('/farmer-subscription', createFarmerSubscriptionPayment);

// Create customer cart payment
router.post('/cart-payment', createCartPayment);

// Create food subscription payment
router.post('/food-subscription', createFoodSubscriptionPayment);

// PayHere notification endpoint
router.post('/payhere-notify', handlePayHereNotification);

// After user returns from PayHere, frontend can call this to finalize order state.
// In sandbox mode, this marks payment as completed; in production, it leaves as pending until notify.
router.post('/finalize-after-return', finalizeCartPaymentAfterReturn);

// DEMO MODE ENDPOINTS
// Instant farmer subscription (bypasses PayHere)
router.post('/instant-farmer-subscription', createInstantFarmerSubscription);

// Instant cart payment (bypasses PayHere)
router.post('/instant-cart-payment', createInstantCartPayment);

// Check farmer capabilities (always returns true for demo)
router.get('/farmer-capabilities/:farmerId', getFarmerCapabilities);

// Cancel order
router.post('/cancel-order', cancelOrder);

// ADMIN ENDPOINTS
// Get cancelled orders (admin only)
router.get('/admin/cancelled-orders', getCancelledOrders);

// Cancel a specific order for testing (development only)
router.post('/admin/cancel-test-order', cancelTestOrder);

// Get all orders status for debugging (development only)
router.get('/admin/all-orders-status', getAllOrdersStatus);

// Process refund (admin only)
router.post('/admin/process-refund', processRefund);

export default router;