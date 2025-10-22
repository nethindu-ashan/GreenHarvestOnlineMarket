import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const FarmerSubscription = () => {
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    agreement: false
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  // Backend API base URL
  const API_BASE_URL = 'http://localhost:5002';

  // Farmer subscription plan - LKR 1,500/month (Demo Mode)
  const subscriptionPlan = {
    id: 'farmer_premium',
    name: 'Premium Farmer Subscription',
    monthlyPrice: 1500,
    description: 'Access to full marketplace features (Demo Mode)',
    features: [
      'Add unlimited products to marketplace',
      'Direct customer communication',
      'Order management dashboard',
      'Analytics and sales reports',
      'Priority customer support',
      'Payment processing (PayHere integration)',
      'Marketing tools and promotions'
    ]
  };

  useEffect(() => {
    const boot = async () => {
      const stored = localStorage.getItem('farmerUser');
      console.log('Stored farmer user:', stored);
      
      if (!stored) {
        navigate('/farmer/login');
        return;
      }
      const u = JSON.parse(stored);
      console.log('Parsed farmer user:', u);
      setFarmer(u);
      
      // Check for payment cancellation
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('error') === 'payment_cancelled') {
        setError('Payment was cancelled. Please try again to activate your subscription.');
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Pre-fill form with farmer data
      setFormData({
        name: u.name || '',
        email: u.email || '',
        phoneNumber: u.phone || '',
        address: u.farmLocation || '',
        agreement: false
      });
    };
    boot();
  }, [navigate]);

  // No SDK required for PayHere form-based redirect

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.phoneNumber.trim()) return 'Phone number is required';
    if (!formData.address.trim()) return 'Address is required';
    if (!formData.agreement) return 'You must agree to the terms and conditions';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Please enter a valid email address';
    
    return null;
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsProcessing(true);
    setError('');
    setPaymentStatus('Processing subscription...');

    try {
      // Add validation to ensure farmer has ID
      if (!farmer || (!farmer._id && !farmer.id)) {
        throw new Error('Farmer ID not found. Please log in again.');
      }

      const farmerId = farmer._id || farmer.id;
      console.log('Farmer object:', farmer);
      console.log('Using farmer ID:', farmerId);

      // Test API connectivity first
      console.log('Testing API connectivity...');
      try {
        const pingResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/`);
        console.log('API ping response status:', pingResponse.status);
      } catch (pingError) {
        console.error('API ping failed:', pingError);
        throw new Error('Cannot connect to payment service. Please check your connection.');
      }

      // SANDBOX: Request PayHere form fields from backend and redirect user to PayHere
      const customerData = {
        firstName: formData.name.split(' ')[0] || formData.name,
        lastName: formData.name.split(' ').slice(1).join(' ') || 'Farmer',
        email: formData.email.trim().toLowerCase(),
        phone: formData.phoneNumber,
        address: formData.address,
        city: 'Colombo',
        farmerId
      };

      console.log('Creating PayHere farmer subscription payment...');
      const resp = await api.post('/payments/farmer-subscription', {
        customerData,
        amount: subscriptionPlan.monthlyPrice,
        currency: 'LKR'
      });

      if (!resp.success || !resp.paymentData) {
        throw new Error(resp.error || 'Failed to prepare payment');
      }

      setPaymentStatus('Redirecting to PayHere checkout...');
      redirectToPayHereCheckout(resp.paymentData);
    } catch (error) {
      console.error('Subscription error details:', error);
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      if (error.message && error.message.includes('already has an active subscription')) {
        setError('You already have an active subscription. Please check your dashboard.');
        setPaymentStatus('Subscription already active');
      } else {
        // More detailed error handling
        let errorMessage = 'Failed to process subscription. Please try again.';
        
        if (error.status === 404) {
          errorMessage = 'Payment service not available. Please contact support.';
        } else if (error.status === 400) {
          errorMessage = error.message || 'Invalid subscription data. Please check your information.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message || errorMessage;
        }
        
        setError(`Subscription failed: ${errorMessage}`);
        setPaymentStatus('');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const redirectToPayHereCheckout = (paymentData) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentData.sandbox
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';

    Object.keys(paymentData).forEach(key => {
      if (paymentData[key] !== undefined && paymentData[key] !== null) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = paymentData[key];
        form.appendChild(input);
      }
    });

    document.body.appendChild(form);
    form.submit();
  };

  if (!farmer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Premium Farmer Subscription
          </h1>
          <p className="text-gray-600">
            Unlock full marketplace access and start selling your products
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subscription Plan */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {subscriptionPlan.name}
              </h2>
              <div className="text-4xl font-bold mb-2" style={{color: '#51ac37'}}>
                LKR {subscriptionPlan.monthlyPrice.toLocaleString()}
              </div>
              <p className="text-gray-600">per month</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">What you get:</h3>
              <ul className="space-y-2">
                {subscriptionPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs mr-3 mt-0.5" 
                         style={{backgroundColor: '#51ac37'}}>
                    </div>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Note:</strong> This subscription is required to add products to the marketplace. 
                You must also complete KYC verification to start selling.
              </p>
            </div>
          </div>

          {/* Subscription Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Subscribe Now
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {paymentStatus && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-600 text-sm">{paymentStatus}</p>
              </div>
            )}

            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0771234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Farm Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your farm address"
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreement"
                  checked={formData.agreement}
                  onChange={handleInputChange}
                  required
                  className="mt-1 mr-2"
                />
                <label className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-green-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-green-600 hover:underline">
                    Privacy Policy
                  </a>
                  . I understand this is a monthly recurring subscription.
                </label>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{backgroundColor: '#51ac37'}}
              >
                {isProcessing ? 'Processing...' : `Subscribe for LKR ${subscriptionPlan.monthlyPrice.toLocaleString()}/month`}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-500">
              <p>Secure payment powered by PayHere</p>
              <p>Cancel anytime from your dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerSubscription;