import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import formatCurrency from '../../utils/currency';

const FarmerMarket = () => {
  const navigate = useNavigate();
  const { farmerId } = useParams();
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isViewMode, setIsViewMode] = useState(false);
  const [farmerProducts, setFarmerProducts] = useState([]);
  const [marketData, setMarketData] = useState({
    farmName: '',
    farmDescription: '',
    location: '',
    specialization: '',
    contactPhone: '',
    coverPhoto: '',
    profilePhoto: '',
    farmPhotos: ['', '']
  });

  useEffect(() => {
    const boot = async () => {
      // If farmerId is provided, we're in view mode for another farmer
      if (farmerId) {
        setIsViewMode(true);
        try {
          setLoading(true);
          // Get farmer profile data
          const farmerResponse = await api.get(`/users/farmer/${farmerId}`);
          setFarmer(farmerResponse.farmer);
          
          // Get farmer's market data
          const marketResponse = await api.get(`/users/farmer/market/${farmerId}`);
          if (marketResponse.marketData) {
            setMarketData(marketResponse.marketData);
          }
          
          // Get farmer's products
          const productsResponse = await api.get(`/products/farmer/${farmerId}`);
          setFarmerProducts(productsResponse.products || []);
          
        } catch (error) {
          console.error('Error loading farmer profile:', error);
          setMessage({ type: 'error', text: 'Failed to load farmer profile' });
        } finally {
          setLoading(false);
        }
        return;
      }

      // Original logic for editing own profile
      const stored = localStorage.getItem('farmerUser');
      if (!stored) {
        navigate('/farmer/login');
        return;
      }
      const u = JSON.parse(stored);
      setFarmer(u);
      
      // Load existing market data
      try {
        setLoading(true);
        const response = await api.get('/users/farmer/market');
        if (response.marketData) {
          setMarketData(prev => ({ ...prev, ...response.marketData }));
        }
      } catch (error) {
        console.log('No existing market data found');
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, [navigate, farmerId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('farmPhotos')) {
      const index = parseInt(name.split('[')[1].split(']')[0]);
      setMarketData(prev => ({
        ...prev,
        farmPhotos: prev.farmPhotos.map((photo, i) => i === index ? value : photo)
      }));
    } else {
      setMarketData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageUpload = async (file, fieldName) => {
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setMessage({ type: 'error', text: 'Image upload is not configured. Please provide image URL manually.' });
      return;
    }

    try {
      setImageUploading(true);
      setMessage({ type: '', text: '' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.secure_url) {
        if (fieldName.startsWith('farmPhoto')) {
          const index = parseInt(fieldName.replace('farmPhoto', ''));
          setMarketData(prev => ({
            ...prev,
            farmPhotos: prev.farmPhotos.map((photo, i) => i === index ? data.secure_url : photo)
          }));
        } else {
          setMarketData(prev => ({
            ...prev,
            [fieldName]: data.secure_url
          }));
        }
        setMessage({ type: 'success', text: 'Image uploaded successfully!' });
        // Clear success message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload image: ' + error.message });
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/users/farmer/market', marketData);
      if (response.success) {
        setMessage({ type: 'success', text: 'Market profile updated successfully!' });
        // Clear success message after 5 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update market profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        )}

        {/* View Mode - Display farmer profile */}
        {isViewMode && !loading && (
          <>
            {/* Farmer Profile Header */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              {/* Cover Photo */}
              <div className="relative h-64 bg-gradient-to-r from-green-400 to-green-600">
                {marketData.coverPhoto && (
                  <img 
                    src={marketData.coverPhoto} 
                    alt="Farm Cover" 
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30"></div>
              </div>

              {/* Profile Info */}
              <div className="relative px-6 pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 relative z-10">
                  {/* Profile Photo */}
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-200 mb-4 sm:mb-0">
                    {marketData.profilePhoto ? (
                      <img 
                        src={marketData.profilePhoto} 
                        alt="Farmer Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Farm Info */}
                  <div className="sm:ml-6 flex-1">
                    <h1 className="text-3xl font-bold text-white sm:text-gray-800 mb-2">
                      {marketData.farmName || farmer?.name || 'Farm Name'}
                    </h1>
                    <p className="text-green-100 sm:text-gray-600 mb-2">
                      📍 {marketData.location || 'Location not specified'}
                    </p>
                    <p className="text-green-100 sm:text-gray-600">
                      🌱 {marketData.specialization || 'General farming'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Farm Description */}
            {marketData.farmDescription && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">About Our Farm</h2>
                <p className="text-gray-600 leading-relaxed">{marketData.farmDescription}</p>
              </div>
            )}

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Farmer Name</p>
                  <p className="font-medium text-gray-800">{farmer?.name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Phone</p>
                  <p className="font-medium text-gray-800">{marketData.contactPhone || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Email</p>
                  <p className="font-medium text-gray-800">{farmer?.email || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Location</p>
                  <p className="font-medium text-gray-800">{marketData.location || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Farm Photos */}
            {marketData.farmPhotos && marketData.farmPhotos.some(photo => photo) && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Farm Gallery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketData.farmPhotos.map((photo, index) => 
                    photo && (
                      <div key={index} className="rounded-lg overflow-hidden">
                        <img 
                          src={photo} 
                          alt={`Farm Photo ${index + 1}`} 
                          className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Products Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Products</h2>
              {farmerProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No products available at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {farmerProducts.map((product) => (
                    <div key={product._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {/* Product Image */}
                      <div className="h-48 bg-gray-200 overflow-hidden">
                        {product.images && product.images[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.productName || product.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2">{product.productName || product.name}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {product.quantityInStock > 0 ? `${product.quantityInStock} in stock` : 'Out of stock'}
                          </span>
                        </div>
                        
                        {/* View Product Button */}
                         <button
                          onClick={() => navigate(`/products/${product._id}`)}
                          className="w-full mt-3 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          View Product
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit Mode - Original form */}
        {!isViewMode && !loading && (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">My Market</h1>
              <p className="text-gray-600 mt-2">Create your farm profile to showcase your business to customers</p>
            </div>

            {/* Message Display */}
            {message.text && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Image Upload Loading Overlay */}
            {imageUploading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-700">Uploading image...</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
          {/* Cover Photo Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative group">
              {marketData.coverPhoto ? (
                <img 
                  src={marketData.coverPhoto} 
                  alt="Farm Cover" 
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <p className="text-lg font-medium">Add Cover Photo</p>
                  </div>
                </div>
              )}
              
              {/* Cover Photo Edit Icon - appears on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <label className="cursor-pointer bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-lg transition-all transform hover:scale-105 opacity-0 group-hover:opacity-100">
                  <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit Cover
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files[0], 'coverPhoto')}
                  />
                </label>
              </div>
              
              {/* Always visible edit button in corner for mobile */}
              <div className="absolute bottom-4 right-4 md:hidden">
                <label className="cursor-pointer bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-full shadow-lg transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files[0], 'coverPhoto')}
                  />
                </label>
              </div>
            </div>

            {/* Profile Photo Section */}
            <div className="relative -mt-16 ml-8 group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white relative">
                {marketData.profilePhoto ? (
                  <img 
                    src={marketData.profilePhoto} 
                    alt="Farm Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                {/* Hover overlay for profile photo */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 rounded-full flex items-center justify-center">
                  <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files[0], 'profilePhoto')}
                    />
                  </label>
                </div>
              </div>
              
              {/* Always visible edit icon for profile photo */}
              <label className="absolute bottom-2 right-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-lg transition-all transform hover:scale-110">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files[0], 'profilePhoto')}
                />
              </label>
            </div>

            {/* Basic Info */}
            <div className="pt-4 pb-6 px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Farm Name *</label>
                  <input
                    type="text"
                    name="farmName"
                    value={marketData.farmName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Green Valley Farm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                  <input
                    type="text"
                    name="location"
                    value={marketData.location}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Kandy, Sri Lanka"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Farm Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Farm Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={marketData.specialization}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Organic Vegetables, Fruits, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={marketData.contactPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+94 71 234 5678"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Farm Description *</label>
              <textarea
                name="farmDescription"
                value={marketData.farmDescription}
                onChange={handleInputChange}
                required
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Tell customers about your farm, your farming philosophy, and what makes your products special..."
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={marketData.contactPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+94 71 234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={marketData.contactEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="farm@example.com"
                />
              </div>
            </div>
          </div>

          {/* Farm Photos Gallery */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Farm Photo Gallery</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1].map((index) => (
                <div key={index} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Farm Photo {index + 1}</label>
                  {marketData.farmPhotos[index] ? (
                    <div className="relative">
                      <img 
                        src={marketData.farmPhotos[index]} 
                        alt={`Farm ${index + 1}`} 
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newPhotos = [...marketData.farmPhotos];
                          newPhotos[index] = '';
                          setMarketData(prev => ({ ...prev, farmPhotos: newPhotos }));
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block w-full h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors">
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">Click to upload</span>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files[0], `farmPhoto${index}`)}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate('/farmer/dashboard')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#51ac37' }}
            >
              {loading ? 'Saving...' : 'Save Market Profile'}
            </button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
};

export default FarmerMarket;



