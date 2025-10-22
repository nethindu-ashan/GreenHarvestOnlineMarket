import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!orderId) {
        setError('No order ID found');
        setLoading(false);
        return;
      }

      try {
        // Check if farmer is logged in
        const farmerData = localStorage.getItem('farmerUser');
        if (!farmerData) {
          navigate('/farmer/login');
          return;
        }

        const farmer = JSON.parse(farmerData);
        
        // Get updated farmer info
        const response = await api.getCurrentUser();
        if (response?.user) {
          const updatedFarmer = { ...response.user, type: 'farmer' };
          localStorage.setItem('farmerUser', JSON.stringify(updatedFarmer));
          
          setSubscriptionInfo({
            name: updatedFarmer.name,
            email: updatedFarmer.email,
            subscriptionPaid: updatedFarmer.subscriptionPaid,
            farmerStatus: updatedFarmer.farmerStatus,
            kycStatus: updatedFarmer.kycStatus
          });
        } else {
          setSubscriptionInfo({
            name: farmer.name,
            email: farmer.email,
            subscriptionPaid: true,
            farmerStatus: 'pending_review',
            kycStatus: farmer.kycStatus || ''
          });
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setError('Failed to verify subscription status');
      } finally {
        setLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying your subscription...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl mb-4">
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/farmer/dashboard')}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{backgroundColor: '#51ac37'}}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
      <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-4" 
        style={{backgroundColor: '#51ac37'}}>
      </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Subscription Successful!</h1>
            <p className="text-gray-600">Your premium farmer subscription has been activated.</p>
          </div>

          {/* Subscription Details */}
          {subscriptionInfo && (
            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-green-800 mb-4">Subscription Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Name:</span>
                  <span className="text-green-800 font-medium">{subscriptionInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Email:</span>
                  <span className="text-green-800 font-medium">{subscriptionInfo.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Order ID:</span>
                  <span className="text-green-800 font-medium">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Amount:</span>
                  <span className="text-green-800 font-medium">LKR 2,500.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Status:</span>
                  <span className="text-green-800 font-medium">Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-4">What's Next?</h2>
            <div className="space-y-3 text-sm text-blue-700">
              {subscriptionInfo?.kycStatus === 'approved' ? (
                <div className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs mr-3 mt-0.5">
                  </div>
                  <div>
                    <p className="font-medium">You're all set!</p>
                    <p>Your KYC is approved and subscription is active. You can now add products to the marketplace.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs mr-3 mt-0.5">
                      !
                    </div>
                    <div>
                      <p className="font-medium">Complete KYC Verification</p>
                      <p>You need to complete KYC verification to start adding products to the marketplace.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs mr-3 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Wait for Approval</p>
                      <p>After KYC submission, we'll review your documents (usually takes 1-2 business days).</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs mr-3 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Start Selling</p>
                      <p>Once approved, you can add unlimited products and start selling on the marketplace.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/farmer/dashboard')}
              className="flex-1 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              style={{backgroundColor: '#51ac37'}}
            >
              Go to Dashboard
            </button>
            {subscriptionInfo?.kycStatus !== 'approved' && (
              <button
                onClick={() => navigate('/farmer/kyc')}
                className="flex-1 py-3 border border-green-600 text-green-600 font-medium rounded-lg hover:bg-green-50 transition-colors"
              >
                Complete KYC
              </button>
            )}
          </div>

          {/* Contact Support */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Need help? Contact our support team at{' '}
              <a href="mailto:support@greenharvest.lk" className="text-green-600 hover:underline">
                support@greenharvest.lk
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;