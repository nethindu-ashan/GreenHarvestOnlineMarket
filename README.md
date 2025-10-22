# GreenHarvest E-Commerce Platform

A comprehensive agricultural e-commerce platform connecting farmers directly with customers, featuring KYC verification, subscription management, and integrated payment processing.

## Demo Mode Features

The GreenHarvest system has been optimized for seamless demonstration with instant payment processing, bypassing PayHere sandbox limitations while maintaining full data integrity.

### Demo Mode Flow

#### Farmer Side
1. **KYC Verification** - Complete farmer verification process
2. **Instant Subscription** - Click "Subscribe Now" creates immediate LKR 1,500 subscription record
3. **Full Feature Access** - Add Product & Add Promotion enabled for all farmers (regardless of subscription status)
4. **Order Management** - View and manage customer orders routed to specific farmers

#### Customer Side
1. **Product Browsing** - Browse products from multiple farmers
2. **Cart Management** - Add products from different farmers to cart
3. **Instant Checkout** - Orders are processed immediately without PayHere delays
4. **Order Tracking** - View order history and cancel orders with reason
5. **Split Routing** - Orders automatically routed to relevant farmers

#### Admin Side
1. **KYC Management** - Review and approve farmer KYC submissions
2. **Cancelled Orders** - View all cancelled orders from customers
3. **Refund Management** - Process refunds for cancelled orders (demo mode)
4. **System Overview** - Dashboard with platform statistics

## Technical Implementation

### Backend Models

#### FarmerSubscription
- Tracks farmer premium subscriptions
- LKR 1,500 annual membership
- Instant activation in demo mode
- Expiry tracking and status management

#### CartOrder
- Split customer orders by farmer
- Individual order tracking per farmer
- Cancellation and refund status
- Demo mode payment completion

### API Endpoints

#### Demo Mode Endpoints
- `POST /api/payments/instant-farmer-subscription` - Instant farmer subscription
- `POST /api/payments/instant-cart-payment` - Instant customer checkout
- `GET /api/payments/farmer-capabilities/:farmerId` - Check farmer permissions (always returns true for demo)
- `POST /api/payments/cancel-order` - Cancel customer orders
- `GET /api/payments/admin/cancelled-orders` - List cancelled orders (admin)
- `POST /api/payments/admin/process-refund` - Process refunds (admin)

### Frontend Features

#### Farmer Dashboard
- KYC status display
- Subscription management (with demo mode indicators)
- Always-enabled product/promotion features
- Real-time order notifications

#### Customer Experience
- Multi-farmer cart management
- Instant payment processing
- Order cancellation with reason
- Order history and tracking

#### Admin Console
- Cancelled orders management
- Refund processing interface
- System health monitoring
- KYC approval workflow

## Database Collections

### farmersubscriptions
- `farmerId` - Reference to farmer user
- `orderId` - Unique subscription order ID
- `amount` - Subscription amount (LKR 1,500)
- `status` - Payment status (paid in demo)
- `subscriptionStart/End` - Subscription period
- `demoMode` - Demo mode flag

### cartorders
- `customerId/farmerId` - Customer and farmer references
- `orderId` - Shared order ID for split orders
- `products[]` - Array of ordered products
- `status` - Order status (paid, cancelled, etc.)
- `cancellationReason` - Reason for cancellation
- `refundStatus` - Refund processing status

## Demo Mode Benefits

1. **No PayHere Delays** - Instant payment processing
2. **Full Functionality** - All features accessible without restrictions
3. **Data Integrity** - Complete order and subscription tracking
4. **Live-Ready** - Easy switch to production PayHere integration
5. **Admin Visibility** - Full oversight of cancellations and refunds

## Running the Application

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://localhost:27017/greenharvest

# PayHere Configuration (Demo Mode)
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
PAYHERE_MODE=sandbox
PAYHERE_RETURN_URL=http://localhost:5173/farmer/subscription-success
PAYHERE_CANCEL_URL=http://localhost:5173/farmer/subscription-cancelled
PAYHERE_NOTIFY_URL=https://your-ngrok-url.ngrok.io/api/payhere-notify

# Application
NODE_ENV=development
PORT=5002
```

## Demo Testing Flow

1. **Start Services** - Run both backend and frontend
2. **Create Farmer Account** - Sign up as farmer
3. **Complete KYC** - Submit KYC verification
4. **Admin Approval** - Approve KYC in admin panel
5. **Instant Subscription** - Click "Subscribe Now" for instant activation
6. **Add Products** - Add products (always enabled)
7. **Customer Orders** - Place orders as customer (instant payment)
8. **Order Management** - View orders in farmer dashboard
9. **Cancellation Test** - Cancel orders as customer
10. **Admin Refunds** - Process refunds in admin panel

This demo mode provides a complete, reliable e-commerce experience perfect for demonstrations and development, with the flexibility to seamlessly transition to live PayHere integration when ready for production deployment.