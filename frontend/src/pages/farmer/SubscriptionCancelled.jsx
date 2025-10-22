import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubscriptionCancelled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {/* Cancelled Header */}
          <div className="mb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-2xl mb-4">
              !
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Subscription Cancelled</h1>
            <p className="text-gray-600">Your subscription payment was cancelled. No charges were made.</p>
          </div>

          {/* Information */}
          <div className="bg-orange-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-orange-800 mb-3">What Happened?</h2>
            <p className="text-sm text-orange-700">
              You cancelled the payment process before completing your subscription. 
              Your account remains unchanged and no charges were applied.
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-3">What You Can Do</h2>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                <p>Try subscribing again when you're ready</p>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                <p>Contact support if you encountered any issues</p>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                <p>Return to your dashboard to manage your account</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/farmer/subscription')}
              className="flex-1 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              style={{backgroundColor: '#51ac37'}}
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/farmer/dashboard')}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </button>
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

export default SubscriptionCancelled;