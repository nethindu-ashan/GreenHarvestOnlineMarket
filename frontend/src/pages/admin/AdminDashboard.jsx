import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import AdminReports from '../../components/AdminReports';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  // Removed Pending Farmers pane per request
  const [pendingKycsCount, setPendingKycsCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // Check if admin is logged in
    const storedAdmin = localStorage.getItem('adminUser');
    if (!storedAdmin) {
      navigate('/admin/login');
      return;
    }
    setAdminUser(JSON.parse(storedAdmin));
    // Load pending KYC count only
    const loadPendingKycs = async () => {
      try {
        const data = await api.listPendingKycs();
        setPendingKycsCount(Array.isArray(data) ? data.length : 0);
      } catch (e) {
        console.warn('Failed loading pending KYC:', e.message);
        setPendingKycsCount(0);
      }
    };
    const loadStats = async () => {
      try {
        const s = await api.getAdminDashboardStats();
        setStats(s);
      } catch (e) {
        console.warn('Failed loading stats:', e.message);
      }
    };

    const loadHealth = async () => {
      try {
        const h = await api.getSystemHealth();
        setHealth(h?.systemHealth || null);
      } catch (e) {
        console.warn('Failed loading system health:', e.message);
      }
    };

    if (storedAdmin) {
      loadPendingKycs();
      loadStats();
      loadHealth();
    }
  }, [navigate]);

  // No inline KYC actions on dashboard per UX request

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const totals = {
    users: stats?.users?.total ?? 0,
    newUsersToday: stats?.users?.newToday ?? 0,
    orders: stats?.orders?.total ?? 0,
    ordersToday: stats?.orders?.today ?? 0,
    products: stats?.products?.total ?? 0,
    outOfStock: stats?.products?.outOfStock ?? 0,
    revenue: stats?.revenue?.total ?? 0,
  };

  if (!adminUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">GreenHarvest Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{adminUser.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h2>
          <p className="text-gray-600">Manage your GreenHarvest platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{backgroundColor: '#51ac37'}}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{totals.users.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-green-600">+{totals.newUsersToday} today</div>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">{totals.orders.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-green-600">+{totals.ordersToday} today</div>
            </div>
          </div>

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
                  <dd className="text-lg font-medium text-gray-900">{totals.products}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-red-600">{totals.outOfStock} out of stock</div>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">${totals.revenue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-green-600">↗ 12% vs last month</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/users"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-800">Manage Users</div>
                <div className="text-sm text-gray-600">View and manage user accounts</div>
              </div>
            </Link>

            <Link
              to="/admin/orders"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3v-8a1 1 0 011-1h4a1 1 0 011 1v8h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-800">Manage Orders</div>
                <div className="text-sm text-gray-600">Process and track orders</div>
              </div>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Link to="/admin/kyc-requests" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 01.894.553l1.618 3.236 3.572.519a1 1 0 01.554 1.706l-2.585 2.52.61 3.558a1 1 0 01-1.451 1.054L10 13.347l-3.212 1.688a1 1 0 01-1.451-1.054l.61-3.559L3.362 8.014a1 1 0 01.554-1.706l3.572-.519L9.106 2.553A1 1 0 0110 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-800">Pending KYC</div>
                <div className="text-sm text-gray-600">{pendingKycsCount} awaiting review</div>
              </div>
            </Link>
            
            <Link to="/admin/cancelled-orders" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-800">Cancelled Orders</div>
                <div className="text-sm text-gray-600">Manage refunds</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Reports Section */}
        <AdminReports />

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {[
                { id: '#12345', customer: 'John Doe', amount: '$45.99', status: 'Processing' },
                { id: '#12344', customer: 'Jane Smith', amount: '$32.50', status: 'Shipped' },
                { id: '#12343', customer: 'Bob Wilson', amount: '$78.25', status: 'Delivered' },
                { id: '#12342', customer: 'Alice Brown', amount: '$21.99', status: 'Processing' }
              ].map((order, index) => (
                <div key={index} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-800">{order.id}</div>
                      <div className="text-sm text-gray-600">{order.customer}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-800">{order.amount}</div>
                      <div className={`text-sm px-2 py-1 rounded-full text-xs ${
                        order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">System Status</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Server Status</span>
                  <span className={`flex items-center ${health ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${health ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {health ? 'Online' : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Products</span>
                  <span className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    {totals.products} total, {totals.outOfStock} out of stock
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Orders</span>
                  <span className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    {totals.orders} total, {totals.ordersToday} today
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Revenue</span>
                  <span className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    ${totals.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;