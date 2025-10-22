import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AdminKycRequests = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedAdmin = localStorage.getItem('adminUser');
    if (!storedAdmin) {
      navigate('/admin/login');
      return;
    }
    setAdminUser(JSON.parse(storedAdmin));
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.listPendingKycs();
        setRequests(data || []);
      } catch (e) {
        setError(e.message || 'Failed to load KYC requests');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const handleApprove = async (id) => {
    try {
      await api.approveKyc(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      setError(e.message || 'Approve failed');
    }
  };

  const handleDecline = async (id) => {
    const reason = prompt('Reason for KYC rejection (optional)') || '';
    try {
      await api.declineKyc(id, reason);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      setError(e.message || 'Decline failed');
    }
  };

  if (!adminUser) {
    return <div className="min-h-screen bg-gray-50 p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">GreenHarvest Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{adminUser.name}</span>
              </div>
              <Link to="/admin/dashboard" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Farmer KYC Requests</h2>
          <p className="text-gray-600">Review and approve or decline pending farmer KYC submissions</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-600">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-gray-600">No pending KYC requests</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Details</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{r.name || r.farmName || '—'}</div>
                        <div className="text-sm text-gray-500">{r.email}</div>
                        {r.submittedAt && (
                          <div className="text-xs text-gray-400">Submitted: {new Date(r.submittedAt).toLocaleString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          {r.nicFrontUrl ? (
                            <a href={r.nicFrontUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">NIC Front</a>
                          ) : (
                            <span className="text-sm text-gray-400">No front image</span>
                          )}
                          {r.nicBackUrl ? (
                            <a href={r.nicBackUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">NIC Back</a>
                          ) : (
                            <span className="text-sm text-gray-400">No back image</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          <div><span className="text-gray-500">Account Name:</span> {r.bank?.accountName || '—'}</div>
                          <div><span className="text-gray-500">Account Number:</span> {r.bank?.accountNumber || '—'}</div>
                          <div><span className="text-gray-500">Bank:</span> {r.bank?.bankName || '—'}</div>
                          <div><span className="text-gray-500">Branch:</span> {r.bank?.branch || '—'}</div>
                          <div><span className="text-gray-500">SWIFT:</span> {r.bank?.swiftCode || '—'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button onClick={() => handleApprove(r.id)} className="inline-flex items-center px-3 py-1.5 mr-2 rounded bg-green-600 text-white text-sm hover:bg-green-700">Approve</button>
                        <button onClick={() => handleDecline(r.id)} className="inline-flex items-center px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700">Decline</button>
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

export default AdminKycRequests;
