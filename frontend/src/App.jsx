import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Banner from './components/Slideshow';
import FarmerMarketTest from './components/FarmerMarketTest';

// Customer Pages
import Home from './pages/customer/Home';
import ProductDetails from './pages/customer/ProductDetails';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import OrderConfirmation from './pages/customer/OrderConfirmation';
import Login from './pages/customer/Login';
import Signup from './pages/customer/Signup';
import Profile from './pages/customer/Profile';
import Orders from './pages/customer/Orders';
import CancelOrder from './pages/customer/CancelOrder';
import Products from './pages/customer/Products';
import PaymentSuccess from './pages/customer/PaymentSuccess';
import PaymentCancel from './pages/customer/PaymentCancel';

// Farmer Pages
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerProducts from './pages/farmer/FarmerProducts';
import FarmerSignup from './pages/farmer/FarmerSignup';
import FarmerLogin from './pages/farmer/FarmerLogin';
import AddProduct from './pages/farmer/AddProduct';
import AddPromotion from './pages/farmer/AddPromotion';
import ViewProducts from './pages/farmer/ViewProducts';
import ManageOrders from './pages/farmer/ManageOrders';
import EditProfile from './pages/farmer/EditProfile';
import FarmerKyc from './pages/farmer/FarmerKyc';
import FarmerSubscription from './pages/farmer/FarmerSubscription';
import SubscriptionSuccess from './pages/farmer/SubscriptionSuccess';
import SubscriptionCancelled from './pages/farmer/SubscriptionCancelled';
import FarmerMarket from './pages/farmer/FarmerMarket';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminKycRequests from './pages/admin/AdminKycRequests';
import AdminCancelledOrders from './pages/admin/AdminCancelledOrders';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';

// Public Pages
import Promotions from './pages/Promotions';
import Community from './pages/Community';
import SeasonalPicks from './pages/SeasonalPicks';
import EmailVerificationSent from './pages/EmailVerificationSent';
import EmailVerified from './pages/EmailVerified';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Utility Pages
import NotFound from './pages/NotFound';

const Layout = () => {
  const location = useLocation();
  const hideLayoutPaths = [
    '/login',
    '/signup',
    '/farmer/signup',
    '/farmer/login',
    '/verify-email',
    '/email-verified',
    '/forgot-password',
    '/reset-password'
  ];
  const hide = hideLayoutPaths.includes(location.pathname);
  return (
    <div className="min-h-screen flex flex-col">
      {!hide && <Header />}
      <Routes>
          {/* Test Route */}
          <Route path="/test-farmer-market" element={<FarmerMarketTest />} />
          
          {/* Customer Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:productId" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:orderId" element={<OrderConfirmation />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:orderId/cancel" element={<CancelOrder />} />
          
          {/* Farmer Routes */}
          <Route path="/farmer/signup" element={<FarmerSignup />} />
          <Route path="/farmer/login" element={<FarmerLogin />} />
          <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
          <Route path="/farmer/subscription" element={<FarmerSubscription />} />
          <Route path="/farmer/subscription-success" element={<SubscriptionSuccess />} />
          <Route path="/farmer/subscription-cancelled" element={<SubscriptionCancelled />} />
          <Route path="/farmer/products" element={<FarmerProducts />} />
          <Route path="/farmer/products/new" element={<AddProduct />} />
          <Route path="/farmer/products/edit/:id" element={<AddProduct />} />
          <Route path="/farmer/promotions/new" element={<AddPromotion />} />
          <Route path="/farmer/promotions/edit/:id" element={<AddPromotion />} />
          <Route path="/farmer/orders" element={<ManageOrders />} />
          <Route path="/farmer/profile" element={<EditProfile />} />
          <Route path="/farmer/kyc" element={<FarmerKyc />} />
          <Route path="/farmer/market" element={<FarmerMarket />} />
          <Route path="/farmer/market/:farmerId" element={<FarmerMarket />} />
          
          {/* Public Pages */}
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/community" element={<Community />} />
          <Route path="/seasonal" element={<SeasonalPicks />} />
          <Route path="/verify-email" element={<EmailVerificationSent />} />
          <Route path="/email-verified" element={<EmailVerified />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/kyc-requests" element={<AdminKycRequests />} />
          <Route path="/admin/cancelled-orders" element={<AdminCancelledOrders />} />
          <Route path="/admin/products" element={<div className="min-h-screen bg-gray-50 py-8"><div className="max-w-7xl mx-auto px-4"><h1 className="text-3xl font-bold text-gray-800">Admin Products</h1><p className="text-gray-600 mt-2">Admin product management - Coming Soon!</p></div></div>} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
      </Routes>
      {!hide && <Footer />}
    </div>
  );
};

const App = () => (
  <Router>
    <Layout />
  </Router>
);

export default App
