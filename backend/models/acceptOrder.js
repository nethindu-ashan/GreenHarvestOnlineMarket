import mongoose from 'mongoose';

const acceptOrderSchema = new mongoose.Schema({
  // Original order information
  originalOrderId: {
    type: String,
    required: true,
    index: true
  },
  
  // Customer information
  customerEmail: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    default: 'Colombo'
  },
  
  // Farmer information
  farmerEmail: {
    type: String,
    required: true,
    index: true
  },
  farmerName: {
    type: String,
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Order items specific to this farmer
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products'
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      default: 'kg'
    }
  }],
  
  // Financial information
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  shipping: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  
  // Order status and tracking
  orderStatus: {
    type: String,
    enum: ['ready', 'preparing', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'ready'
  },
  
  // Farmer action details
  acceptedAt: {
    type: Date,
    default: Date.now
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  preparationNotes: {
    type: String,
    default: ''
  },
  estimatedReadyTime: {
    type: Date
  },
  actualReadyTime: {
    type: Date
  },
  
  // Delivery information
  trackingNumber: {
    type: String
  },
  shippedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  deliveryNotes: {
    type: String
  },
  
  // Payment information
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  paymentMethod: {
    type: String,
    default: 'payhere'
  },
  
  // Customer interaction
  customerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  customerFeedback: {
    type: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'acceptOrders'
});

// Index for efficient queries
acceptOrderSchema.index({ farmerId: 1, orderStatus: 1 });
acceptOrderSchema.index({ originalOrderId: 1 });
acceptOrderSchema.index({ customerEmail: 1 });
acceptOrderSchema.index({ createdAt: -1 });
acceptOrderSchema.index({ farmerEmail: 1, createdAt: -1 });

// Update updatedAt on save
acceptOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const AcceptOrder = mongoose.model('AcceptOrder', acceptOrderSchema);

export default AcceptOrder;