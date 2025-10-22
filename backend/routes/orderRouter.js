// routes/orderRouter.js

import express from 'express';
import { newOrder, newOrderFromCart, listOrder, updateOrder, cancelOrder, getRevenueStats, getFarmerOrders, updateOrderItemStatus, updateOrderByCustomer, getOrderDetail, testCartOrders, markOrderAsReady, getFarmerAcceptedOrders, updateAcceptedOrderStatus, listAllOrdersAdmin } from '../controllers/orderController.js';  // Import order controller methods
import { authenticate } from '../middleware/authMiddleware.js';  // Import authenticate middleware

const router = express.Router();

// Route to create a new order from cart (recommended)
router.post("/from-cart", authenticate, newOrderFromCart);  // Requires authentication

// Route to create a new order directly (without cart)
router.post("/", authenticate, newOrder);  // Requires authentication

// Route to list orders (for customers to view their own orders or admins to view all orders)
router.get("/", authenticate, listOrder);  // Requires authentication

// Admin: list all orders (summary)
router.get("/admin/orders", authenticate, listAllOrdersAdmin);  // Admin check inside controller

// Route for farmers to get orders containing their products
router.get("/farmer", authenticate, getFarmerOrders);  // Farmers only

// Route for farmers to mark order as ready (moves to AcceptOrders collection)
router.post("/:orderId/mark-ready", authenticate, markOrderAsReady);  // Farmers only

// Route for farmers to get their accepted orders
router.get("/farmer/accepted", authenticate, getFarmerAcceptedOrders);  // Farmers only

// Route for farmers to update accepted order status
router.put("/accepted/:orderId/status", authenticate, updateAcceptedOrderStatus);  // Farmers only

// Get single order detail by orderId
router.get("/:orderId", authenticate, getOrderDetail);

// Route to update order status (admin only)
router.put("/:orderId", authenticate, updateOrder);  // Only admins can update order status

// Route for customer to edit their own processing order (shipping details, notes)
router.put("/:orderId/customer", authenticate, updateOrderByCustomer);

// Route for farmers to update order item status
router.put("/item-status", authenticate, updateOrderItemStatus);  // Farmers only

// Route to cancel an order (admin or customer can cancel pending orders)
router.delete("/:orderId", authenticate, cancelOrder);  // Requires authentication

// Alternative POST route for order cancellation (more intuitive for frontend)
router.post("/:orderId/cancel", authenticate, cancelOrder);  // Requires authentication

// Route to get revenue stats (admin only)
router.get("/revenue-stats", authenticate, getRevenueStats);  // Only admins can view revenue stats

// Test route to check cart orders collection
router.get("/test-cart-orders", testCartOrders);  // Test endpoint (no auth for testing)

export default router;
