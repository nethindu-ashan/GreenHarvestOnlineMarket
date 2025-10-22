import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import formatCurrency from '../../utils/currency';

const AdminCancelledOrders = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingRefund, setProcessingRefund] = useState('');

  useEffect(() => {
    // Check admin authentication
    const storedAdmin = localStorage.getItem('adminUser');
    if (!storedAdmin) {
      navigate('/admin/login');
      return;
    }
    setAdminUser(JSON.parse(storedAdmin));
    loadCancelledOrders();
  }, [navigate]);

  const loadCancelledOrders = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading cancelled orders...');
      
      const response = await api.get('/payments/admin/cancelled-orders');
      console.log('Cancelled orders response:', response);
      
      if (response.success) {
        setCancelledOrders(response.cancelledOrders || []);
        console.log('Set cancelled orders:', response.cancelledOrders?.length || 0);
      } else {
        setError('Failed to load cancelled orders: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading cancelled orders:', error);
      setError('Failed to load cancelled orders: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Removed test orders creation (demo-only)

  const processRefund = async (orderId, totalAmount) => {
    if (!confirm(`Release refund for order ${orderId}?\nAmount: ${formatCurrency(totalAmount)}`)) {
      return;
    }

    try {
      setProcessingRefund(orderId);
      
      const response = await api.post('/payments/admin/process-refund', {
        orderId: orderId,
        adminUserId: adminUser.id,
        refundAmount: totalAmount
      });

      if (response.success) {
        alert(`Refund processed successfully\nOrder ID: ${orderId}\nRefunded Orders: ${response.refundedOrders}`);
        
        // Reload the cancelled orders to reflect the updated refund status
        await loadCancelledOrders();
      } else {
        throw new Error(response.error || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      alert('Failed to process refund: ' + error.message);
    } finally {
      setProcessingRefund('');
    }
  };

  const getRefundStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRefundStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Refunded';
      case 'requested': return 'Refund Requested';
      case 'processing': return 'Processing Refund';
      case 'failed': return 'Refund Failed';
      case 'not_requested': return 'No Refund';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading cancelled orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Cancelled Orders</h1>
            <p className="text-gray-600 mt-2">Manage refunds and cancelled order processing</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadCancelledOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Removed demo mode notice */}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Cancelled</h3>
            <p className="text-3xl font-bold text-red-600">{cancelledOrders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pending Refunds</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {cancelledOrders.filter(order => ['not_requested','requested'].includes(order.refundStatus)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Refunded</h3>
            <p className="text-3xl font-bold text-green-600">
              {cancelledOrders.filter(order => order.refundStatus === 'completed').length}
            </p>
          </div>
        </div>

        {/* Cancelled Orders List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Cancelled Orders</h2>
          </div>

          {cancelledOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-medium text-gray-600 mb-2">No Cancelled Orders</h3>
              <p className="text-gray-500">No orders have been cancelled yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Farmer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cancelled Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Refund Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cancelledOrders.map((order, index) => (
                    <tr key={`${order.orderId}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.orderId}</div>
                        <div className="text-xs text-gray-500">{order.productsCount} item(s)</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                        <div className="text-sm text-gray-500">{order.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.farmerName}</div>
                        <div className="text-sm text-gray-500">{order.farmerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <div className="text-xs text-gray-500">{order.currency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(order.cancelledAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.cancelledAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={order.cancellationReason}>
                          {order.cancellationReason}
                        </div>
                        {order.refundBank && (order.refundBank.accountNumber || order.refundBank.bankName) && (
                          <div className="text-xs text-gray-600 mt-2">
                            <div>Bank: {order.refundBank.bankName} {order.refundBank.branch ? `- ${order.refundBank.branch}` : ''}</div>
                            <div>Account: {order.refundBank.accountNumber} ({order.refundBank.accountName})</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRefundStatusColor(order.refundStatus)}`}>
                          {getRefundStatusText(order.refundStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(['not_requested','requested','failed'].includes(order.refundStatus)) && (
                          <button
                            onClick={() => processRefund(order.orderId, order.totalAmount)}
                            disabled={processingRefund === order.orderId}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                          >
                            {processingRefund === order.orderId ? 'Processing...' : 'Release Refund'}
                          </button>
                        )}
                        {order.refundStatus === 'completed' && (
                          <span className="text-green-600 text-xs font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCancelledOrders;