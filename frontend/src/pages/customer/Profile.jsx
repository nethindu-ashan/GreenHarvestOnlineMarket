import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    notifications: {
      email: true,
      sms: false,
      orderUpdates: true,
      promotions: true
    }
  });
  // Keep a separate display name for greeting so it updates only after save
  const [displayFirstName, setDisplayFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.getCurrentUser();
        const u = res?.user || res; // handle both shapes
        if (!u || !u.email) throw new Error('Not logged in');
        const stored = (() => { try { return JSON.parse(localStorage.getItem('customerUser')); } catch { return null; } })();
        setFormData(prev => ({
          ...prev,
          firstName: u.firstName ?? stored?.firstName ?? '',
          lastName: u.lastName ?? stored?.lastName ?? '',
          email: u.email ?? stored?.email ?? '',
          phone: u.phone ?? stored?.phone ?? '',
          address: u.address ?? stored?.address ?? '',
          city: u.city ?? stored?.city ?? '',
          state: u.state ?? stored?.state ?? '',
          zipCode: u.zipCode ?? stored?.zipCode ?? '',
          dateOfBirth: (u.dateOfBirth || stored?.dateOfBirth) ? new Date(u.dateOfBirth || stored?.dateOfBirth).toISOString().slice(0,10) : '',
        }));
        setDisplayFirstName(u.firstName || '');
      } catch (e) {
        setError('Please login to view your profile.');
        navigate('/login?redirect=/profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    
    if (e.target.name.startsWith('notifications.')) {
      const notificationKey = e.target.name.split('.')[1];
      setFormData({
        ...formData,
        notifications: {
          ...formData.notifications,
          [notificationKey]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
      };
      const res = await api.updateProfile(payload);
      setSuccess('Profile updated successfully');
      // keep local storage in sync for header greeting if needed
      const user = res?.user;
      if (user) {
        localStorage.setItem('customerUser', JSON.stringify(user));
        setDisplayFirstName(user.firstName || '');
        window.dispatchEvent(new Event('user:updated'));
      }
    } catch (e) {
      setError(e.message || 'Failed to update profile');
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    try {
      await api.deleteAccount();
      localStorage.removeItem('customerUser');
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('user:updated'));
      navigate('/');
    } catch (e) {
      setError('Failed to delete account: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Hello{displayFirstName ? `, ${displayFirstName}` : ''} 👋</h1>
            <p className="text-gray-600">Manage your account and preferences</p>
          </div>
          <div className="space-x-2">
            <Link to="/products" className="px-4 py-2 rounded-lg text-white" style={{background:'#51ac37'}}>Go to Market</Link>
            <Link to="/orders" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">My Orders</Link>
          </div>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'personal', label: 'Personal Information' },
                { id: 'address', label: 'Address' },
                { id: 'preferences', label: 'Preferences' },
                { id: 'security', label: 'Security' },
                { id: 'reports', label: 'Reports' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Personal Information Tab */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Address Tab */}
              {activeTab === 'address' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Address Information</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">Email Notifications</h3>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="notifications.email"
                          checked={formData.notifications.email}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">SMS Notifications</h3>
                        <p className="text-sm text-gray-600">Receive notifications via text message</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="notifications.sms"
                          checked={formData.notifications.sms}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">Order Updates</h3>
                        <p className="text-sm text-gray-600">Get notified about order status changes</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="notifications.orderUpdates"
                          checked={formData.notifications.orderUpdates}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">Promotional Offers</h3>
                        <p className="text-sm text-gray-600">Receive deals and special offers</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="notifications.promotions"
                          checked={formData.notifications.promotions}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Reports Tab */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Purchased Products Report</h2>
                  <p className="text-gray-600 mb-6">Generate and download a summary of products you've purchased</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-green-100 rounded-lg mr-3">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-800">Purchased Products</h3>
                          <p className="text-sm text-gray-600">Aggregated quantities and totals for products you've bought</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Report Period</label>
                          <select 
                            id="reportPeriod"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                            <option value="3months">Last 3 Months</option>
                            <option value="6months">Last 6 Months</option>
                            <option value="year">Last Year</option>
                          </select>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const period = document.getElementById('reportPeriod').value;
                          const token = localStorage.getItem('token');
                          if (!token) {
                            alert('Please login to download reports');
                            return;
                          }
                          
                          // Create a temporary link to download the PDF
                          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
                          const link = document.createElement('a');
                          link.href = `${apiBaseUrl}/reports/customer/purchased-products?period=${period}`;
                          link.setAttribute('download', '');
                          fetch(link.href, {
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          })
                          .then(async response => {
                            if (!response.ok) {
                              const text = await response.text();
                              throw new Error(`HTTP ${response.status} - ${text}`);
                            }
                            const contentType = response.headers.get('Content-Type') || '';
                            if (!contentType.includes('pdf')) {
                              const text = await response.text();
                              throw new Error(`Unexpected content type: ${contentType}. Body: ${text}`);
                            }
                            return response.blob();
                          })
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = `purchased-products-${new Date().toISOString().split('T')[0]}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                          })
                          .catch(error => {
                            console.error('Error downloading report:', error);
                            alert('Failed to download report. Please try again.');
                          });
                        }}
                        className="w-full px-4 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                        style={{backgroundColor: '#51ac37'}}
                      >
                        <div className="flex items-center justify-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Generate & Download PDF
                        </div>
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-800">Custom Date Range</h3>
                          <p className="text-sm text-gray-600">Select specific date range for report</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                          <input
                            type="date"
                            id="customStartDate"
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                              const endDateInput = document.getElementById('customEndDate');
                              endDateInput.min = e.target.value;
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                          <input
                            type="date"
                            id="customEndDate"
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const startDate = document.getElementById('customStartDate').value;
                          const endDate = document.getElementById('customEndDate').value;
                          const token = localStorage.getItem('token');
                          
                          if (!startDate || !endDate) {
                            alert('Please select both start and end dates');
                            return;
                          }
                          
                          // Validate dates
                          const start = new Date(startDate);
                          const end = new Date(endDate);
                          const today = new Date();
                          today.setHours(23, 59, 59, 999); // Set to end of today
                          
                          if (start > today) {
                            alert('Start date cannot be in the future');
                            return;
                          }
                          
                          if (end > today) {
                            alert('End date cannot be in the future');
                            return;
                          }
                          
                          if (start > end) {
                            alert('Start date must be before or equal to end date');
                            return;
                          }
                          
                          if (!token) {
                            alert('Please login to download reports');
                            return;
                          }
                          
                          // Create a temporary link to download the PDF
                          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
                          fetch(`${apiBaseUrl}/reports/customer/purchased-products?startDate=${startDate}&endDate=${endDate}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          })
                          .then(async response => {
                            if (!response.ok) {
                              const text = await response.text();
                              throw new Error(`HTTP ${response.status} - ${text}`);
                            }
                            const contentType = response.headers.get('Content-Type') || '';
                            if (!contentType.includes('pdf')) {
                              const text = await response.text();
                              throw new Error(`Unexpected content type: ${contentType}. Body: ${text}`);
                            }
                            return response.blob();
                          })
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = `purchased-products-${startDate}-to-${endDate}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                          })
                          .catch(error => {
                            console.error('Error downloading report:', error);
                            alert('Failed to download report. Please try again.');
                          });
                        }}
                        className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Generate Custom Report
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">About Purchased Products Report</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>This report includes:</p>
                          <ul className="mt-1 list-disc list-inside">
                            <li>Products you've purchased in the selected period</li>
                            <li>Total quantity and total spent per product</li>
                            <li>Average unit price</li>
                            <li>Overall totals and quick stats</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Security Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Change Password</h3>
                      <p className="text-sm text-gray-600 mb-4">Update your password to keep your account secure</p>
                      <button
                        type="button"
                        onClick={() => {
                          const emailParam = encodeURIComponent(formData.email || '');
                          window.location.href = `/reset-password?email=${emailParam}`;
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Change Password
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-600 mb-4">Add an extra layer of security to your account</p>
                      <button
                        type="button"
                        className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                        style={{backgroundColor: '#51ac37'}}
                      >
                        Enable 2FA
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Login Activity</h3>
                      <p className="text-sm text-gray-600 mb-4">View recent login activity on your account</p>
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        View Activity
                      </button>
                    </div>

                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <h3 className="text-lg font-medium text-red-800 mb-2">Delete Account</h3>
                      <p className="text-sm text-red-600 mb-4">Permanently delete your account and all associated data</p>
                      <button type="button" onClick={onDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              {activeTab !== 'security' && activeTab !== 'reports' && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{backgroundColor: '#51ac37'}}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;