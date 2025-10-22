import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const FarmerKyc = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Image URLs (either uploaded via Cloudinary or manually entered):
  const [nicFrontUrl, setNicFrontUrl] = useState('');
  const [nicBackUrl, setNicBackUrl] = useState('');

  // Bank details
  const [bank, setBank] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    branch: '',
    swiftCode: ''
  });

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; // unsigned preset recommended

  useEffect(() => {
    const stored = localStorage.getItem('farmerUser');
    if (!stored) {
      navigate('/farmer/login');
      return;
    }
    const u = JSON.parse(stored);
    if (u?.type !== 'farmer') {
      navigate('/farmer/login');
      return;
    }
    setUser(u);
    // If already pending or approved, prevent access
    if (u.kycStatus === 'pending' || u.kycStatus === 'approved') {
      navigate('/farmer/dashboard');
    }
  }, [navigate]);

  const handleUpload = async (file, setUrl) => {
    setError('');
    if (!file) return;
    if (!cloudName || !uploadPreset) {
      setError('Image upload is not configured. Please provide image URL manually or configure Cloudinary env vars.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Upload failed');
      }
      const data = await res.json();
      setUrl(data.secure_url || data.url);
    } catch (e) {
      setError('Upload failed: ' + e.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!nicFrontUrl || !nicBackUrl) {
      setError('Please provide both NIC front and back image URLs.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitKyc({ nicFrontUrl, nicBackUrl, bank });
      // Refresh current user to get latest kycStatus
      const refreshed = await api.getCurrentUser();
      if (refreshed?.user) {
        const updated = { ...refreshed.user, type: 'farmer' };
        localStorage.setItem('farmerUser', JSON.stringify(updated));
        localStorage.setItem('token', refreshed.token || localStorage.getItem('token'));
        window.dispatchEvent(new Event('user:updated'));
      }
      setSuccess('KYC submitted successfully. You will be notified once reviewed.');
      setTimeout(() => navigate('/farmer/dashboard'), 800);
    } catch (e) {
      setError(e.message || 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Farmer KYC Verification</h1>
          <p className="text-gray-600 mt-2">Provide your NIC images and bank details for payouts.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">NIC Images</h2>
              {!!cloudName && !!uploadPreset ? (
                <p className="text-sm text-gray-600 mb-4">Upload your NIC images. Only JPG/PNG recommended.</p>
              ) : (
                <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                  Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to enable uploads, or paste image URLs manually below.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIC Front Image</label>
                  <div className="flex items-center space-x-2">
                    <input type="text" value={nicFrontUrl} onChange={e => setNicFrontUrl(e.target.value)} placeholder="https://..." className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300" />
                  </div>
                  {cloudName && uploadPreset && (
                    <div className="mt-2">
                      <input type="file" accept="image/*" onChange={e => handleUpload(e.target.files?.[0], setNicFrontUrl)} />
                    </div>
                  )}
                  {nicFrontUrl && (
                    <img src={nicFrontUrl} alt="NIC Front" className="mt-2 h-28 object-cover rounded border" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIC Back Image</label>
                  <div className="flex items-center space-x-2">
                    <input type="text" value={nicBackUrl} onChange={e => setNicBackUrl(e.target.value)} placeholder="https://..." className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300" />
                  </div>
                  {cloudName && uploadPreset && (
                    <div className="mt-2">
                      <input type="file" accept="image/*" onChange={e => handleUpload(e.target.files?.[0], setNicBackUrl)} />
                    </div>
                  )}
                  {nicBackUrl && (
                    <img src={nicBackUrl} alt="NIC Back" className="mt-2 h-28 object-cover rounded border" />
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Bank Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input type="text" value={bank.accountName} onChange={e => setBank(prev => ({ ...prev, accountName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input type="text" value={bank.accountNumber} onChange={e => setBank(prev => ({ ...prev, accountNumber: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input type="text" value={bank.bankName} onChange={e => setBank(prev => ({ ...prev, bankName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input type="text" value={bank.branch} onChange={e => setBank(prev => ({ ...prev, branch: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT Code (optional)</label>
                  <input type="text" value={bank.swiftCode} onChange={e => setBank(prev => ({ ...prev, swiftCode: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link to="/farmer/dashboard" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: '#51ac37' }}>
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          By submitting, you confirm these details are accurate. Our team will review within 1-2 business days.
        </div>
      </div>
    </div>
  );
};

export default FarmerKyc;
