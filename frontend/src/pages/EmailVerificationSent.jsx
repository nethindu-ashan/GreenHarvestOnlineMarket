import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const EmailVerificationSent = () => {
  const query = useQuery();
  const email = query.get('email') || '';
  const type = query.get('type') || 'customer';
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    setStatus('');
    try {
      await api.resendVerification(email);
      setStatus('We have re-sent the verification email.');
    } catch (e) {
      setStatus('Failed to resend. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor:'#e9f7ef'}}>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Verify your email</h1>
          <p className="text-gray-600 mb-6">We've sent a verification link to</p>
          <p className="font-medium text-gray-900 mb-6">{email}</p>
          <p className="text-gray-600 mb-8">Please check your inbox (and spam folder) and click the link to activate your account.</p>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">After verifying, you can continue:</p>
            {type === 'farmer' ? (
              <Link to="/farmer/login" className="inline-block px-4 py-2 rounded-lg text-white" style={{background:'#51ac37'}}>Go to Farmer Login</Link>
            ) : (
              <Link to="/login" className="inline-block px-4 py-2 rounded-lg text-white" style={{background:'#51ac37'}}>Go to Login</Link>
            )}
            <div className="pt-4">
              <button onClick={resend} disabled={loading} className="text-sm underline" style={{color:'#51ac37'}}>
                {loading ? 'Resending…' : 'Resend verification email'}
              </button>
              {status && <p className="text-sm text-gray-600 mt-2">{status}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationSent;
