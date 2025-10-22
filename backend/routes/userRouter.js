// routes/userRouter.js

import express from 'express';
import { userLogin, registerUser, getUser, logoutUser, updateProfile, payFarmerSubscription, listPendingFarmers, approveFarmer, declineFarmer, verifyEmail, resendVerification, deleteMe, submitKyc, approveKyc, declineKyc, listPendingKycs, adminDashboardStats, requestPasswordOtp, resetPasswordWithOtp, getFarmerMarket, updateFarmerMarket, getFarmerById, listAllUsersAdmin } from '../controllers/userController.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const userRouter = express.Router();

// Route for registration (POST /api/users/register)
userRouter.post('/register', registerUser);  // This should be defined

// Route for login (POST /api/users/login)
userRouter.post('/login', userLogin);

// Email verification
userRouter.get('/verify-email', verifyEmail);
userRouter.post('/resend-verification', resendVerification);
// Password reset via OTP
userRouter.post('/password/forgot', requestPasswordOtp);
userRouter.post('/password/reset', resetPasswordWithOtp);

// Route to get the logged-in user's details (GET /api/users/me)
userRouter.get('/me', authenticate, getUser);

// Route to update user profile (PUT /api/users/profile)
userRouter.put('/profile', authenticate, updateProfile);

// Route to log out (POST /api/users/logout)
userRouter.post('/logout', logoutUser);

// Delete current account
userRouter.delete('/me', authenticate, deleteMe);

// Farmer subscription payment (POST /api/users/farmer/pay-subscription)
userRouter.post('/farmer/pay-subscription', authenticate, payFarmerSubscription);

// Farmer submit KYC
userRouter.post('/farmer/kyc', authenticate, submitKyc);

// Farmer market profile
userRouter.get('/farmer/market', authenticate, getFarmerMarket);
userRouter.post('/farmer/market', authenticate, updateFarmerMarket);

// Get farmer profile by ID (public)
userRouter.get('/farmer/:farmerId', getFarmerById);

// Get farmer market data by ID (public)
userRouter.get('/farmer/market/:farmerId', getFarmerMarket);

// Admin: list pending farmers
userRouter.get('/admin/farmers/pending', authenticate, isAdmin, listPendingFarmers);

// Admin: approve farmer
userRouter.post('/admin/farmers/:id/approve', authenticate, isAdmin, approveFarmer);

// Admin: decline farmer
userRouter.post('/admin/farmers/:id/decline', authenticate, isAdmin, declineFarmer);

// Admin: review KYC
userRouter.post('/admin/farmers/:id/kyc/approve', authenticate, isAdmin, approveKyc);
userRouter.post('/admin/farmers/:id/kyc/decline', authenticate, isAdmin, declineKyc);

// Admin: list pending KYC
userRouter.get('/admin/farmers/pending-kyc', authenticate, isAdmin, listPendingKycs);

// Admin: dashboard stats
userRouter.get('/admin/dashboard-stats', authenticate, isAdmin, adminDashboardStats);

// Admin: list all users
userRouter.get('/admin/users', authenticate, isAdmin, listAllUsersAdmin);

export default userRouter;
