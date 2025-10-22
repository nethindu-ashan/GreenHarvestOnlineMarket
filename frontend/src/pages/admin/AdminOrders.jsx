import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ email: '', status: '', paymentStatus: '' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.adminListOrders({ ...filters, email: filters.email?.trim() || undefined });
      setOrders(res.orders || []);
    } catch (e) {
      setError(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedAdmin = localStorage.getItem('adminUser');
    if (!storedAdmin) {
      navigate('/admin/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Admin Orders</h1>
          <button onClick={load} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Refresh</button>
        </div>

        <div className="bg-white shadow rounded p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input value={filters.email} onChange={e=>setFilters(f=>({...f,email:e.target.value}))} placeholder="Filter by customer email" className="border rounded px-3 py-2" />
            <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} className="border rounded px-3 py-2">
              <option value="">Any status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="confirmed">Confirmed</option>
              <option value="ready">Ready</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={filters.paymentStatus} onChange={e=>setFilters(f=>({...f,paymentStatus:e.target.value}))} className="border rounded px-3 py-2">
              <option value="">Any payment</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="paid">Paid</option>
            </select>
            <button onClick={load} className="px-4 py-2 bg-gray-800 text-white rounded">Apply</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700">{error}</div>}
        {loading && <div className="text-gray-600">Loading orders…</div>}

        {!loading && !error && (
          <div className="bg-white shadow rounded overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Order ID</th>
                  <th className="text-left px-4 py-2">Customer</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Currency</th>
                  <th className="text-left px-4 py-2">Order Status</th>
                  <th className="text-left px-4 py-2">Payment</th>
                  <th className="text-left px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {(orders || []).map((o)=> (
                  <tr key={o.orderId} className="border-t">
                    <td className="px-4 py-2 font-mono">{o.orderId}</td>
                    <td className="px-4 py-2">{o.customerName || '—'}</td>
                    <td className="px-4 py-2">{o.customerEmail}</td>
                    <td className="px-4 py-2">{o.totalAmount?.toLocaleString?.() || o.totalAmount}</td>
                    <td className="px-4 py-2">{o.currency || 'LKR'}</td>
                    <td className="px-4 py-2 capitalize">{o.orderStatus}</td>
                    <td className="px-4 py-2 capitalize">{o.paymentStatus}</td>
                    <td className="px-4 py-2">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {(!orders || orders.length === 0) && (
                  <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={8}>No orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
