// Test script for cancelled orders functionality
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CartOrder from './models/cartOrder.js';
import Order from './models/order.js';

dotenv.config();

// Connect to database
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/allconet';
    console.log('Connecting to:', mongoURI.replace(/:[^:@]*@/, ':***@')); // Hide password
    
    await mongoose.connect(mongoURI);
  console.log('Connected to MongoDB');
    return true;
  } catch (error) {
  console.error('MongoDB connection failed:', error.message);
    return false;
  }
}

// Test cancelled orders query
async function testCancelledOrders() {
  try {
  console.log('\nTesting cancelled orders query...');
    
    // Query CartOrder collection for cancelled orders
    const cancelledCartOrders = await CartOrder.find({ orderStatus: 'cancelled' })
      .select('orderId customerEmail customerName phoneNumber totalAmount cancelledDate cancelReason refundStatus createdAt')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${cancelledCartOrders.length} cancelled orders in CartOrder collection:`);
    cancelledCartOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.orderId}, Customer: ${order.customerName || order.customerEmail}, Amount: Rs. ${order.totalAmount}, Cancelled: ${order.cancelledDate || 'No date'}`);
    });
    
    // Query legacy Order collection for cancelled orders
    const cancelledLegacyOrders = await Order.find({ status: 'cancelled' })
      .select('orderId customerEmail amount cancelledDate cancelReason refundStatus date')
      .sort({ date: -1 });
    
    console.log(`\nFound ${cancelledLegacyOrders.length} cancelled orders in legacy Order collection:`);
    cancelledLegacyOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.orderId}, Customer: ${order.customerEmail}, Amount: Rs. ${order.amount}, Cancelled: ${order.cancelledDate || 'No date'}`);
    });
    
    return {
      cartOrders: cancelledCartOrders,
      legacyOrders: cancelledLegacyOrders,
      totalCancelled: cancelledCartOrders.length + cancelledLegacyOrders.length
    };
    
  } catch (error) {
  console.error('Error querying cancelled orders:', error);
    return null;
  }
}

// Create a test cancelled order
async function createTestCancelledOrder() {
  try {
    console.log('\n🔧 Creating test cancelled order...');
    
    const testOrder = new CartOrder({
      orderId: `TEST-${Date.now()}`,
      customerEmail: 'test@example.com',
      customerName: 'Test Customer',
      phoneNumber: '0771234567',
      address: '123 Test Street, Colombo',
      city: 'Colombo',
      payhereOrderId: `PH-${Date.now()}`,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: 'Test Product',
          quantity: 1,
          price: 100,
          totalPrice: 100
        }
      ],
      subtotal: 100,
      totalAmount: 100,
      currency: 'LKR',
      paymentStatus: 'cancelled',
      orderStatus: 'cancelled',
      cancelledDate: new Date(),
      cancelReason: 'Test cancellation',
      refundStatus: 'not_requested'
    });
    
    const savedOrder = await testOrder.save();
  console.log(`Created test cancelled order: ${savedOrder.orderId}`);
    
    return savedOrder;
    
  } catch (error) {
  console.error('Error creating test cancelled order:', error);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('Starting cancelled orders test...\n');
  
  const connected = await connectDB();
  if (!connected) {
  console.log('Cannot run tests without database connection');
    process.exit(1);
  }
  
  // Test querying existing cancelled orders
  const queryResult = await testCancelledOrders();
  
  // If no cancelled orders found, create a test one
  if (queryResult && queryResult.totalCancelled === 0) {
  console.log('\nNo cancelled orders found, creating a test order...');
    await createTestCancelledOrder();
    
    // Query again to verify
  console.log('\nRe-checking after creating test order...');
    await testCancelledOrders();
  }
  
  console.log('\nTest completed successfully!');
  await mongoose.disconnect();
  console.log('👋 Disconnected from database');
}

// Run the test
runTests().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});