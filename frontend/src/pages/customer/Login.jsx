import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get('redirect');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      setErrors({});
      
      try {
        // Attempt to login using the API
        const response = await api.login({
          email: formData.email,
          password: formData.password
        });
        
        // Store the token if login is successful
        if (response.token) {
          localStorage.setItem('token', response.token);
          
          // Check user type and store accordingly
          if (response.user.type === 'customer') {
            localStorage.setItem('customerUser', JSON.stringify(response.user));
            // Clear any existing farmer user data
            localStorage.removeItem('farmerUser');
            window.dispatchEvent(new Event('user:updated'));
            // Redirect to requested page or home
            if (redirectTo) {
              navigate(redirectTo);
            } else {
              window.location.href = '/';
            }
          } else if (response.user.type === 'farmer') {
            // Redirect farmer users to farmer login page
            localStorage.removeItem('token'); // Clear token since this is customer login
            setErrors({ general: 'Farmer accounts should use the farmer login page.' });
            return;
          } else {
            // Unknown user type
            localStorage.setItem('customerUser', JSON.stringify(response.user));
            localStorage.removeItem('farmerUser');
            if (redirectTo) {
              navigate(redirectTo);
            } else {
              window.location.href = '/';
            }
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        
        // Map specific backend responses
        if (error.status === 403) {
          setErrors({ general: 'Please verify your email before login.' });
        } else if (error.status === 400 || error.status === 401) {
          setErrors({ general: 'Invalid email or password' });
        } else if (error.message.includes('fetch')) {
          setErrors({ general: 'Unable to connect to server. Please try again later.' });
        } else {
          setErrors({ general: 'An error occurred during login. Please try again.' });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your GreenHarvest account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error Display */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {errors.general}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm hover:underline" style={{color: '#51ac37'}}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-white font-medium rounded-lg transition-opacity ${
                isLoading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:opacity-90'
              }`}
              style={{backgroundColor: '#51ac37'}}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-gray-600">
              New here?{' '}
              <Link to="/signup" className="font-medium hover:underline" style={{color: '#51ac37'}}>
                Sign up
              </Link>
            </p>
            <p className="text-gray-600">
              Are you a farmer?{' '}
              <Link to="/farmer/login" className="font-medium hover:underline" style={{color: '#51ac37'}}>
                Farmer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;