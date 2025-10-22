import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function CancelOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    reason: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    branch: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.reason.trim()) { setError('Please provide a reason'); return; }
    if (!form.accountName || !form.accountNumber || !form.bankName) {
      setError('Please provide bank account name, number and bank name');
      return;
    }
    try {
      setSubmitting(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        reason: form.reason.trim(),
        userId: user.id,
        bank: {
          accountName: form.accountName,
          accountNumber: form.accountNumber,
          bankName: form.bankName,
          branch: form.branch,
          notes: form.notes
        }
      };
      const res = await api.post(`/payments/cancel-order`, { orderId, ...payload });
      if (!res?.success) throw new Error(res?.error || 'Cancellation failed');
      alert('Order cancelled. Refund request submitted.');
      navigate('/orders');
    } catch (e) {
      setError(e.message || 'Failed to submit cancellation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white shadow rounded p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Cancel Order #{orderId}</h1>
        <p className="text-gray-600 mb-6">Please tell us why you’re cancelling and provide your bank details for the refund.</p>
        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea name="reason" value={form.reason} onChange={onChange} rows={3} className="w-full border rounded px-3 py-2" placeholder="e.g., Ordered by mistake" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
              <input name="accountName" value={form.accountName} onChange={onChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input name="accountNumber" value={form.accountNumber} onChange={onChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input name="bankName" value={form.bankName} onChange={onChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <input name="branch" value={form.branch} onChange={onChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input name="notes" value={form.notes} onChange={onChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex gap-3 pt-2">
            <button disabled={submitting} type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit Cancellation'}</button>
            <button type="button" onClick={() => navigate('/orders')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">Back</button>
          </div>
        </form>
      </div>
    </div>
  );
}
