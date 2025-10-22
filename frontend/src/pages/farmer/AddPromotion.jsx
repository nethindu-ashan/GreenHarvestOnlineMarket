import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const AddPromotion = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get promotion ID from URL for editing
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState({
    productName: '',
    originalPrice: '',
    discountedPrice: '',
    discountPercentage: '',
    productId: '',
    startDate: '',
    endDate: '',
    isActive: true,
    stockLevel: '',
    description: ''
  });
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);

  // Helper: today's date yyyy-mm-dd respecting timezone
  const getTodayStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  // Load farmer's products for selection
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.getFarmerProducts();
        setProducts(response.products || []);
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    
    loadProducts();

    // Load promotion data when editing
    if (isEditing && id) {
      const loadPromotion = async () => {
        try {
          setIsLoading(true);
          const response = await api.getPromotion(id);
          const promotion = response.promotion;
          
          setFormData({
            productName: promotion.productName || '',
            originalPrice: promotion.originalPrice || '',
            discountedPrice: promotion.discountedPrice || '',
            discountPercentage: promotion.discountPercentage || '',
            productId: promotion.productId || '',
            startDate: promotion.startDate ? promotion.startDate.split('T')[0] : '',
            endDate: promotion.endDate ? promotion.endDate.split('T')[0] : '',
            isActive: promotion.isActive !== undefined ? promotion.isActive : true,
            stockLevel: promotion.stockLevel || '',
            description: promotion.description || ''
          });
          
          if (promotion.image) {
            setImagePreview(promotion.image);
          }
        } catch (err) {
          console.error('Failed to load promotion:', err);
          setErrors({ submit: 'Failed to load promotion data' });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadPromotion();
    }
  }, [isEditing, id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle product selection to auto-populate fields
    if (name === 'productId' && value) {
      const selectedProduct = products.find(p => p._id === value);
      if (selectedProduct) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          productName: selectedProduct.productName || selectedProduct.name,
          originalPrice: selectedProduct.price || ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Auto-calculate discount percentage when prices change
    if (name === 'originalPrice' || name === 'discountedPrice') {
      const original = name === 'originalPrice' ? parseFloat(value) : parseFloat(formData.originalPrice);
      const discounted = name === 'discountedPrice' ? parseFloat(value) : parseFloat(formData.discountedPrice);
      
      if (original && discounted && original > discounted) {
        const percentage = Math.round(((original - discounted) / original) * 100);
        setFormData(prev => ({
          ...prev,
          [name]: value,
          discountPercentage: percentage
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, image: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Clear error
      if (errors.image) {
        setErrors(prev => ({ ...prev, image: '' }));
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    // Reset file input
    const fileInput = document.getElementById('promotionImage');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) newErrors.productName = 'Product name is required';
    if (!formData.originalPrice || parseFloat(formData.originalPrice) <= 0) {
      newErrors.originalPrice = 'Valid original price is required';
    }
    if (!formData.discountedPrice || parseFloat(formData.discountedPrice) <= 0) {
      newErrors.discountedPrice = 'Valid discounted price is required';
    }
    if (formData.originalPrice && formData.discountedPrice && 
        parseFloat(formData.discountedPrice) >= parseFloat(formData.originalPrice)) {
      newErrors.discountedPrice = 'Discounted price must be less than original price';
    }
    if (!formData.stockLevel || parseInt(formData.stockLevel) < 1) {
      newErrors.stockLevel = 'Minimum stock is 1';
    }
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    // Date constraints: start >= today, end > start
    const today = getTodayStr();
    if (formData.startDate && formData.startDate < today) {
      newErrors.startDate = 'Start date cannot be in the past';
    }
    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    // Discount bounds (if user filled discountPercentage directly or via calc)
    const original = parseFloat(formData.originalPrice);
    const discounted = parseFloat(formData.discountedPrice);
    if (original > 0 && discounted > 0) {
      const pct = Math.round(((original - discounted) / original) * 100);
      if (pct <= 0 || pct >= 100) {
        newErrors.discountedPrice = 'Discount must be between 1% and 99%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const promotionData = {
        productName: formData.productName,
        originalPrice: parseFloat(formData.originalPrice),
        discountedPrice: parseFloat(formData.discountedPrice),
        discountPercentage: formData.discountPercentage || Math.round(((formData.originalPrice - formData.discountedPrice) / formData.originalPrice) * 100),
        productId: formData.productId || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive,
        stockLevel: parseInt(formData.stockLevel),
        description: formData.description,
        image: imagePreview
      };

      let response;
      if (isEditing) {
        response = await api.updatePromotion(id, promotionData);
        alert('Promotion updated successfully!');
      } else {
        response = await api.createPromotion(promotionData);
        alert('Promotion created successfully!');
      }
      navigate('/farmer/promotions');
    } catch (error) {
      console.error('Promotion error:', error);
      setErrors({ submit: 'Failed to save promotion. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditing ? 'Edit Promotion' : 'Create New Promotion'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing ? 'Update your promotion details' : 'Create attractive promotions to boost your sales'}
            </p>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.productName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Watawala Tea Kahata Pouch 400g"
                />
                {errors.productName && <p className="text-red-600 text-sm mt-1">{errors.productName}</p>}
              </div>

              {/* Select Existing Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Select Existing Product
                </label>
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select a product...</option>
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.productName || product.name} - Rs. {product.price}
                    </option>
                  ))}
                </select>
              </div>

              {/* Original Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Price (Rs.) *
                </label>
                <input
                  type="number"
                  name="originalPrice"
                  value={formData.originalPrice}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.originalPrice ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="1140.00"
                  step="0.01"
                  min="0.01"
                />
                {errors.originalPrice && <p className="text-red-600 text-sm mt-1">{errors.originalPrice}</p>}
              </div>

              {/* Discounted Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discounted Price (Rs.) *
                </label>
                <input
                  type="number"
                  name="discountedPrice"
                  value={formData.discountedPrice}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.discountedPrice ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="855.00"
                  step="0.01"
                  min="0.01"
                />
                {errors.discountedPrice && <p className="text-red-600 text-sm mt-1">{errors.discountedPrice}</p>}
              </div>
            </div>

            {/* Auto-calculated Discount Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Percentage (Auto-calculated)
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                <span className="text-2xl font-bold text-green-600">
                  {formData.originalPrice && formData.discountedPrice ? 
                    Math.round(((formData.originalPrice - formData.discountedPrice) / formData.originalPrice) * 100) : 0}%
                </span>
                <span className="text-sm text-gray-600 ml-2">OFF</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Additional details about your promotion..."
              />
            </div>

            {/* Preview Card */}
            {formData.productName && formData.originalPrice && formData.discountedPrice && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promotion Preview
                </label>
                <div className="max-w-sm mx-auto bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                  {/* Product Image */}
                  <div className="relative">
                    {imagePreview ? (
                      <img src={imagePreview} alt={formData.productName} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <span className="text-white text-lg font-medium">Product Image</span>
                      </div>
                    )}
                    
                    {/* Discount Badge */}
                    {formData.originalPrice && formData.discountedPrice && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-sm font-bold">
                        Nexus {Math.round(((formData.originalPrice - formData.discountedPrice) / formData.originalPrice) * 100)}% OFF
                      </div>
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">{formData.productName}</h3>
                    
                    {/* Price Section */}
                    <div className="mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 line-through text-sm">Rs {parseFloat(formData.originalPrice).toFixed(2)}</span>
                        <span className="text-green-600 font-bold text-lg">Rs {parseFloat(formData.discountedPrice).toFixed(2)}</span>
                      </div>
                      <span className="text-gray-500 text-sm">/ Unit</span>
                    </div>
                    
                    {/* Add to Cart Button */}
                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                      </svg>
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stock Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Level *
                </label>
                <input
                  type="number"
                  name="stockLevel"
                  value={formData.stockLevel}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.stockLevel ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Available quantity"
                  min="1"
                />
                {errors.stockLevel && <p className="text-red-600 text-sm mt-1">{errors.stockLevel}</p>}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min={getTodayStr()}
                />
                {errors.startDate && <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min={formData.startDate || getTodayStr()}
                />
                {errors.endDate && <p className="text-red-600 text-sm mt-1">{errors.endDate}</p>}
              </div>
            </div>

            {/* Promotion Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promotion Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Promotion preview" 
                      className="w-32 h-32 object-cover rounded-lg mx-auto"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                    </svg>
                    <div className="mt-2">
                      <label htmlFor="promotionImage" className="cursor-pointer text-orange-600 hover:text-orange-700">
                        Click to upload promotion image
                      </label>
                      <input
                        id="promotionImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                  </div>
                )}
              </div>
              {errors.image && <p className="text-red-600 text-sm mt-1">{errors.image}</p>}
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active promotion (customers can see and use this promotion)
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {isLoading 
                  ? (isEditing ? 'Updating Promotion...' : 'Creating Promotion...') 
                  : (isEditing ? 'Update Promotion' : 'Create Promotion')
                }
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/farmer/dashboard')}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPromotion;