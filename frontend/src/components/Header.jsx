import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import cartIcon from '../assets/shopping-cart.svg';
import formatCurrency from '../utils/currency';
import api from '../services/api';
import NotificationBell from './NotificationBell';

// Derive a simple initial from a user's name
const getInitial = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const t = name.trim();
  if (!t) return '?';
  return t.charAt(0).toUpperCase();
};

const Header = () => {
  const [farmerUser, setFarmerUser] = useState(null);
  const [customerUser, setCustomerUser] = useState(null);
  const [cartInfo, setCartInfo] = useState({ count: 0, total: 0 });
  const [cartLoading, setCartLoading] = useState(false);

  useEffect(() => {
    const loadUserData = () => {
      const token = localStorage.getItem('token');
      const storedFarmer = localStorage.getItem('farmerUser');
      const storedCustomer = localStorage.getItem('customerUser');

      // Prefer explicit type when available
      let farmer = null;
      let customer = null;
      try { farmer = storedFarmer ? JSON.parse(storedFarmer) : null; } catch {}
      try { customer = storedCustomer ? JSON.parse(storedCustomer) : null; } catch {}

      // If both exist, choose by type or last updated (Fall back to farmer)
      if (farmer && farmer.type === 'farmer') {
        setFarmerUser(farmer);
        setCustomerUser(null);
      } else if (customer && customer.type === 'customer') {
        setCustomerUser(customer);
        setFarmerUser(null);
      } else if (farmer) {
        setFarmerUser(farmer);
        setCustomerUser(null);
      } else if (customer) {
        setCustomerUser(customer);
        setFarmerUser(null);
      } else {
        setFarmerUser(null);
        setCustomerUser(null);
      }

      // If no token, clear any stale state
      if (!token) {
        setFarmerUser(null);
        setCustomerUser(null);
      }
    };

    // Load initial data
    loadUserData();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'farmerUser' || e.key === 'customerUser') {
        loadUserData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events when login happens in same tab
    const handleUserUpdate = () => loadUserData();
  window.addEventListener('user:updated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user:updated', handleUserUpdate);
    };
  }, []);

  useEffect(() => {
    const loadCart = async () => {
      if (!localStorage.getItem('token')) return; // only load for authenticated user
      try {
        setCartLoading(true);
        const data = await api.getCart();
        const items = data?.cart?.items || [];
        const total = items.reduce((sum, it) => {
          const p = it.productId; if (!p) return sum; return sum + (p.price * it.quantity);
        }, 0);
        setCartInfo({ count: items.reduce((c, it) => c + it.quantity, 0), total });
      } catch (e) {
        // Silent fail; keep defaults
      } finally {
        setCartLoading(false);
      }
    };
    loadCart();

    const handler = () => loadCart();
    window.addEventListener('cart:updated', handler);
    return () => window.removeEventListener('cart:updated', handler);
  }, [customerUser]);

  return (
    <header className="sticky top-0 z-50 shadow-md" style={{backgroundColor: '#0b2f00'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-white hover:text-green-400 transition-colors">
              GreenHarvest
            </Link>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center space-x-6">
              {/* Show different navigation based on user type */}
              {farmerUser ? (
                // Farmer navigation - Dashboard, Products, Market, and Subscription
                <>
                  <Link to="/farmer/dashboard" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    Dashboard
                  </Link>
                  <Link to="/farmer/products" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    My Products
                  </Link>
                  <Link to="/farmer/market" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    My Market
                  </Link>
                  <Link to="/farmer/subscription" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    Subscription
                  </Link>
                </>
              ) : (
                // Non-farmer navigation (customers and guests)
                <>
                  <Link to="/" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    Home
                  </Link>
                  <Link to="/products" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    Products
                  </Link>
                  <Link to="/seasonal" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    Seasonal Picks
                  </Link>
                  <Link to="/promotions" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    Promotions
                  </Link>
                  <Link to="/community" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">
                    Community
                  </Link>
                  
                  {/* Logged-in customer quick links */}
                  {customerUser && (
                    <>
                      <Link to="/orders" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">My Orders</Link>
                      <Link to="/profile" className="text-white px-3 py-2 text-sm font-medium hover:text-green-400 transition-colors whitespace-nowrap">My Account</Link>
                    </>
                  )}
                </>
              )}
            </div>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {/* Cart Button - Only show for customers, not farmers */}
            {!farmerUser && (
              <Link 
                to="/cart"
                className="group flex items-center gap-2 rounded-md text-sm font-medium px-3 h-9 transition-colors" 
                style={{backgroundColor: '#0b2f00'}}
              >
                <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-full" style={{background:'#51ac37'}}>
                  <img src={cartIcon} alt="Cart" className="w-4 h-4 drop-shadow" />
                  {cartInfo.count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-white text-green-700 text-[10px] leading-none px-1 py-[2px] rounded-full font-semibold shadow" style={{minWidth:'18px'}}>
                      {cartInfo.count}
                    </span>
                  )}
                </span>
                <span className="flex flex-col leading-tight text-white">
                  <span className="text-[10px] tracking-wide uppercase opacity-80">Total</span>
                  <span className="text-xs font-semibold">{cartLoading ? 'Rs ...' : formatCurrency(cartInfo.total)}</span>
                </span>
              </Link>
            )}
            
            {/* User Authentication Actions */}
            {farmerUser ? (
              <div className="flex items-center gap-2 md:gap-3">
                {/* Notification Bell for farmers */}
                <NotificationBell />
                
                <div className="flex items-center gap-2 rounded-full pl-2 pr-2 md:pr-3 py-1 h-9 bg-white/10 border border-white/10">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold text-white" style={{backgroundColor:'#51ac37'}}>
                    {getInitial(farmerUser.name)}
                  </div>
                  <div className="text-white text-xs md:text-sm whitespace-nowrap">
                    <span className="hidden sm:inline">Welcome, </span>{farmerUser.name}
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('farmerUser');
                    localStorage.removeItem('token');
                    setFarmerUser(null);
                    window.dispatchEvent(new Event('user:updated'));
                    window.location.href = '/';
                  }}
                  className="text-white px-3 h-9 text-sm font-medium rounded-md border border-white/20 hover:border-green-400 hover:text-green-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : customerUser ? (
              <div className="flex items-center gap-2 md:gap-3">
                <Link to="/profile" className="flex items-center gap-2 rounded-full pl-2 pr-2 md:pr-3 py-1 h-9 bg-white/10 border border-white/10">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold text-white" style={{backgroundColor:'#51ac37'}}>
                    {getInitial(customerUser.firstName || customerUser.name)}
                  </div>
                  <div className="text-white text-xs md:text-sm whitespace-nowrap">
                    <span className="hidden sm:inline">Welcome! </span>{customerUser.firstName || customerUser.name}
                  </div>
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('customerUser');
                    localStorage.removeItem('token');
                    setCustomerUser(null);
                    window.dispatchEvent(new Event('user:updated'));
                    window.location.href = '/';
                  }}
                  className="text-white px-3 h-9 text-sm font-medium rounded-md border border-white/20 hover:border-green-400 hover:text-green-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Link 
                  to="/login" 
                  className="text-white px-2.5 py-2 text-sm font-medium rounded-md hover:text-green-400 transition-colors"
                >Login</Link>
                <Link 
                  to="/signup" 
                  className="text-white px-2.5 py-2 text-sm font-medium rounded-md hover:text-green-400 transition-colors whitespace-nowrap"
                >Sign Up</Link>
                <Link 
                  to="/farmer/signup" 
                  className="text-white px-3 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap hidden lg:inline-block" 
                  style={{backgroundColor: '#51ac37'}}
                >
                  Join as Farmer
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-white p-2 rounded-md hover:text-green-400 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;