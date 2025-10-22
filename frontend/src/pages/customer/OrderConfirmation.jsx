import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.order);
      } catch (e) {
        setError('Unable to load order');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  const totals = useMemo(() => {
    if (!order) return { subtotal: 0, tax: 0, shipping: 0, total: 0 };
    const subtotal = (order.orderedItems || []).reduce((s, it) => s + (it.price * it.quantity), 0);
    const tax = 0;
    const shipping = 0;
    return { subtotal, tax, shipping, total: subtotal + tax + shipping };
  }, [order]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl" style={{backgroundColor: '#51ac37'}}>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Details</h1>
          <p className="text-lg text-gray-600">View your order information and status.</p>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">Loading order…</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">{error}</div>
        )}
        {!loading && order && (
          <>
        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200" style={{backgroundColor: '#f8f9fa'}}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Order Number</h3>
                <p className="text-lg font-semibold text-gray-800">#{order.orderId}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Order Date</h3>
                <p className="text-lg font-semibold text-gray-800">{new Date(order.date).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Status</h3>
                <p className="text-lg font-semibold" style={{color: '#51ac37'}}>{order.status}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Items</h2>
            <div className="space-y-4">
              {(order.orderedItems || []).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">${(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">${(item.price ?? 0).toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{totals.shipping === 0 ? 'Free' : `$${totals.shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span style={{color: '#51ac37'}}>${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
    </div>

        {/* Shipping and Payment Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Delivery Address</h2>
            <div className="text-gray-600">
              <p className="font-medium text-gray-800">{order.name}</p>
              <p>{order.address}</p>
              <p className="mt-2">{order.phone}</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Method</h2>
            <div className="text-gray-600">
              <p className="font-medium text-gray-800">{order.paymentDone ? 'Payment Completed' : 'Payment Pending'}</p>
            </div>
          </div>
    </div>

    {/* Next Steps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What's Next?</h2>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-start">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Order Confirmation</p>
                <p className="text-sm">You'll receive an email confirmation shortly with your order details.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Order Preparation</p>
                <p className="text-sm">Our farmers will carefully select and pack your fresh produce.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
                <span className="text-gray-600 text-sm font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Out for Delivery</p>
                <p className="text-sm">You'll receive tracking information once your order ships.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
                <span className="text-gray-600 text-sm font-bold">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Delivered</p>
                <p className="text-sm">Enjoy your fresh produce!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/orders" className="px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity text-center" style={{backgroundColor: '#51ac37'}}>
            Back to My Orders
          </Link>
          <Link
            to="/"
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Continue Shopping
          </Link>
        </div>
        <div className="text-center mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600">Need help? Contact support@greenharvest.com</p>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmation;