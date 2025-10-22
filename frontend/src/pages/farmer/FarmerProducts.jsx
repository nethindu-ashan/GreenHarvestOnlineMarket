import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import formatCurrency from '../../utils/currency';

const FarmerProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [kycStatus, setKycStatus] = useState('');

  useEffect(() => {
    const boot = async () => {
      try {
        const me = await api.getCurrentUser();
        setKycStatus(me?.user?.kycStatus || '');
      } catch {}
      loadProducts();
    };
    boot();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getFarmerProducts();
      console.log('Loaded farmer products:', data);
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'out_of_stock': return 'bg-red-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const handleDelete = async (productId) => {
    console.log('Attempting to delete product with ID:', productId);
    
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        console.log('User confirmed deletion, calling API...');
        await api.deleteProduct(productId);
        console.log('Product deleted successfully, updating state...');
        setProducts(products.filter(product => product._id !== productId));
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Failed to delete product:', err);
        setError(err.message || 'Failed to delete product');
      }
    } else {
      console.log('User cancelled deletion');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="w-full h-64 md:h-80 bg-gradient-to-r from-green-900 to-green-600 flex flex-col items-center justify-center text-center text-white px-4">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">My Products</h1>
        <p className="text-lg md:text-xl text-green-50 mb-6 max-w-2xl font-light">Manage your fresh produce inventory</p>
        
        {/* Search Bar */}
        <div className="w-full max-w-xl">
          <div className="flex w-full shadow-lg rounded-xl overflow-hidden bg-white">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your products..."
              className="flex-1 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            <button
              onClick={() => {
                if (kycStatus !== 'approved') {
                  alert('KYC approval required before adding products.');
                  navigate('/farmer/kyc');
                  return;
                }
                navigate('/farmer/products/new');
              }}
              className="flex items-center gap-2 px-6 py-3 text-white font-medium text-sm tracking-wide hover:brightness-110 transition"
              style={{background:'#51ac37'}}
            >
              <span>ADD PRODUCT</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <section className="py-8 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {['All', 'Fruits', 'Vegetables', 'Herbs', 'Grains'].map(category => (
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
            Your Fresh Products
          </h2>
          
          {error && (
            <div className="max-w-md mx-auto mb-6 bg-red-50 text-red-700 border border-red-200 p-4 rounded">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your products...</p>
            </div>
          )}
          
          {!loading && filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg mb-6">No products found matching your criteria.</p>
              <button
                onClick={() => {
                  if (kycStatus !== 'approved') {
                    alert('KYC approval required before adding products.');
                    navigate('/farmer/kyc');
                    return;
                  }
                  navigate('/farmer/products/new');
                }}
                className="inline-block px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                style={{backgroundColor: '#51ac37'}}
              >
                Add Your First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
              {filteredProducts.map(product => {
                const pid = product.id || product._id;
                return (
                  <div key={pid} className="group flex flex-col items-center text-center">
                    <div className="relative w-full">
                      <div className="w-full aspect-[3/4] flex items-center justify-center overflow-hidden bg-white border border-gray-100 shadow-sm group-hover:shadow-md transition rounded-sm">
                        <img
                          src={product.image || '/src/assets/1.jpg'}
                          alt={product.name}
                          className="h-full object-contain p-4"
                        />
                      </div>
                      
                      {/* Status Indicator */}
                      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(product.status)}`}></div>
                      
                      {/* Stock Badge */}
                      {(product.quantityInStock || product.stock) <= 5 && (product.quantityInStock || product.stock) > 0 && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                          Low Stock
                        </div>
                      )}
                      {(product.quantityInStock || product.stock) === 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          Out of Stock
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-2 w-full">
                      <h3 className="text-sm font-medium text-gray-800 h-10 leading-snug overflow-hidden">
                        {product.name}
                      </h3>
                      <p className="text-xs text-green-600 font-medium">{formatCurrency(product.price)}</p>
                      <p className="text-xs text-gray-500">
                        Stock: {(product.quantityInStock || product.stock || 0)}{product.unit || 'units'}
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-1 mt-3">
                          <Link
                            to={`/farmer/products/edit/${pid}`}
                            className="flex-1 text-[11px] font-medium text-gray-700 bg-gray-100 hover:text-white transition rounded-full py-2 border border-gray-200 text-center block"
                            onMouseEnter={(e) => {
                              const el = e.currentTarget;
                              el.style.backgroundColor = '#51ac37';
                              el.style.borderColor = '#51ac37';
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget;
                              el.style.backgroundColor = '#f3f4f6';
                              el.style.borderColor = '#e5e7eb';
                            }}
                          >
                          Edit
                        </Link>
                        <button
                            onClick={() => {
                              console.log('Delete button clicked for product:', pid);
                              handleDelete(pid);
                            }}
                          className="flex-1 text-[11px] font-medium text-gray-700 bg-gray-100 transition rounded-full py-2 border border-gray-200 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{products.length}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {products.filter(p => p.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {products.filter(p => p.status === 'out_of_stock' || (p.quantityInStock || p.stock) === 0).length}
              </div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {products.reduce((total, product) => total + (product.quantityInStock || product.stock || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FarmerProducts;