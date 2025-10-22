/*
  This file contains a fixed version of the order controller.  The key issues
  addressed are:

  1. Orders created through `newOrderFromCart` and `newOrder` were saved
     exclusively to the legacy `Order` collection, while the front‑end lists
     only `CartOrder` documents.  The revised code now optionally creates a
     `CartOrder` entry (if you want to see orders in the cart order list) or
     aggregates results from both collections when listing orders.

  2. The `newOrder` implementation incorrectly queried the `Products` model
     using `{ productId }` instead of `_id`.  Mongoose’s documentation
     specifies that `findById()` or `findOne({ _id: id })` should be used to
     fetch by MongoDB’s default identifier【84866879072388†L1234-L1258】.

  3. The list order endpoint for customers now merges results from both
     collections, so orders saved to `Order` are visible alongside those in
     `CartOrder`.  Each list entry is normalized to a common shape expected by
     the front‑end.

  To integrate this controller into your project, replace your current
  `controllers/orderController.js` file with this implementation or merge
  the updated functions below.
*/

import Order from "../models/order.js";
import CartOrder from "../models/cartOrder.js";
import AcceptOrder from "../models/acceptOrder.js";
import Products from "../models/product.js";
import Cart from "../models/cart.js";
import User from "../models/user.js";

function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper: generate a new sequential order ID (CBC + 4‑digit number)
async function generateOrderId() {
  // Consider both legacy Order and CartOrder to avoid duplicates
  const [latestLegacy] = await Order.find().sort({ date: -1 }).limit(1);
  const [latestCart] = await CartOrder.find().sort({ createdAt: -1 }).limit(1);

  const extractNum = (id) => {
    if (!id || typeof id !== 'string') return 0;
    const s = id.replace(/^CBC/i, '');
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const legacyNum = extractNum(latestLegacy?.orderId);
  const cartNum = extractNum(latestCart?.orderId);
  const next = Math.max(legacyNum, cartNum) + 1;
  return 'CBC' + String(next).padStart(4, '0');
}

// Create a new order from cart
export async function newOrderFromCart(req, res) {
  const { name, address, phone } = req.body;
  const userId = req.user.id;

  try {
    // Get user's cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty. Add items to cart before placing an order.",
      });
    }

    const newProductArray = [];
    const currentDate = new Date();

    // Process each cart item
    for (const item of cart.items) {
      const product = item.productId;
      const quantity = item.quantity;

      if (!product) {
        return res.status(400).json({
          message: "One or more products in cart no longer exist.",
        });
      }

      // Check if product is expired
      if (product.expiryDate && new Date(product.expiryDate) < currentDate) {
        return res.status(400).json({
          message: `Product "${product.productName}" has expired and cannot be ordered.`,
        });
      }

      // Check stock availability
      if (product.quantityInStock < quantity) {
        return res.status(400).json({
          message: `Not enough stock for "${product.productName}". Available: ${product.quantityInStock}, Requested: ${quantity}`,
        });
      }

      // Reduce stock
      product.quantityInStock -= quantity;
      await product.save();

      newProductArray.push({
        name: product.productName,
        price: product.price,
        quantity,
        image: product.images[0] || "default-image-url",
      });
    }

    // Generate unique order ID
    const orderId = await generateOrderId();

    // Prepare order data (legacy Order model)
    const newOrderData = {
      orderId,
      email: req.user.email,
      orderedItems: newProductArray,
      name,
      address,
      phone,
      paymentDone: false,
    };
    const order = new Order(newOrderData);
    const savedOrder = await order.save();

    // Optionally: also save to CartOrder so it shows up in the cart list
    // Note: if you integrate PayHere or have other required fields, populate
    // those accordingly. Here we map the minimal fields to the CartOrder schema.
    const cartOrder = new CartOrder({
      customerEmail: req.user.email,
      customerName: name,
      phoneNumber: phone,
      address,
      city: "Colombo",
      orderId,
      payhereOrderId: orderId, // placeholder; set real PayHere ID if used
      items: newProductArray.map((item) => ({
        productId: undefined,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.price * item.quantity,
      })),
      subtotal: newProductArray.reduce((sum, i) => sum + i.price * i.quantity, 0),
      tax: 0,
      shipping: 0,
      totalAmount: newProductArray.reduce((sum, i) => sum + i.price * i.quantity, 0),
      currency: "LKR",
      paymentStatus: "pending",
      orderStatus: "pending",
      paymentMethod: "payhere",
    });
    await cartOrder.save();

    // Clear cart after successful order
    await Cart.findOneAndUpdate(
      { userId },
      { items: [], updatedAt: new Date() },
    );

    res.json({
      message: "Order placed successfully from cart.",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      message: `Error placing the order: ${error.message}`,
    });
  }
}

// Create a new order (direct order without cart)
export async function newOrder(req, res) {
  const { orderedItems, name, address, phone, paymentDone } = req.body;

  try {
    const newProductArray = [];
    // Check the stock and reduce it
    for (const item of orderedItems) {
      const { productId, quantity } = item;
      // Use findById() or findOne({ _id: productId }) to query by MongoDB _id
      const product = await Products.findById(productId) || await Products.findOne({ _id: productId });
      if (!product) {
        return res.status(400).json({
          message: `Product with ID ${productId} not found.`,
        });
      }
      if (product.quantityInStock < quantity) {
        return res.status(400).json({
          message: `Not enough stock for ${product.productName}. Available: ${product.quantityInStock}`,
        });
      }
      product.quantityInStock -= quantity;
      await product.save();
      newProductArray.push({
        name: product.productName,
        price: product.price,
        quantity,
        image: product.images[0] || "default-image-url",
      });
    }
    const orderId = await generateOrderId();
    const newOrderData = {
      orderId,
      email: req.user.email,
      orderedItems: newProductArray,
      name,
      address,
      phone,
      paymentDone: !!paymentDone,
    };
    const order = new Order(newOrderData);
    const savedOrder = await order.save();
    // Optionally save to CartOrder as in newOrderFromCart
    const cartOrder = new CartOrder({
      customerEmail: req.user.email,
      customerName: name,
      phoneNumber: phone,
      address,
      city: "Colombo",
      orderId,
      payhereOrderId: orderId,
      items: newProductArray.map((item) => ({
        productId: undefined,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.price * item.quantity,
      })),
      subtotal: newProductArray.reduce((sum, i) => sum + i.price * i.quantity, 0),
      tax: 0,
      shipping: 0,
      totalAmount: newProductArray.reduce((sum, i) => sum + i.price * i.quantity, 0),
      currency: "LKR",
      paymentStatus: paymentDone ? "completed" : "pending",
      orderStatus: "pending",
      paymentMethod: "payhere",
    });
    await cartOrder.save();
    res.json({
      message: "Order placed successfully.",
      order: savedOrder,
    });
  } catch (error) {
    res.status(500).json({
      message: `Error placing the order: ${error.message}`,
    });
  }
}

// Get all orders for a customer or admin
export async function listOrder(req, res) {
  try {
    console.log("ListOrder function called for user:", req.user.email);
    if (req.user.type === "customer") {
  // Fetch cart orders (case-insensitive email match)
  const emailRegex = new RegExp(`^${escapeRegExp(req.user.email)}$`, 'i');
  const cartOrders = await CartOrder.find({ customerEmail: emailRegex }).sort({ createdAt: -1 });
      // Fetch legacy orders from the Order collection
  const legacyOrders = await Order.find({ email: emailRegex }).sort({ date: -1 });
      // Transform both collections to the common shape expected by the front‑end
      const transformedCartOrders = cartOrders.map((cartOrder) => ({
        orderId: cartOrder.orderId,
        date: cartOrder.createdAt,
        status: cartOrder.orderStatus || "pending",
        orderedItems: (cartOrder.items || []).map((item) => ({
          name: item.productName || "Unknown Product",
          quantity: item.quantity || 1,
          price: item.price || 0,
        })),
        name: cartOrder.customerName || "",
        address: cartOrder.address || "",
        phone: cartOrder.phoneNumber || "",
        notes: cartOrder.notes || "",
        paymentDone: cartOrder.paymentStatus === "completed",
        totalAmount: cartOrder.totalAmount || 0,
        paymentStatus: cartOrder.paymentStatus || "pending",
      }));
      const transformedLegacyOrders = legacyOrders.map((order) => ({
        orderId: order.orderId,
        date: order.date || order.createdAt,
        status: order.status || order.orderStatus || "pending",
        orderedItems: (order.orderedItems || []).map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        name: order.name,
        address: order.address,
        phone: order.phone,
        notes: order.notes || "",
        paymentDone: order.paymentDone,
        totalAmount: order.orderedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
        paymentStatus: order.paymentDone ? "completed" : "pending",
      }));
      const list = [...transformedCartOrders, ...transformedLegacyOrders];
      console.log("Transformed orders count:", list.length);
      res.json({ list });
    } else if (req.user.type === "admin") {
      // For admin, get all cart orders
      const cartOrderList = await CartOrder.find().sort({ createdAt: -1 });
      const transformedOrders = cartOrderList.map((cartOrder) => ({
        orderId: cartOrder.orderId,
        date: cartOrder.createdAt,
        status: cartOrder.orderStatus,
        orderedItems: cartOrder.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
        name: cartOrder.customerName,
        address: cartOrder.address,
        phone: cartOrder.phoneNumber,
        notes: cartOrder.notes || "",
        paymentDone: cartOrder.paymentStatus === "completed",
        totalAmount: cartOrder.totalAmount,
        paymentStatus: cartOrder.paymentStatus,
        customerEmail: cartOrder.customerEmail,
      }));
      res.json({ list: transformedOrders });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.error("Error in listOrder:", error);
    res.status(500).json({
      message: `Error fetching orders: ${error.message}`,
      error: error.stack,
    });
  }
}

// Get single order detail by orderId (prefers CartOrder)
export async function getOrderDetail(req, res) {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    let order = await CartOrder.findOne({ orderId });
    let source = 'cart';
    if (!order) {
      const legacy = await Order.findOne({ orderId });
      if (!legacy) return res.status(404).json({ message: 'Order not found' });
      // normalize legacy
      return res.json({
        order: {
          orderId: legacy.orderId,
          date: legacy.date || legacy.createdAt,
          status: legacy.status || legacy.orderStatus || 'pending',
          orderedItems: (legacy.orderedItems || []).map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
          name: legacy.name,
          address: legacy.address,
          phone: legacy.phone,
          notes: legacy.notes || '',
          paymentDone: !!legacy.paymentDone,
          totalAmount: (legacy.orderedItems || []).reduce((s,i)=>s + (i.price||0)*(i.quantity||0), 0),
          paymentStatus: legacy.paymentDone ? 'completed' : 'pending',
        }
      });
    }

    // Permission: customer can see only own order; admin can see any
    if (req.user?.type !== 'admin' && order.customerEmail?.toLowerCase() !== req.user?.email?.toLowerCase()) {
      return res.status(403).json({ message: 'Not allowed to view this order' });
    }

    return res.json({
      order: {
        orderId: order.orderId,
        date: order.createdAt,
        status: order.orderStatus,
        orderedItems: (order.items || []).map(i => ({ name: i.productName, quantity: i.quantity, price: i.price })),
        name: order.customerName,
        address: order.address,
        phone: order.phoneNumber,
        notes: order.notes || '',
        paymentDone: order.paymentStatus === 'completed',
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        cancelledDate: order.cancelledDate,
        cancelReason: order.cancelReason,
        deliveredDate: order.deliveredDate,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
      }
    });
  } catch (error) {
    res.status(500).json({ message: `Error fetching order: ${error.message}` });
  }
}

// Update order status (admin only)
export async function updateOrder(req, res) {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update order status' });
    }
    const { orderId } = req.params;
    const { status, notes } = req.body;
    let order = await CartOrder.findOne({ orderId });
    if (!order) return res.status(404).json({ message: `Order with ID ${orderId} not found` });

    if (status) {
      order.orderStatus = status;
      if (status === 'cancelled') {
        order.paymentStatus = 'cancelled';
        order.cancelledDate = new Date();
      }
      if (status === 'delivered') {
        order.deliveredDate = new Date();
      }
    }
    if (typeof notes === 'string') order.notes = notes;
    order.updatedAt = new Date();
    await order.save();
    res.json({ message: 'Order updated', order });
  } catch (error) {
    res.status(500).json({ message: `Error updating order: ${error.message}` });
  }
}

// Customer can update their own order (shipping details, notes) when still processing/confirmed
export async function updateOrderByCustomer(req, res) {
  try {
    const { orderId } = req.params;
    const { name, address, phone, notes } = req.body;
    let order = await CartOrder.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customerEmail?.toLowerCase() !== req.user?.email?.toLowerCase()) {
      return res.status(403).json({ message: 'Not allowed to edit this order' });
    }
    const status = order.orderStatus;
    if (status !== 'processing' && status !== 'confirmed') {
      return res.status(400).json({ message: 'Order cannot be edited at this stage' });
    }
    if (typeof name === 'string') order.customerName = name;
    if (typeof address === 'string') order.address = address;
    if (typeof phone === 'string') order.phoneNumber = phone;
    if (typeof notes === 'string') order.notes = notes;
    order.updatedAt = new Date();
    await order.save();
    res.json({ message: 'Order updated', order });
  } catch (error) {
    res.status(500).json({ message: `Error updating order: ${error.message}` });
  }
}

// Cancel order (customer or admin)
export async function cancelOrder(req, res) {
  try {
    const { orderId } = req.params;
    const reason = req.body?.reason || 'Cancelled by user';
    const bank = req.body?.bank || null;
    
    // Try to find order in CartOrder collection first
    let order = await CartOrder.findOne({ orderId });
    let isCartOrder = true;
    
    // If not found in CartOrder, try legacy Order collection
    if (!order) {
      order = await Order.findOne({ orderId });
      isCartOrder = false;
    }
    
    if (!order) {
      return res.status(404).json({ message: `Order with ID ${orderId} not found` });
    }

    // Permission: customer can cancel own order; admin can cancel any
    const userEmail = req.user?.email?.toLowerCase();
    const isOwner = isCartOrder 
      ? order.customerEmail?.toLowerCase() === userEmail
      : order.email?.toLowerCase() === userEmail;
    const isAdmin = req.user?.type === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not allowed to cancel this order' });
    }
    
    // Check if order can be cancelled
    const currentStatus = isCartOrder ? order.orderStatus : order.status;
    if (['ready', 'shipped', 'completed', 'delivered'].includes(currentStatus)) {
      return res.status(400).json({ 
        message: `Order cannot be cancelled, it's already ${currentStatus}` 
      });
    }

    // Additional check: if order exists in AcceptOrders collection, it cannot be cancelled
    const acceptOrder = await AcceptOrder.findOne({ originalOrderId: orderId });
    if (acceptOrder) {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled as it has been accepted and is being prepared by the farmer' 
      });
    }
    
    // Update order status to cancelled
    if (isCartOrder) {
      order.orderStatus = 'cancelled';
      order.paymentStatus = 'cancelled';
      order.cancelledDate = new Date();
      order.cancelReason = reason;
      order.updatedAt = new Date();
      
      // Set refund status if not already set
      if (!order.refundStatus) {
        order.refundStatus = 'requested';
      }
      // Store bank details if provided
      if (bank && typeof bank === 'object') {
        order.refundBank = {
          accountName: bank.accountName || '',
          accountNumber: bank.accountNumber || '',
          bankName: bank.bankName || '',
          branch: bank.branch || '',
          notes: bank.notes || ''
        };
      }
    } else {
      order.status = 'cancelled';
      order.cancelledDate = new Date();
      order.cancelReason = reason;
      order.updatedAt = new Date();
    }
    
    await order.save();
    
    res.json({ 
      success: true,
      message: 'Order cancelled successfully', 
      order 
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ 
      success: false,
      message: `Error cancelling order: ${error.message}` 
    });
  }
}

// Farmers: list orders that contain their products
export async function getFarmerOrders(req, res) {
  try {
    if (req.user?.type !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can access this endpoint' });
    }
    // Find cart orders that have items with productId values
    const orders = await CartOrder.find({ 'items.productId': { $exists: true, $ne: null } }).sort({ createdAt: -1 });
    if (orders.length === 0) return res.json({ orders: [] });
    const allProductIds = Array.from(new Set(orders.flatMap(o => (o.items || []).map(i => i.productId)).filter(Boolean)));
    const products = await Products.find({ _id: { $in: allProductIds } }, { _id: 1, owner: 1 }).lean();
    const owned = new Set(products.filter(p => String(p.owner) === String(req.user.id)).map(p => String(p._id)));
    const filtered = orders
      .map(o => ({
        ...o.toObject(),
        items: (o.items || []).filter(i => owned.has(String(i.productId)))
      }))
      .filter(o => o.items.length > 0);
    res.json({ orders: filtered });
  } catch (error) {
    res.status(500).json({ message: `Error fetching farmer orders: ${error.message}` });
  }
}

// Not implemented in CartOrder yet – keep route alive to avoid server crash
export async function updateOrderItemStatus(req, res) {
  return res.status(501).json({ message: 'Item-level status updates are not supported for cart orders yet.' });
}

// Get revenue stats (admin) – based on completed cart orders
export async function getRevenueStats(req, res) {
  try {
    const paid = await CartOrder.find({ paymentStatus: 'completed' });
    const totalRevenue = paid.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    res.json({ totalRevenue });
  } catch (error) {
    res.status(500).json({ message: `Error fetching revenue stats: ${error.message}` });
  }
}

// Diagnostics for cart orders collection
export async function testCartOrders(req, res) {
  try {
    const count = await CartOrder.countDocuments();
    const sample = await CartOrder.findOne();
    res.json({
      success: true,
      totalCount: count,
      sample: sample ? {
        orderId: sample.orderId,
        customerEmail: sample.customerEmail,
        orderStatus: sample.orderStatus,
        paymentStatus: sample.paymentStatus,
        createdAt: sample.createdAt
      } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Farmer: Update order status to ready and move to AcceptOrders collection
export async function markOrderAsReady(req, res) {
  try {
    const { orderId } = req.params;
    const { preparationNotes, estimatedReadyTime } = req.body;
    
    if (req.user?.type !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can mark orders as ready' });
    }

    // Find the original order - try CartOrder first
    let order = await CartOrder.findOne({ orderId }).populate('items.productId');
    let isCartOrder = true;
    
    if (!order) {
      // Try legacy Order collection
      order = await Order.findOne({ orderId });
      isCartOrder = false;
    }
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify this farmer has products in this order
    const farmerProducts = await Products.find({ owner: req.user.id }, { _id: 1 }).lean();
    const farmerProductIds = farmerProducts.map(p => String(p._id));
    
    const farmerItems = order.items.filter(item => {
      const productId = item.productId?._id || item.productId;
      return farmerProductIds.includes(String(productId));
    });

    if (farmerItems.length === 0) {
      return res.status(403).json({ message: 'You do not have any products in this order' });
    }

    // Check if already exists in AcceptOrders
    const existingAcceptOrder = await AcceptOrder.findOne({ 
      originalOrderId: orderId,
      farmerId: req.user.id 
    });

    if (existingAcceptOrder) {
      return res.status(400).json({ message: 'Order already marked as ready by you' });
    }

    // Calculate totals for farmer's items
    const subtotal = farmerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmount = subtotal; // Add tax/shipping if needed

    // Get farmer information
    const farmer = await User.findById(req.user.id);
    
    // Create AcceptOrder document
    const acceptOrder = new AcceptOrder({
      originalOrderId: orderId,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      address: order.address,
      city: order.city || 'Colombo',
      farmerEmail: farmer.email,
      farmerName: farmer.firstName + ' ' + farmer.lastName,
      farmerId: req.user.id,
      items: farmerItems.map(item => ({
        productId: item.productId?._id || item.productId,
        productName: item.productName || item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.price * item.quantity,
        unit: item.unit || 'kg'
      })),
      subtotal: subtotal,
      totalAmount: totalAmount,
      currency: order.currency || 'LKR',
      orderStatus: 'ready',
      acceptedBy: req.user.id,
      preparationNotes: preparationNotes || '',
      estimatedReadyTime: estimatedReadyTime ? new Date(estimatedReadyTime) : null,
      paymentStatus: order.paymentStatus || 'completed'
    });

    await acceptOrder.save();

    // Update original order status to indicate farmer has accepted
    if (order.orderStatus) {
      order.orderStatus = 'ready';
    } else {
      order.status = 'ready';
    }
    order.updatedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Order marked as ready successfully',
      acceptOrder: acceptOrder
    });

  } catch (error) {
    console.error('Mark order as ready error:', error);
    res.status(500).json({ 
      success: false,
      message: `Error marking order as ready: ${error.message}` 
    });
  }
}

// Farmer: Get accepted orders (orders marked as ready)
export async function getFarmerAcceptedOrders(req, res) {
  try {
    if (req.user?.type !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can access this endpoint' });
    }

    const acceptedOrders = await AcceptOrder.find({ farmerId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'productName images');

    res.json({
      success: true,
      orders: acceptedOrders
    });

  } catch (error) {
    console.error('Get farmer accepted orders error:', error);
    res.status(500).json({ 
      success: false,
      message: `Error fetching accepted orders: ${error.message}` 
    });
  }
}

// Farmer: Update accepted order status
export async function updateAcceptedOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status, notes, trackingNumber } = req.body;
    
    if (req.user?.type !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can update order status' });
    }

    const acceptOrder = await AcceptOrder.findOne({ 
      _id: orderId,
      farmerId: req.user.id 
    });

    if (!acceptOrder) {
      return res.status(404).json({ message: 'Accepted order not found' });
    }

    // Update status and related fields
    acceptOrder.orderStatus = status;
    
    if (status === 'packed' && !acceptOrder.actualReadyTime) {
      acceptOrder.actualReadyTime = new Date();
    }
    
    if (status === 'shipped') {
      acceptOrder.shippedAt = new Date();
      if (trackingNumber) {
        acceptOrder.trackingNumber = trackingNumber;
      }
    }
    
    if (status === 'delivered') {
      acceptOrder.deliveredAt = new Date();
    }
    
    if (notes) {
      acceptOrder.deliveryNotes = notes;
    }

    await acceptOrder.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: acceptOrder
    });

  } catch (error) {
    console.error('Update accepted order status error:', error);
    res.status(500).json({ 
      success: false,
      message: `Error updating order status: ${error.message}` 
    });
  }
}

// Admin: list all orders summary (CartOrder preferred), with simple filters
export async function listAllOrdersAdmin(req, res) {
  try {
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Only admins can list orders' });
    }

    const { status, paymentStatus, email, limit = 200 } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 200, 1000);

    const filter = {};
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (email) filter.customerEmail = new RegExp(`^${escapeRegExp(email)}$`, 'i');

    const cartOrders = await CartOrder.find(filter)
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();

    const orders = cartOrders.map(o => ({
      orderId: o.orderId,
      createdAt: o.createdAt,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      totalAmount: o.totalAmount,
      currency: o.currency || 'LKR',
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus
    }));

    return res.json({ orders, count: orders.length });
  } catch (e) {
    console.error('Admin list orders failed:', e);
    return res.status(500).json({ message: 'Failed to list orders: ' + e.message });
  }
}