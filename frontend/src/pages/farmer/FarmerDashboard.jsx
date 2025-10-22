import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import formatCurrency from '../../utils/currency';
import notificationService from '../../services/notificationService';
import FarmerReports from '../../components/FarmerReports';

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [kycStatus, setKycStatus] = useState('');
  const [kycRejectionReason, setKycRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState('');
  const [bannerType, setBannerType] = useState('info'); // info | warning | success
  const [showKycModal, setShowKycModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeOrders: 0,
    pendingOrders: 0,
    monthlyRevenue: 0,
    totalSales: 0,
    avgRating: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Function to refresh user data
  const refreshUserData = async () => {
    try {
      setRefreshing(true);
      const me = await api.getCurrentUser();
      console.log('Refreshed user data:', me);
      if (me?.user) {
        const updated = { ...me.user, type: 'farmer' };
        localStorage.setItem('farmerUser', JSON.stringify(updated));
        setFarmer(updated);
        setKycStatus(me.user.kycStatus || '');
        setKycRejectionReason(me.user.kycRejectionReason || '');
        console.log('Refreshed KYC status:', me.user.kycStatus);
        
        // Check subscription status
        await checkSubscriptionStatus(updated.id);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Function to check if farmer has active subscription
  const checkSubscriptionStatus = async (farmerId) => {
    try {
      const response = await api.get(`/payments/farmer-capabilities/${farmerId}`);
      if (response.success && response.capabilities) {
        setHasActiveSubscription(response.capabilities.hasActiveSubscription);
        console.log('Farmer capabilities:', response.capabilities);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      // In demo mode, default to no active subscription but all features enabled
      setHasActiveSubscription(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      const stored = localStorage.getItem('farmerUser');
      if (!stored) {
        navigate('/farmer/login');
        return;
      }
      const u = JSON.parse(stored);
      setFarmer(u);
      
      // Check for subscription success from PayHere return
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('subscription') === 'success') {
        setShowSuccessMessage(true);
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccessMessage(false), 5000);
        
        // Force refresh user data after successful payment with multiple attempts
        const refreshWithRetry = async (attempt = 1, maxAttempts = 5) => {
          console.log(`Refreshing user data attempt ${attempt}/${maxAttempts}`);
          await refreshUserData();
          
          // Check if subscription was updated
          const currentFarmer = JSON.parse(localStorage.getItem('farmerUser') || '{}');
          if (!currentFarmer.subscriptionPaid && attempt < maxAttempts) {
            // If subscription still not updated, try again after a delay
            setTimeout(() => refreshWithRetry(attempt + 1, maxAttempts), 3000);
          }
        };
        
        setTimeout(() => {
          refreshWithRetry();
        }, 2000);
      }
      
      try {
        const me = await api.getCurrentUser();
        console.log('Fresh user data from API:', me);
        if (me?.user) {
          const updated = { ...me.user, type: 'farmer' };
          localStorage.setItem('farmerUser', JSON.stringify(updated));
          setFarmer(updated);
          setKycStatus(me.user.kycStatus || '');
          setKycRejectionReason(me.user.kycRejectionReason || '');
          console.log('Updated KYC status:', me.user.kycStatus);
          
          // Check subscription status
          await checkSubscriptionStatus(updated.id);
        } else {
          console.log('No user data received, using cached data');
          setKycStatus(u.kycStatus || '');
          setKycRejectionReason(u.kycRejectionReason || '');
          
          // Still check subscription with cached user ID
          await checkSubscriptionStatus(u.id);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        setKycStatus(u.kycStatus || '');
        setKycRejectionReason(u.kycRejectionReason || '');
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, [navigate]);

  useEffect(() => {
    if (!farmer) return;
    
    // DEMO MODE: All features enabled regardless of subscription status
    // Check KYC status for appropriate messaging
    const status = kycStatus || '';
    if (status === '') {
      setBannerType('info');
      setBannerMsg('Demo Mode: All features enabled! Complete KYC verification for accurate payout simulation.');
    } else if (status === 'rejected') {
      setBannerType('warning');
      setBannerMsg(`Demo Mode: KYC was rejected.${kycRejectionReason ? ' Reason: ' + kycRejectionReason : ''} All features remain enabled for demo.`);
    } else if (status === 'pending') {
      setBannerType('info');
      setBannerMsg('Demo Mode: KYC submitted and under review. All features are enabled for demonstration purposes.');
    } else if (status === 'approved') {
      setBannerType('success');
      setBannerMsg('Demo Mode: KYC approved! All features enabled including product management and order processing.');
    }
  }, [farmer, kycStatus, kycRejectionReason]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!farmer) return;
      
      try {
        setDashboardLoading(true);
        
        // Load farmer's orders
        const ordersRes = await api.getFarmerOrders();
        const orders = ordersRes.orders || [];
        
        // Load farmer's products
        const productsRes = await api.getFarmerProducts();
        const products = productsRes.products || [];
        
        // Store all products for notifications
        setAllProducts(products);
        
        // Check for product alerts (low stock, out of stock, expiry)
        notificationService.checkProductAlerts(products);
        
        // Calculate stats
        const totalProducts = products.length;
        const activeOrders = orders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status)).length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        
        // Calculate monthly revenue (current month)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = orders
          .filter(o => {
            const orderDate = new Date(o.createdAt || o.date);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
          })
          .reduce((sum, o) => sum + (o.total || 0), 0);
        
        const totalSales = orders.length;
        
        // Get recent orders (last 5)
        const recentOrdersList = orders
          .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
          .slice(0, 5)
          .map(order => ({
            id: order.orderId || order._id || order.id, // Use orderId first, fallback to _id
            customer: order.customerName || order.user?.firstName + ' ' + order.user?.lastName || 'Customer',
            items: order.items?.map(item => `${item.name || item.productName} (${item.quantity}${item.unit || 'pcs'})`) || [],
            total: order.total || 0,
            status: order.status || order.orderStatus || 'pending',
            date: order.createdAt || order.date
          }));
        
        // Calculate top products by sales
        const productSales = {};
        orders.forEach(order => {
          order.items?.forEach(item => {
            const productName = item.name || item.productName;
            if (productName) {
              if (!productSales[productName]) {
                productSales[productName] = { sold: 0, revenue: 0 };
              }
              productSales[productName].sold += item.quantity || 0;
              productSales[productName].revenue += (item.price || 0) * (item.quantity || 0);
            }
          });
        });
        
        const topProductsList = Object.entries(productSales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 4);
        
        setStats({
          totalProducts,
          activeOrders,
          pendingOrders,
          monthlyRevenue,
          totalSales,
          avgRating: 4.8 // TODO: Calculate from reviews
        });
        
        setRecentOrders(recentOrdersList);
        setTopProducts(topProductsList);
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setDashboardLoading(false);
      }
    };
    
    loadDashboardData();
  }, [farmer]);

  // Periodic refresh for KYC status updates
  useEffect(() => {
    if (!farmer || kycStatus === 'approved') return; // Don't refresh if already approved
    
    const interval = setInterval(() => {
      console.log('Periodic KYC status check...');
      refreshUserData();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [farmer, kycStatus]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const markOrderAsReady = async (orderId) => {
    const notes = prompt('Add any preparation notes (optional):');
    
    try {
      const response = await api.post(`/orders/${orderId}/mark-ready`, {
        preparationNotes: notes || '',
        estimatedReadyTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      });

      if (response.success) {
        alert('Order marked as ready successfully!');
        
        // Update the order status in the local state
        setRecentOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'ready' }
            : order
        ));

        // Refresh dashboard data
        const farmerId = farmer?.id;
        if (farmerId) {
          try {
            const ordersResponse = await api.get('/orders/farmer');
            // Process and update the orders as needed
          } catch (error) {
            console.error('Failed to refresh orders:', error);
          }
        }
      } else {
        throw new Error(response.message || 'Failed to mark order as ready');
      }
    } catch (error) {
      console.error('Mark order as ready error:', error);
      alert('Failed to mark order as ready: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Farmer Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's an overview of your farm business.</p>
        </div>

        {/* Status Banners */}
        {!loading && (
          <div className="mb-6 space-y-4">
            {/* Premium Member Success Message */}
            {showSuccessMessage && (
              <div className="bg-gradient-to-r from-yellow-50 to-green-50 border border-green-200 p-4 rounded-lg flex items-center justify-between shadow-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-green-500 flex items-center justify-center text-white text-lg mr-3">
                  </div>
                  <div>
                    <div className="font-bold text-green-800 text-lg">You are now a Premium Member!</div>
                    <div className="text-sm text-green-700">Welcome to GreenHarvest Premium! You can now add products to the marketplace and access all features.</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSuccessMessage(false)}
                  className="text-green-600 hover:text-green-800 ml-4 text-xl"
                >
                  Close
                </button>
              </div>
            )}

            {/* Requirements Section */}
            <div className="space-y-4">
              {/* KYC Status - First requirement */}
              <div className={`${
                kycStatus === 'approved' 
                  ? 'bg-green-50 border-green-200' 
                  : kycStatus === 'rejected' 
                    ? 'bg-red-50 border-red-200' 
                    : kycStatus === 'pending' 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-blue-50 border-blue-200'
              } border p-4 rounded-lg flex items-center justify-between`}>
                <div>
                  <div className={`font-semibold ${
                    kycStatus === 'approved' 
                      ? 'text-green-800' 
                      : kycStatus === 'rejected' 
                        ? 'text-red-800' 
                        : kycStatus === 'pending' 
                          ? 'text-yellow-800' 
                          : 'text-blue-800'
                  }`}>
                    KYC Verification Required
                  </div>
                  <div className={`text-sm ${
                    kycStatus === 'approved' 
                      ? 'text-green-700' 
                      : kycStatus === 'rejected' 
                        ? 'text-red-700' 
                        : kycStatus === 'pending' 
                          ? 'text-yellow-700' 
                          : 'text-blue-700'
                  }`}>
                    {kycStatus === 'approved' 
                      ? 'Your KYC verification is complete and approved!' 
                      : kycStatus === 'rejected' 
                        ? `KYC rejected: ${kycRejectionReason || 'Please check your documents and resubmit'}` 
                        : kycStatus === 'pending' 
                          ? 'Your KYC documents are under review by our admin team' 
                          : 'Complete KYC verification first to unlock subscription and product features'
                    }
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                  {(kycStatus === '' || kycStatus === 'rejected') && (
                    <Link 
                      to="/farmer/kyc" 
                      className="px-3 py-2 rounded text-white"
                      style={{ backgroundColor: '#51ac37' }}
                    >
                      {kycStatus === '' ? 'Verify Now' : 'Resubmit KYC'}
                    </Link>
                  )}
                  {kycStatus === 'pending' && (
                    <>
                      <button disabled className="px-3 py-2 rounded bg-gray-200 text-gray-700 cursor-not-allowed">
                        Under Review
                      </button>
                      <button
                        onClick={refreshUserData}
                        disabled={refreshing}
                        className="px-2 py-2 rounded text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Check for updates"
                      >
                        {refreshing ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                  {kycStatus === 'approved' && (
                      <div className="px-3 py-2 rounded bg-green-100 text-green-800 font-medium">
                      Verified
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Status - Only show after KYC approval */}
              {kycStatus === 'approved' && !hasActiveSubscription && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-orange-800">Premium Subscription Available</div>
                    <div className="text-sm text-orange-700">Your KYC is approved! Subscribe to support the platform (all features enabled in demo mode)</div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                    <Link to="/farmer/subscription" className="px-4 py-2 rounded text-white font-medium" style={{ backgroundColor: '#51ac37' }}>
                      Subscribe Now
                    </Link>
                    <button
                      onClick={refreshUserData}
                      disabled={refreshing}
                      className="px-3 py-2 text-sm border border-orange-300 text-orange-700 rounded hover:bg-orange-50 disabled:opacity-50"
                      title="Refresh status if you've already subscribed"
                    >
                      {refreshing ? 'Syncing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
              )}

              {/* Premium Member Status */}
              {kycStatus === 'approved' && hasActiveSubscription && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-lg mr-3">
                    </div>
                    <div>
                      <div className="font-semibold text-green-800">You are now a Premium Member!</div>
                      <div className="text-sm text-green-700">Full access unlocked - Add products, manage orders, and grow your farm business</div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                    <div className="px-4 py-2 rounded bg-green-600 text-white font-medium">
                      Active
                    </div>
                    <button
                      onClick={refreshUserData}
                      disabled={refreshing}
                      className="px-3 py-2 text-sm border border-green-300 text-green-700 rounded hover:bg-green-50 disabled:opacity-50"
                    >
                      {refreshing ? 'Syncing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{backgroundColor: '#51ac37'}}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalProducts}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{backgroundColor: '#51ac37'}}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3v-8a1 1 0 011-1h4a1 1 0 011 1v8h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activeOrders}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{backgroundColor: '#51ac37'}}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.monthlyRevenue)}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{backgroundColor: '#51ac37'}}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalSales}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{backgroundColor: '#51ac37'}}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Rating</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.avgRating}/5.0</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{backgroundColor: '#51ac37'}}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/farmer/products/new')}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              Add Product
            </button>
            
            <button
              onClick={() => navigate('/farmer/promotions/new')}
              className="flex items-center justify-center px-4 py-3 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors bg-orange-50"
            >
              <svg className="w-5 h-5 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
              </svg>
              Add Promotion
            </button>
            
            <Link
              to="/farmer/orders"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Manage Orders
            </Link>
            
            <Link
              to="/farmer/products"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              View Products
            </Link>
            
            <Link
              to="/farmer/profile"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
              </svg>
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Reports Section */}
        <div className="mb-8">
          <FarmerReports />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
                <Link to="/farmer/orders" className="text-sm hover:underline" style={{color: '#51ac37'}}>
                  View all
                </Link>
              </div>
            </div>
            
            {dashboardLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading recent orders...</p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Recent Orders</h3>
                <p className="text-gray-600">You haven't received any orders yet. Add some products to start selling!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentOrders.map(order => (
                  <div key={order.id} className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-800">#{order.id}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">Customer: {order.customer}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      Items: {order.items.join(', ')}
                    </p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-semibold" style={{color: '#51ac37'}}>
                        {formatCurrency(order.total)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(order.date).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Mark as Ready Button */}
                    {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'processing') && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => markOrderAsReady(order.id)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Mark as Ready
                        </button>
                      </div>
                    )}
                    
                    {order.status === 'ready' && (
                      <div className="flex justify-end">
                        <span className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-medium rounded-lg">
                          Marked as Ready
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Top Products</h2>
                <Link to="/farmer/products" className="text-sm hover:underline" style={{color: '#51ac37'}}>
                  View all
                </Link>
              </div>
            </div>
            
            {dashboardLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading top products...</p>
              </div>
            ) : topProducts.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Product Sales Yet</h3>
                <p className="text-gray-600">Start selling your products to see performance metrics here!</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.sold} sold</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold" style={{color: '#51ac37'}}>
                          {formatCurrency(product.revenue)}
                        </p>
                        <p className="text-sm text-gray-600">revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Inventory Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Product Inventory</h2>
              <span className="text-sm text-gray-600">{allProducts.length} products</span>
            </div>
          </div>
          
          {dashboardLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading products...</p>
            </div>
          ) : allProducts.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Products Added</h3>
              <p className="text-gray-600 mb-4">Start by adding your first product to the marketplace!</p>
              <Link
                to="/farmer/products/new"
                className="inline-flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90"
                style={{ backgroundColor: '#51ac37' }}
              >
                Add Product
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allProducts.map((product) => {
                  const expiryDate = product.expiryDate ? new Date(product.expiryDate) : null;
                  const currentDate = new Date();
                  const isExpired = expiryDate && expiryDate <= currentDate;
                  const isExpiringSoon = expiryDate && !isExpired && expiryDate <= new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                  const isOutOfStock = product.quantityInStock === 0;
                  const isLowStock = product.quantityInStock > 0 && product.quantityInStock <= 5;
                  
                  return (
                    <div key={product._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-gray-800 text-sm">{product.productName || product.name}</h3>
                        <div className="flex gap-1">
                          {isExpired && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                              Expired
                            </span>
                          )}
                          {isExpiringSoon && !isExpired && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                              Expiring Soon
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                              Out of Stock
                            </span>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-medium text-green-600">{formatCurrency(product.price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stock:</span>
                          <span className={`font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-gray-800'}`}>
                            {product.quantityInStock} units
                          </span>
                        </div>
                        {expiryDate && (
                          <div className="flex justify-between">
                            <span>Expires:</span>
                            <span className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-800'}`}>
                              {expiryDate.toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link
                          to={`/farmer/products/edit/${product._id}`}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Edit Product →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Farmer Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Quality Photos</h3>
              <p className="text-gray-600 text-sm">Upload high-quality photos to attract more customers</p>
            </div>
            
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Competitive Pricing</h3>
              <p className="text-gray-600 text-sm">Research market prices to stay competitive</p>
            </div>
            
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Fast Response</h3>
              <p className="text-gray-600 text-sm">Respond quickly to orders to improve ratings</p>
            </div>
          </div>
        </div>
      </div>

      {/* KYC Requirement Modal */}
      {showKycModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">KYC Approval Required</h3>
            <p className="text-gray-600 mb-4">
              You cannot list products until your KYC is approved.
              {kycStatus === 'rejected' && (
                <>
                  <br />
                  <span className="text-red-700">{kycRejectionReason ? `Rejection reason: ${kycRejectionReason}` : 'Your previous submission was rejected.'}</span>
                </>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowKycModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              {(kycStatus === '' || kycStatus === 'rejected') && (
                <button
                  onClick={() => navigate('/farmer/kyc')}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: '#51ac37' }}
                >
                  {kycStatus === '' ? 'Start KYC' : 'Resubmit KYC'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;