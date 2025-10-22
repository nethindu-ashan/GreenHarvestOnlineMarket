import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
  setError('');
  setServerMsg('');
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    try {
      setLoading(true);
      const res = await api.requestPasswordOtp(email);
      const msg = res?.message || 'OTP sent to your email.';
      setServerMsg(msg);
      setSent(true);
      // Immediately redirect to the reset page with email prefilled and a flag to show success message
      navigate(`/reset-password?email=${encodeURIComponent(email)}&sent=1`);
    } catch (e) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password</h2>
        <p className="text-gray-600 mb-6">Enter your email and we'll send you a one-time code to reset your password.</p>
        {sent ? (
          <div className="space-y-4">
            {serverMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{serverMsg}</div>
            )}
            <p className="text-sm text-gray-600">You can close this page after checking your inbox.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-60" style={{background:'#51ac37'}}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
