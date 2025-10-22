import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');
  const [downloading, setDownloading] = useState(false);

  const downloadInvoice = async () => {
    if (!orderId) return;
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to download invoice');
        return;
      }
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
      const url = `${apiBaseUrl}/reports/invoice/${encodeURIComponent(orderId)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} - ${text}`);
      }
      const ct = res.headers.get('Content-Type') || '';
      if (!ct.includes('pdf')) {
        const text = await res.text();
        throw new Error(`Unexpected content type: ${ct}. Body: ${text}`);
      }
      const blob = await res.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = urlBlob;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlBlob);
    } catch (e) {
      console.error('Invoice download failed:', e);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    // Clear cart after successful payment
    window.dispatchEvent(new Event('cart:updated'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-4" 
                 style={{backgroundColor: '#51ac37'}}>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">Your order has been confirmed and will be processed shortly.</p>
          </div>

          {/* Order Details */}
          {orderId && (
            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-green-800 mb-4">Order Confirmation</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Order ID:</span>
                  <span className="text-green-800 font-medium">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Payment Method:</span>
                  <span className="text-green-800 font-medium">PayHere</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Status:</span>
                  <span className="text-green-800 font-medium">Confirmed</span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-4">What's Next?</h2>
            <div className="space-y-3 text-sm text-blue-700">
              <div className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-3 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Order Processing</p>
                  <p>Your order is being prepared by our farmers and will be packed for delivery.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-3 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Delivery Preparation</p>
                  <p>We'll notify you when your order is ready for delivery.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-3 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Order Delivery</p>
                  <p>Your fresh products will be delivered to your specified address.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/orders"
              className="flex-1 py-3 text-center text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              style={{backgroundColor: '#51ac37'}}
            >
              Go to My Orders
            </Link>
            {orderId && (
              <button
                onClick={downloadInvoice}
                disabled={downloading}
                className="flex-1 py-3 text-center border border-green-600 text-green-600 font-medium rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                {downloading ? 'Downloading…' : 'Download Invoice (PDF)'}
              </button>
            )}
            <Link
              to="/products"
              className="flex-1 py-3 text-center border border-green-600 text-green-600 font-medium rounded-lg hover:bg-green-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>

          {/* Contact Support */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Questions about your order? Contact us at{' '}
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

export default PaymentSuccess;