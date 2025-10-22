import mongoose from "mongoose";

const cartOrderSchema = new mongoose.Schema({
  // Customer details
  customerEmail: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, default: 'Colombo' },
  
  // Order details
  orderId: { type: String, required: true, unique: true, index: true },
  payhereOrderId: { type: String, required: true, unique: true, index: true },
  
  // Items
  items: [{
    productId: { type: String },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 }
  }],
  
  // Financial details
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  shipping: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'LKR' },
  
  // Status tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // Customer notes and timeline fields used by UI
  notes: { type: String, default: '' },
  cancelledDate: { type: Date },
  cancelReason: { type: String },
  deliveredDate: { type: Date },
  estimatedDelivery: { type: Date },
  trackingNumber: { type: String },
  
  // Refund fields
  refundStatus: { type: String, enum: ['not_requested','requested','processing','completed','failed'], default: 'not_requested' },
  refundAmount: { type: Number, default: 0 },
  refundBank: {
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    bankName: { type: String, default: '' },
    branch: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  refundedAt: { type: Date },
  
  // PayHere integration
  payherePaymentId: { type: String, index: true },
  paymentMethod: { type: String, default: 'payhere' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Instance methods
cartOrderSchema.methods.cancelOrder = async function(reason, bank = {}) {
  this.orderStatus = 'cancelled';
  this.paymentStatus = 'cancelled';
  this.cancelledDate = new Date();
  this.cancelReason = reason || this.cancelReason || 'Cancelled by customer';
  // Mark refund requested and persist provided bank details
  this.refundStatus = 'requested';
  if (bank && typeof bank === 'object') {
    this.refundBank = {
      accountName: bank.accountName || '',
      accountNumber: bank.accountNumber || '',
      bankName: bank.bankName || '',
      branch: bank.branch || '',
      notes: bank.notes || ''
    };
  }
  await this.save();
  return this;
};

cartOrderSchema.methods.completeRefund = async function(amount) {
  this.refundStatus = 'completed';
  this.refundedAt = new Date();
  if (typeof amount === 'number') this.refundAmount = amount;
  await this.save();
  return this;
};

// Pre-save middleware to update timestamps
cartOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Use the exact collection name - 'cartorders' (Mongoose default pluralization)
const CartOrder = mongoose.model('CartOrder', cartOrderSchema, 'cartorders');

export default CartOrder;