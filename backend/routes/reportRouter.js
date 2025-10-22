import express from 'express';
import { authenticate, requireCustomerRole, requireFarmerRole } from '../middleware/authMiddleware.js';
import {
  generateCustomerPaymentReport,
  generateFarmerEarningsReport,
  generateAdminUserActivityReport,
  generateCustomerInvoice,
  generateCustomerPurchasedProductsReport,
  generateFarmerSoldProductsReport
} from '../controllers/reportController.js';

const router = express.Router();

// Customer payment summary report (customer only)
router.get('/customer/payment-summary', authenticate, requireCustomerRole, generateCustomerPaymentReport);

// Customer purchased products report (customer only)
router.get('/customer/purchased-products', authenticate, requireCustomerRole, generateCustomerPurchasedProductsReport);

// Farmer earnings report (farmer only)
router.get('/farmer/earnings', authenticate, requireFarmerRole, generateFarmerEarningsReport);

// Farmer sold products report (farmer only)
router.get('/farmer/sold-products', authenticate, requireFarmerRole, generateFarmerSoldProductsReport);

// Admin user activity report (additional admin check can be added if needed)
router.get('/admin/user-activity', authenticate, generateAdminUserActivityReport);

// Customer invoice by orderId
router.get('/invoice/:orderId', authenticate, requireCustomerRole, generateCustomerInvoice);

export default router;