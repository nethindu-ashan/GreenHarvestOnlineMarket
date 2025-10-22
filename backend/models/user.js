// models/user.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';  // Import bcryptjs for password hashing

// Define the User schema
const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: function() {
      return this.type !== 'farmer';
    },
  },
  lastName: {
    type: String,
    required: function() {
      return this.type !== 'farmer';
    },
  },
  name: {
    type: String,
    required: function() {
      return this.type === 'farmer';
    },
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
    required: function() {
      return this.type === 'farmer';
    },
    validate: {
      validator: function(v) {
        if (!v && this.type !== 'farmer') return true; // optional for non-farmers
        // Accept digits and phone punctuation; disallow pure alphabetic strings
        return /^[0-9+\-()\s]{7,20}$/.test(v || '');
      },
      message: 'Invalid phone number format'
    }
  },
  // Common optional fields
  dateOfBirth: { type: Date },
  // Customer address fields (optional)
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  zipCode: { type: String, default: '' },
  // Farmer-specific fields
  farmName: {
    type: String,
    required: function() {
      return this.type === 'farmer';
    },
  },
  farmLocation: {
    type: String,
    required: function() {
      return this.type === 'farmer';
    },
  },
  farmSize: {
    type: String,
    enum: ['small', 'medium', 'large', ''],
    default: '',
  },
  experience: {
    type: String,
    enum: ['beginner', 'intermediate', 'experienced', ''],
    default: '',
  },
  specializations: {
    type: [String],
    default: [],
  },
  // Email verification fields
  isVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpires: {
    type: Date,
  },
  bio: {
    type: String,
    default: '',
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ['admin', 'farmer', 'customer'],
    default: 'customer',  // Default user type is customer
  },
  profilePicture: {
    type: String,
    default: 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg',
  },
  coverImage: {
    type: String,
    default: '',
  },
  businessName: {
    type: String,
    default: '',
  },
  // Farmer subscription & approval workflow
  subscriptionPaid: {
    type: Boolean,
    default: false,
  },
  farmerStatus: {
    type: String,
    enum: ['pending_payment', 'pending_review', 'approved', 'declined', ''],
    default: '',
  },
  // KYC Verification
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', ''],
    default: '', // set to 'pending' after submission
  },
  // Persisted fields for KYC reviews outside the kyc object (so they survive resets)
  kycRejectionReason: { type: String, default: '' },
  kycReviewedAt: { type: Date },
  // Password reset OTP
  resetOtpHash: { type: String },
  resetOtpExpires: { type: Date },
  kyc: {
    nicFrontUrl: { type: String, default: '' },
    nicBackUrl: { type: String, default: '' },
    bank: {
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      branch: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  // Farmer Market Profile Data
  marketData: {
    farmName: { type: String, default: '' },
    farmDescription: { type: String, default: '' },
    location: { type: String, default: '' },
    establishedYear: { type: String, default: '' },
    farmSize: { type: String, default: '' },
    specialization: { type: String, default: '' },
    certifications: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    coverPhoto: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    farmPhotos: [{ type: String, default: '' }],
    aboutFarm: { type: String, default: '' },
    farmingMethods: { type: String, default: '' },
    awards: { type: String, default: '' },
    socialMedia: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      website: { type: String, default: '' }
    }
  },
  marketUpdatedAt: { type: Date },
}, {
  timestamps: true  // Add createdAt and updatedAt fields
});

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);  // Hash the password using bcryptjs
  }
  next();
});

// Method to compare passwords during login
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);  // Compare entered password with stored hashed password
};

// Create the User model from the schema (name must match refs like 'User')
const User = mongoose.model('User', userSchema);

export default User;
