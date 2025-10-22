import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const EmailVerified = () => {
  const query = useQuery();
  const type = query.get('type') || 'customer';

  const isLoggedIn = Boolean(localStorage.getItem('token'));

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor:'#e9f7ef'}}>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Verification successful</h1>
          <p className="text-gray-600 mb-8">Your email has been verified. You're all set!</p>

          {type === 'farmer' ? (
            <Link to="/farmer/dashboard" className="inline-block px-5 py-3 rounded-lg text-white" style={{background:'#51ac37'}}>
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/profile" className="px-5 py-3 rounded-lg text-white text-center" style={{background:'#51ac37'}}>
                {isLoggedIn ? 'My Account' : 'Login to My Account'}
              </Link>
              <Link to="/products" className="px-5 py-3 rounded-lg text-white text-center" style={{background:'#61b84a'}}>
                Start Shopping
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerified;
