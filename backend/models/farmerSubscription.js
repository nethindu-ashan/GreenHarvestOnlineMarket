import mongoose from 'mongoose';

const farmerSubscriptionSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmerEmail: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    default: 1500 // LKR 1500 for farmer subscription
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'payhere_sandbox'
  },
  paymentId: {
    type: String
  },
  subscriptionStart: {
    type: Date,
    default: Date.now
  },
  subscriptionEnd: {
    type: Date,
    default: function() {
      // 1 year from now
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      return oneYear;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Demo mode specific fields
  demoMode: {
    type: Boolean,
    default: false
  },
  instantPayment: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
farmerSubscriptionSchema.index({ farmerId: 1, isActive: 1 });
farmerSubscriptionSchema.index({ farmerEmail: 1 });
farmerSubscriptionSchema.index({ orderId: 1 });

// Check if subscription is expired
farmerSubscriptionSchema.methods.isExpired = function() {
  return new Date() > this.subscriptionEnd;
};

// Check if subscription is currently active
farmerSubscriptionSchema.methods.isCurrentlyActive = function() {
  return this.isActive && this.status === 'paid' && !this.isExpired();
};

const FarmerSubscription = mongoose.model('FarmerSubscription', farmerSubscriptionSchema);

export default FarmerSubscription;