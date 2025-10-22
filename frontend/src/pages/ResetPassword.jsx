import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const prefillEmail = params.get('email') || '';
  const otpSentFlag = params.get('sent');
  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(otpSentFlag ? 'OTP sent to your email. Please enter the 6-digit code below.' : '');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ if (prefillEmail) setEmail(prefillEmail); }, [prefillEmail]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email || !/\S+@\S+\.\S+/.test(email)) return setError('Enter a valid email');
    if (!otp || otp.length !== 6) return setError('Enter the 6-digit OTP');
    if (!password || password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    try {
      setLoading(true);
      await api.resetPasswordWithOtp({ email, otp, newPassword: password });
      setSuccess('Password reset successful. Redirecting to login…');
      setTimeout(()=> navigate('/login'), 1200);
    } catch (e) {
      setError(e.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h2>
        <p className="text-gray-600 mb-6">Enter the OTP you received and your new password.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OTP Code</label>
            <input type="text" value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g,''))} maxLength={6} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent tracking-widest" placeholder="123456" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Re-enter new password" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-60" style={{background:'#51ac37'}}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
