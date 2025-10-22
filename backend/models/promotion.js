import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountedPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null // null means applies to all products
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stockLevel: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String, // base64 or image URL
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
promotionSchema.index({ farmerId: 1, isActive: 1 });
promotionSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if promotion is currently valid
promotionSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now &&
         this.stockLevel > 0;
});

// Method to calculate discount amount
promotionSchema.methods.calculateDiscount = function() {
  if (!this.isCurrentlyValid) return 0;
  return this.originalPrice - this.discountedPrice;
};

// Method to get final price
promotionSchema.methods.getFinalPrice = function() {
  return this.isCurrentlyValid ? this.discountedPrice : this.originalPrice;
};

// Pre-save validation
promotionSchema.pre('save', function(next) {
  // Validate date range
  if (this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Validate price relationship
  if (this.discountedPrice >= this.originalPrice) {
    return next(new Error('Discounted price must be less than original price'));
  }
  
  // Auto-calculate discount percentage if not provided
  if (!this.discountPercentage) {
    this.discountPercentage = Math.round(((this.originalPrice - this.discountedPrice) / this.originalPrice) * 100);
  }
  
  next();
});

export default mongoose.model('Promotion', promotionSchema);