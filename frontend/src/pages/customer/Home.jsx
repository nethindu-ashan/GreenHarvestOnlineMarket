import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import searchIcon from '../../assets/search.svg';
import cartIconDark from '../../assets/shopping-cart-dark.svg';
import cartIconLight from '../../assets/shopping-cart.svg';
import formatCurrency from '../../utils/currency';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts();
        setProducts(data.products || []);
      } catch (err) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAddToCart = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to add items to your cart.');
        window.location.href = '/login';
        return;
      }
      await api.addToCart(productId, 1);
      window.dispatchEvent(new CustomEvent('cart:updated'));
    } catch (e) {
      console.error('Add to cart failed', e);
    }
  };

  const filteredProducts = products.filter(product => {
    const name = (product.name || '').toLowerCase();
    const category = product.category || 'General';
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient Banner (replacing image hero) */}
  <div className="w-full h-64 md:h-80 bg-gradient-to-r from-green-900 to-green-600 flex flex-col items-center justify-center text-center text-white px-4">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Fresh Produce Delivered</h1>
        <p className="text-lg md:text-xl text-green-50 mb-6 max-w-2xl font-light">Quality fruits and vegetables from local farmers</p>
        <form
          onSubmit={(e) => { e.preventDefault(); }}
          className="w-full max-w-xl"
        >
          <div className="flex w-full shadow-lg rounded-xl overflow-hidden bg-white">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for any product"
              className="flex-1 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 text-white font-medium text-sm tracking-wide hover:brightness-110 transition"
              style={{background:'#51ac37'}}
            >
              <span>SEARCH</span>
              <img src={searchIcon} alt="Search" className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Filter Section */}
      <section className="py-8 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {['All', 'Fruits', 'Vegetables'].map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === category
                    ? 'text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={{
                  backgroundColor: selectedCategory === category ? '#51ac37' : undefined
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Our Fresh Products
          </h2>
          {error && (
            <div className="max-w-md mx-auto mb-6 bg-red-50 text-red-700 border border-red-200 p-4 rounded">
              {error}
            </div>
          )}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          )}
          
          {!loading && filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No products found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
              {filteredProducts.map(product => {
                const pid = product.id || product._id;
                return (
                  <div key={pid} className="group flex flex-col items-center text-center">
                    <Link to={`/product/${pid}`} className="block w-full">
                      <div className="w-full aspect-[3/4] flex items-center justify-center overflow-hidden bg-white border border-gray-100 shadow-sm group-hover:shadow-md transition rounded-sm">
                        <img
                          src={product.image || (product.images && product.images[0]) || '/src/assets/1.jpg'}
                          alt={product.name}
                          className="h-full object-contain p-4"
                        />
                      </div>
                    </Link>
                    <div className="mt-4 space-y-2 w-full">
                      <Link to={`/product/${pid}`} className="block text-sm font-medium text-gray-800 hover:text-green-600 h-10 leading-snug overflow-hidden">
                        {product.name}
                      </Link>
                      <p className="text-xs text-green-600 font-medium">{formatCurrency(product.price)}</p>
                      <button
                        onClick={() => handleAddToCart(pid)}
                        className="group/button w-full flex items-center justify-center gap-2 text-[11px] font-medium text-gray-700 bg-gray-100 hover:text-white transition rounded-full py-2 border border-gray-200"
                        style={{ '--hover-bg': '#51ac37' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#51ac37'; e.currentTarget.style.borderColor = '#51ac37'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        <span className="relative flex items-center">
                          <img src={cartIconDark} alt="Add" className="w-4 h-4 block group-hover/button:hidden" />
                          <img src={cartIconLight} alt="Add" className="w-4 h-4 hidden group-hover/button:block" />
                        </span>
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;