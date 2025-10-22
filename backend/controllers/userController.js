// controllers/userController.js

import User from '../models/user.js';  // Import the User model
import Product from '../models/product.js';
import Order from '../models/order.js';
import CartOrder from '../models/cartOrder.js';
import jwt from 'jsonwebtoken';  // Import JWT for token generation
import dotenv from 'dotenv';  // Import dotenv for environment variables
import crypto from 'crypto';
import { sendMail, buildVerificationEmail, frontendUrl, buildPasswordOtpEmail } from '../utils/mailer.js';

dotenv.config();  // Load environment variables from .env file

// Function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      type: user.type,
      farmName: user.farmName,
      subscriptionPaid: user.subscriptionPaid,
      farmerStatus: user.farmerStatus,
    },
    process.env.JWT_SECRET_KEY,  // Secret key from .env file
    { expiresIn: '24h' }  // Token expiration time (24 hours)
  );
};

// Register a new user (admin can create farmers and customers)
export async function registerUser(req, res) {
  try {
    console.log('Registration attempt:', { 
      email: req.body.email, 
      type: req.body.userType || req.body.type,
      farmName: req.body.farmName 
    });

    const { email, password, userType } = req.body;

    // Validate required fields
    if (!email || !password) {
      console.log('Missing required fields: email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if the user already exists
    let existingUser = null;
    try {
      existingUser = await User.findOne({ email });
      console.log('User lookup result:', existingUser ? 'User exists' : 'User not found');
    } catch (dbError) {
      console.log('Database connection issue during lookup, proceeding with registration...');
    }

    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(409).json({ message: 'User already exists' });
    }

    let userData = {
      email,
      password,
      type: userType || req.body.type || 'customer',
    };

    // Handle different user types
    if (userData.type === 'farmer') {
      // Farmer registration
      const { name, phone, farmName, farmLocation, farmSize, experience, specializations, bio } = req.body;
      
      userData = {
        ...userData,
        name,
        phone,
        farmName,
        farmLocation,
        farmSize: farmSize || '',
        experience: experience || '',
        specializations: specializations || [],
        bio: bio || '',
      };
    } else {
      // Regular user (customer/admin) registration
      const { firstName, lastName, address, city, state, zipCode, phone } = req.body;
      userData = {
        ...userData,
        firstName,
        lastName,
        address: address || '',
        city: city || '',
        state: state || '',
        zipCode: zipCode || '',
        phone: phone || '',
      };
    }

  // Create a new user instance
  const newUser = new User(userData);

  // Init email verification token and expiry (24h)
  newUser.emailVerificationToken = crypto.randomBytes(32).toString('hex');
  newUser.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  newUser.isVerified = false;

    // Try to save to database, with fallback
    let savedUser = newUser;
    try {
      await newUser.save();
      console.log('User saved to database successfully:', savedUser.email);
    } catch (dbError) {
      console.log('Database save failed, using in-memory user for demo:', dbError.message);
      // For demo purposes, create a mock user object
      savedUser = {
        _id: Date.now().toString(),
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Try sending verification email (even if DB failed, we still mock-send with token present on savedUser)
    const verificationToken = savedUser.emailVerificationToken;
    try {
      const { subject, html, text } = buildVerificationEmail({
        name: savedUser.firstName || savedUser.name,
        email: savedUser.email,
        token: verificationToken,
        type: savedUser.type
      });
      await sendMail({ to: savedUser.email, subject, html, text });
      console.log('Verification email queued/sent to', savedUser.email);
    } catch (mailErr) {
      console.warn('Failed to send verification email:', mailErr.message);
    }

    // Respond without logging in; frontend should redirect to verification-sent page
    res.status(201).json({ 
      message: 'Registration successful. Verification email sent.',
      email: savedUser.email,
      type: savedUser.type,
      verificationSent: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error registering user: ' + error.message });
  }
}

// Request password reset OTP
export async function requestPasswordOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'There is no account with this email.' });
    }
    // Generate 6-digit numeric OTP
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    // Hash the OTP before storing (simple SHA256 sufficient for short-term verification)
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetOtpHash = hash;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();
    const { subject, html, text } = buildPasswordOtpEmail({ name: user.firstName || user.name, email, otp });
    await sendMail({ to: email, subject, html, text });
    return res.json({ message: 'OTP sent to your email.' });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to request OTP: ' + e.message });
  }
}

// Reset password with OTP
export async function resetPasswordWithOtp(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    const user = await User.findOne({ email });
    if (!user || !user.resetOtpHash || !user.resetOtpExpires) return res.status(400).json({ message: 'Invalid or expired OTP' });
    if (user.resetOtpExpires < new Date()) {
      // Proactively clear expired OTP fields
      user.resetOtpHash = undefined;
      user.resetOtpExpires = undefined;
      await user.save();
      return res.status(400).json({ message: 'OTP expired' });
    }
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (hash !== user.resetOtpHash) return res.status(400).json({ message: 'Invalid OTP' });
    // Set new password and clear OTP fields
    user.password = newPassword;
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    await user.save();
    return res.json({ message: 'Password has been reset successfully' });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to reset password: ' + e.message });
  }
}
// User login (admin, farmer, or customer login)
export async function userLogin(req, res) {
  const { email, password } = req.body;

  try {
    // Find the user by email
    let user = null;
    try {
      user = await User.findOne({ email });
    } catch (dbError) {
      console.log('Database connection issue during login');
      return res.status(503).json({ message: 'Database connection error. Please try again later.' });
    }

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check if the user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked' });
    }

    // Block login if not verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified. Please verify your email to continue.', code: 'EMAIL_NOT_VERIFIED' });
    }

    // Compare the password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Generate a JWT token after successful login
    const token = generateToken(user);

    // Send the login response with the token and user data
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        type: user.type,
        farmName: user.farmName,
        phone: user.phone,
        farmLocation: user.farmLocation,
        farmSize: user.farmSize,
        experience: user.experience,
        specializations: user.specializations,
        profilePicture: user.profilePicture || 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg',
        subscriptionPaid: user.subscriptionPaid,
        farmerStatus: user.farmerStatus,
        kycStatus: user.kycStatus,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed due to an error: ' + error.message });
  }
}

// Logout the user (optional if you want to implement logout functionality)
export async function logoutUser(req, res) {
  // Handle logout logic (e.g., invalidate token, clear session)
  res.json({ message: 'Logout successful' });
}

// Get the current logged-in user details
export async function getUser(req, res) {
  if (!req.user) {
    return res.json({
      message: 'Please login to view user details',
    });
  }
  try {
    const dbUser = await User.findById(req.user.id).lean();
    if (!dbUser) return res.status(404).json({ message: 'User not found' });
    const token = generateToken(dbUser);
    res.json({ token, user: {
      id: dbUser._id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      name: dbUser.name,
      type: dbUser.type,
      farmName: dbUser.farmName,
      phone: dbUser.phone,
      farmLocation: dbUser.farmLocation,
      farmSize: dbUser.farmSize,
      experience: dbUser.experience,
      specializations: dbUser.specializations,
      profilePicture: dbUser.profilePicture,
      subscriptionPaid: dbUser.subscriptionPaid,
      farmerStatus: dbUser.farmerStatus,
      kycStatus: dbUser.kycStatus,
      kyc: dbUser.kyc,
      kycRejectionReason: dbUser.kycRejectionReason,
      kycReviewedAt: dbUser.kycReviewedAt,
      dateOfBirth: dbUser.dateOfBirth,
      address: dbUser.address,
      city: dbUser.city,
      state: dbUser.state,
      zipCode: dbUser.zipCode,
    }});
  } catch (e) {
    res.status(500).json({ message: 'Error loading user: ' + e.message });
  }
}

// Update user profile
export async function updateProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Please login to update profile',
      });
    }

    // Build updates object only with provided fields to avoid overwriting with undefined
    const allowedFields = [
      'name', 'firstName', 'lastName', 'phone',
      'farmName', 'farmLocation', 'farmSize', 'experience', 'specializations', 'bio', 'profilePicture',
      'dateOfBirth', 'address', 'city', 'state', 'zipCode'
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    const userId = req.user.id || req.user._id;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid auth payload' });
    }

    // Find and update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Return updated user data (without password)
    const userResponse = {
      id: updatedUser._id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      name: updatedUser.name,
      type: updatedUser.type,
      farmName: updatedUser.farmName,
      phone: updatedUser.phone,
      farmLocation: updatedUser.farmLocation,
      farmSize: updatedUser.farmSize,
      experience: updatedUser.experience,
      specializations: updatedUser.specializations,
      bio: updatedUser.bio,
      profilePicture: updatedUser.profilePicture || 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg',
      subscriptionPaid: updatedUser.subscriptionPaid,
      farmerStatus: updatedUser.farmerStatus,
      dateOfBirth: updatedUser.dateOfBirth,
      address: updatedUser.address,
      city: updatedUser.city,
      state: updatedUser.state,
      zipCode: updatedUser.zipCode,
    };

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Error updating profile: ' + error.message
    });
  }
}

// Farmer pays subscription (simulated)
export async function payFarmerSubscription(req, res) {
  try {
    if (!req.user || req.user.type !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can pay subscription' });
    }

    const farmer = await User.findById(req.user._id);
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });

    farmer.subscriptionPaid = true;
    // If previously no status or pending_payment, move to pending_review
    if (!farmer.farmerStatus || farmer.farmerStatus === '' || farmer.farmerStatus === 'pending_payment') {
      farmer.farmerStatus = 'pending_review';
    }
    await farmer.save();

    const token = generateToken(farmer);
    res.json({
      message: 'Subscription payment recorded. Awaiting admin approval.',
      subscriptionPaid: farmer.subscriptionPaid,
      farmerStatus: farmer.farmerStatus,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing subscription: ' + error.message });
  }
}

// Admin: list farmers pending review
export async function listPendingFarmers(req, res) {
  try {
    const farmers = await User.find({ type: 'farmer', farmerStatus: 'pending_review', subscriptionPaid: true });
    res.json(farmers.map(f => ({
      id: f._id,
      name: f.name,
      email: f.email,
      farmName: f.farmName,
      farmLocation: f.farmLocation,
      subscriptionPaid: f.subscriptionPaid,
      farmerStatus: f.farmerStatus,
      createdAt: f.createdAt,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error listing pending farmers: ' + error.message });
  }
}

// Admin: list farmers with pending KYC
export async function listPendingKycs(req, res) {
  try {
    const farmers = await User.find({ type: 'farmer', kycStatus: 'pending' });
    res.json(farmers.map(f => ({
      id: f._id,
      name: f.name,
      email: f.email,
      farmName: f.farmName,
      kycStatus: f.kycStatus,
      submittedAt: f.kyc?.submittedAt,
      nicFrontUrl: f.kyc?.nicFrontUrl || '',
      nicBackUrl: f.kyc?.nicBackUrl || '',
      bank: f.kyc?.bank || { accountName: '', accountNumber: '', bankName: '', branch: '', swiftCode: '' },
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error listing pending KYC: ' + error.message });
  }
}

// Admin dashboard stats
export async function adminDashboardStats(req, res) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalCustomers,
      totalFarmers,
      totalAdmins,
      pendingFarmers,
      pendingKycs,
      totalProducts,
      productsOutOfStock,
      totalOrders,
      ordersToday,
      newUsersToday,
      revenueAgg
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ type: 'customer' }),
      User.countDocuments({ type: 'farmer' }),
      User.countDocuments({ type: 'admin' }),
      User.countDocuments({ type: 'farmer', farmerStatus: 'pending_review', subscriptionPaid: true }),
      User.countDocuments({ type: 'farmer', kycStatus: 'pending' }),
      Product.countDocuments({}),
      Product.countDocuments({ quantityInStock: { $lte: 0 } }),
  CartOrder.countDocuments({}),
  CartOrder.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      CartOrder.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
      ])
    ]);

    const totalRevenue = Array.isArray(revenueAgg) && revenueAgg.length > 0 ? revenueAgg[0].revenue : 0;

    return res.json({
      users: { total: totalUsers, customers: totalCustomers, farmers: totalFarmers, admins: totalAdmins, newToday: newUsersToday },
      orders: { total: totalOrders, today: ordersToday },
      products: { total: totalProducts, outOfStock: productsOutOfStock },
      pending: { farmers: pendingFarmers, kycs: pendingKycs },
      revenue: { total: totalRevenue }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error getting admin stats: ' + error.message });
  }
}

// Admin: list all users (basic fields) with optional filters
export async function listAllUsersAdmin(req, res) {
  try {
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Only admins can list users' });
    }

    const { type, verified, q } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (verified === 'true') filter.isVerified = true;
    if (verified === 'false') filter.isVerified = false;
    if (q) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [
        { email: rx },
        { firstName: rx },
        { lastName: rx },
        { name: rx },
        { farmName: rx }
      ];
    }

    const users = await User.find(filter)
      .select('firstName lastName name email type isVerified kycStatus farmerStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const mapped = users.map(u => ({
      id: u._id,
      email: u.email,
      name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || '—',
      type: u.type,
      isVerified: !!u.isVerified,
      kycStatus: u.kycStatus,
      farmerStatus: u.farmerStatus,
      createdAt: u.createdAt
    }));

    return res.json({ users: mapped, count: mapped.length });
  } catch (e) {
    console.error('Admin list users failed:', e);
    return res.status(500).json({ message: 'Failed to list users: ' + e.message });
  }
}

// Admin approve farmer
export async function approveFarmer(req, res) {
  try {
    const { id } = req.params;
    const farmer = await User.findById(id);
    if (!farmer || farmer.type !== 'farmer') return res.status(404).json({ message: 'Farmer not found' });
    if (!farmer.subscriptionPaid) return res.status(400).json({ message: 'Farmer has not paid subscription' });
    farmer.farmerStatus = 'approved';
    await farmer.save();
    const token = generateToken(farmer);
    res.json({ message: 'Farmer approved', id: farmer._id, farmerStatus: farmer.farmerStatus, token });
  } catch (error) {
    res.status(500).json({ message: 'Error approving farmer: ' + error.message });
  }
}

// Admin decline farmer
export async function declineFarmer(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const farmer = await User.findById(id);
    if (!farmer || farmer.type !== 'farmer') return res.status(404).json({ message: 'Farmer not found' });
    farmer.farmerStatus = 'declined';
    await farmer.save();
    const token = generateToken(farmer);
    res.json({ message: 'Farmer declined', id: farmer._id, farmerStatus: farmer.farmerStatus, reason: reason || '', token });
  } catch (error) {
    res.status(500).json({ message: 'Error declining farmer: ' + error.message });
  }
}

// Verify email endpoint
export async function verifyEmail(req, res) {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).send('Invalid verification link');

    const user = await User.findOne({ email, emailVerificationToken: token });
    if (!user) return res.status(400).send('Invalid or expired verification token');
    if (user.isVerified) {
      return res.redirect(`${frontendUrl}/email-verified?email=${encodeURIComponent(email)}&type=${user.type}`);
    }
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return res.status(400).send('Verification link has expired. Please request a new one.');
    }
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    // redirect to frontend success page with role
    return res.redirect(`${frontendUrl}/email-verified?email=${encodeURIComponent(email)}&type=${user.type}`);
  } catch (e) {
    console.error('Email verification error:', e);
    return res.status(500).send('Server error verifying email');
  }
}

// Resend verification
export async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });
    user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    const { subject, html, text } = buildVerificationEmail({
      name: user.firstName || user.name,
      email: user.email,
      token: user.emailVerificationToken,
      type: user.type
    });
    await sendMail({ to: user.email, subject, html, text });
    res.json({ message: 'Verification email sent' });
  } catch (e) {
    console.error('Resend verification error:', e);
    res.status(500).json({ message: 'Failed to resend verification' });
  }
}

// Delete current user account
export async function deleteMe(req, res) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const id = req.user.id || req.user._id;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ message: 'Account deleted' });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to delete account: ' + e.message });
  }
}

// Submit KYC (farmer only)
export async function submitKyc(req, res) {
  try {
    if (!req.user || req.user.type !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can submit KYC' });
    }
    const { nicFrontUrl, nicBackUrl, bank } = req.body;
    if (!nicFrontUrl || !nicBackUrl) return res.status(400).json({ message: 'NIC front and back images are required' });

    const dbUser = await User.findById(req.user.id || req.user._id);
    if (!dbUser || dbUser.type !== 'farmer') return res.status(404).json({ message: 'Farmer not found' });

    // Prevent resubmission while pending or approved
    if (dbUser.kycStatus === 'pending') {
      return res.status(400).json({ message: 'KYC is already submitted and pending review' });
    }
    if (dbUser.kycStatus === 'approved') {
      return res.status(400).json({ message: 'KYC already approved' });
    }

    dbUser.kyc = {
      nicFrontUrl,
      nicBackUrl,
      bank: {
        accountName: bank?.accountName || '',
        accountNumber: bank?.accountNumber || '',
        bankName: bank?.bankName || '',
        branch: bank?.branch || '',
        swiftCode: bank?.swiftCode || '',
      },
      submittedAt: new Date(),
      reviewedAt: undefined,
      reviewerId: undefined,
      notes: ''
    };
    dbUser.kycStatus = 'pending';
    await dbUser.save();

    return res.json({ message: 'KYC submitted. Awaiting admin review.', kycStatus: dbUser.kycStatus });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to submit KYC: ' + e.message });
  }
}

// Admin review KYC - approve
export async function approveKyc(req, res) {
  try {
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params; // farmer id
    const farmer = await User.findById(id);
    if (!farmer || farmer.type !== 'farmer') return res.status(404).json({ message: 'Farmer not found' });

    farmer.kycStatus = 'approved';
    farmer.kycRejectionReason = '';
    farmer.kycReviewedAt = new Date();
    if (farmer.kyc) {
      farmer.kyc.reviewedAt = new Date();
      farmer.kyc.reviewerId = req.user.id;
    }
    await farmer.save();
    return res.json({ message: 'KYC approved', kycStatus: farmer.kycStatus });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to approve KYC: ' + e.message });
  }
}

// Admin review KYC - decline
export async function declineKyc(req, res) {
  try {
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params; // farmer id
    const { reason } = req.body;
    const farmer = await User.findById(id);
    if (!farmer || farmer.type !== 'farmer') return res.status(404).json({ message: 'Farmer not found' });

    farmer.kycStatus = 'rejected';
    farmer.kycRejectionReason = reason || '';
    farmer.kycReviewedAt = new Date();
    // Delete KYC data so the farmer must resubmit fresh
    farmer.kyc = undefined;
    await farmer.save();
    return res.json({ message: 'KYC rejected', kycStatus: farmer.kycStatus, reason: reason || '' });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to reject KYC: ' + e.message });
  }
}

// Get farmer market data
export async function getFarmerMarket(req, res) {
  try {
    let farmerId;
    
    // If farmerId is in params, it's a public request
    if (req.params.farmerId) {
      farmerId = req.params.farmerId;
    } else {
      // Otherwise, it's an authenticated farmer accessing their own data
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      farmerId = req.user.id;
    }

    const farmer = await User.findById(farmerId);
    if (!farmer || farmer.type !== 'farmer') {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    return res.json({ 
      success: true, 
      marketData: farmer.marketData || null 
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get market data: ' + error.message });
  }
}

// Update farmer market data
export async function updateFarmerMarket(req, res) {
  try {
    const farmer = await User.findById(req.user.id);
    if (!farmer || farmer.type !== 'farmer') {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Validate required fields
    const { farmName, farmDescription, location } = req.body;
    if (!farmName || !farmDescription || !location) {
      return res.status(400).json({ 
        message: 'Farm name, description, and location are required' 
      });
    }

    farmer.marketData = req.body;
    farmer.marketUpdatedAt = new Date();
    await farmer.save();

    return res.json({ 
      success: true, 
      message: 'Market profile updated successfully',
      marketData: farmer.marketData
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update market data: ' + error.message });
  }
}

// Get farmer profile by ID (for viewing other farmers' profiles)
export async function getFarmerById(req, res) {
  try {
    const { farmerId } = req.params;
    
    const farmer = await User.findById(farmerId).select('-password -refreshTokens -emailOtp -passwordOtp');
    if (!farmer || farmer.type !== 'farmer') {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    return res.json({ 
      success: true, 
      user: farmer
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get farmer profile: ' + error.message });
  }
}
