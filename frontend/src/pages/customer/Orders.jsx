import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import formatCurrency from '../../utils/currency';

const Orders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOrder, setEditOrder] = useState(null);
  const [editData, setEditData] = useState({ name: '', address: '', phone: '', notes: '' });

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const res = await api.getOrders();
        const list = res?.list || [];
        const mapped = list.map(o => ({
          id: o.orderId,
          date: o.date,
          status: o.status,
          items: (o.orderedItems || []).map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
          name: o.name,
          address: o.address,
          phone: o.phone,
          notes: o.notes || '',
          paymentDone: !!o.paymentDone,
          totalAmount: o.totalAmount || 0,
          paymentStatus: o.paymentStatus || 'unknown'
        }));
        setOrders(mapped);
      } catch (e) {
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const totals = useMemo(() => orders.map(o => {
    // Use totalAmount if available (from CartOrder), otherwise calculate from items
    return o.totalAmount || o.items.reduce((s, it) => s + it.price * it.quantity, 0);
  }), [orders]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'delivered': return 'Delivered';
      case 'shipped': return 'Shipped';
      case 'in_transit': return 'In Transit';
      case 'ready': return 'Ready for Pickup/Delivery';
      case 'processing': return 'Processing';
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const getPaymentStatusColor = (paymentStatus) => {
    switch (paymentStatus) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (paymentStatus) => {
    switch (paymentStatus) {
      case 'completed': return 'Paid';
      case 'pending': return 'Payment Pending';
      case 'failed': return 'Payment Failed';
      case 'cancelled': return 'Payment Cancelled';
      default: return 'Unknown Payment Status';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const startEdit = (order) => {
    setEditOrder(order);
    setEditData({ name: order.name || '', address: order.address || '', phone: order.phone || '', notes: order.notes || '' });
  };

  const submitEdit = async () => {
    if (!editOrder) return;
    try {
      await api.put(`/orders/${editOrder.id}/customer`, editData);
      setOrders(prev => prev.map(o => o.id === editOrder.id ? { ...o, ...editData } : o));
      setEditOrder(null);
    } catch {
      alert('Failed to update order');
    }
  };

  const goToCancel = (id) => {
    navigate(`/order/${id}/cancel`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Orders</h1>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'all', label: 'All Orders', count: orders.length },
                { id: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
                { id: 'confirmed', label: 'Confirmed', count: orders.filter(o => o.status === 'confirmed').length },
                { id: 'processing', label: 'Processing', count: orders.filter(o => o.status === 'processing').length },
                { id: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
                { id: 'shipped', label: 'Shipped', count: orders.filter(o => o.status === 'shipped').length },
                { id: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length },
                { id: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Orders List */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">Loading orders…</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">{error}</div>
        )}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No orders found</h2>
            <p className="text-gray-600 mb-6">You haven't placed any orders in this category yet.</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              style={{backgroundColor: '#51ac37'}}
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order, idx) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Order Header */}
                <div className="p-6 border-b border-gray-200" style={{backgroundColor: '#f8f9fa'}}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 lg:mb-0">
                      <div>
                        <h3 className="text-sm font-medium text-gray-600">Order Number</h3>
                        <p className="text-lg font-semibold text-gray-800">#{order.id}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-600">Order Date</h3>
                        <p className="text-lg font-semibold text-gray-800">{new Date(order.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-600">Total</h3>
                        <p className="text-lg font-semibold" style={{color: '#51ac37'}}>{formatCurrency(totals[idx] || 0)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {getPaymentStatusText(order.paymentStatus)}
                      </span>
                      
                      <div className="flex space-x-2">
                        <Link
                          to={`/order/${order.id}`}
                          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              if (!token) { alert('Please login to download invoice'); return; }
                              const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
                              const url = `${apiBaseUrl}/reports/invoice/${encodeURIComponent(order.id)}`;
                              const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                              if (!res.ok) { const text = await res.text(); throw new Error(`HTTP ${res.status} - ${text}`); }
                              const ct = res.headers.get('Content-Type') || '';
                              if (!ct.includes('pdf')) { const text = await res.text(); throw new Error(`Unexpected content type: ${ct}. Body: ${text}`); }
                              const blob = await res.blob();
                              const objectUrl = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.style.display = 'none';
                              a.href = objectUrl;
                              a.download = `invoice-${order.id}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(objectUrl);
                            } catch (e) {
                              console.error('Invoice download failed:', e);
                              alert('Failed to download invoice. Please try again.');
                            }
                          }}
                          className="px-4 py-2 border border-green-600 text-green-600 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors"
                        >
                          Download Invoice
                        </button>
                        
                        {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'processing') && (
                          <>
                            <button onClick={() => startEdit(order)} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                              Modify Order
                            </button>
                            <button onClick={() => goToCancel(order.id)} className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">
                              Cancel Order
                            </button>
                          </>
                        )}
                        
                        {order.status === 'ready' && (
                          <div className="text-sm text-purple-600 font-medium">
                            Order is ready - Cannot be cancelled
                          </div>
                        )}
                        
                        {(order.status === 'shipped' || order.status === 'in_transit') && (
                          <button onClick={() => goToCancel(order.id)} className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">
                            Request Cancellation
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Items Ordered</h4>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              <span className="font-medium text-gray-800">{item.name}</span>
                              <span className="text-gray-600 ml-2">x{item.quantity}</span>
                            </div>
                            <span className="font-medium text-gray-800">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Order Status</h4>
                      <div className="space-y-3">
                        {order.status === 'delivered' && (
                          <div>
                            <p className="text-sm text-gray-600">Delivered on</p>
                            <p className="font-medium text-gray-800">{new Date(order.deliveredDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        
                        {(order.status === 'in_transit' || order.status === 'processing') && (
                          <div>
                            <p className="text-sm text-gray-600">Estimated Delivery</p>
                            <p className="font-medium text-gray-800">{new Date(order.estimatedDelivery).toLocaleDateString()}</p>
                          </div>
                        )}
                        
                        {order.status === 'cancelled' && (
                          <div>
                            <p className="text-sm text-gray-600">Cancelled on</p>
                            <p className="font-medium text-gray-800">{new Date(order.cancelledDate).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-600 mt-2">Reason: {order.cancelReason}</p>
                          </div>
                        )}
                        
                        {order.trackingNumber && (
                          <div>
                            <p className="text-sm text-gray-600">Tracking Number</p>
                            <p className="font-medium text-gray-800">{order.trackingNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* No footer actions; handled in header buttons for processing */}
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Need Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Email Support</h3>
              <p className="text-gray-600">support@greenharvest.com</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Phone Support</h3>
              <p className="text-gray-600">(123) 456-7890</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#51ac37'}}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">FAQ</h3>
              <Link to="/faq" className="text-gray-600 hover:underline">
                View common questions
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Edit Modal */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Order #{editOrder.id}</h3>
            <div className="space-y-3">
              <input value={editData.name} onChange={e=>setEditData(d=>({...d,name:e.target.value}))} placeholder="Name" className="w-full px-3 py-2 border rounded" />
              <input value={editData.address} onChange={e=>setEditData(d=>({...d,address:e.target.value}))} placeholder="Address" className="w-full px-3 py-2 border rounded" />
              <input value={editData.phone} onChange={e=>setEditData(d=>({...d,phone:e.target.value}))} placeholder="Phone" className="w-full px-3 py-2 border rounded" />
              <textarea value={editData.notes} onChange={e=>setEditData(d=>({...d,notes:e.target.value}))} placeholder="Notes" className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setEditOrder(null)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={submitEdit} className="px-4 py-2 text-white rounded" style={{backgroundColor:'#51ac37'}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;