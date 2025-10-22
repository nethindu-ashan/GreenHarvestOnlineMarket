import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const AddProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get product ID from URL for editing
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    quantity: '',
    unit: 'kg',
    isOrganic: false,
    harvestDate: '',
    expiryDate: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState('');
  const [subscriptionPaid, setSubscriptionPaid] = useState(false);

  // Helper: get today's date in local timezone as yyyy-mm-dd
  const getTodayStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  const categories = [
    'Fruits',
    'Vegetables', 
    'Herbs',
    'Grains',
    'Dairy',
    'Other'
  ];

  const units = ['kg', 'lbs', 'pieces', 'bunches', 'boxes', 'bags'];

  // Load product data when editing
  useEffect(() => {
    // Check KYC and subscription status
    const checkRequirements = async () => {
      try {
        const me = await api.getCurrentUser();
        const status = me?.user?.kycStatus || '';
        const subscriptionStatus = me?.user?.subscriptionPaid || false;
        
        setKycStatus(status);
        setSubscriptionPaid(subscriptionStatus);
        
        // Removed premium subscription required error
        if (status !== 'approved') {
          setErrors({ submit: 'You cannot add products until your KYC is approved.' });
        }
      } catch (e) {
        // ignore
      }
    };
    checkRequirements();

    if (isEditing && id) {
      const loadProduct = async () => {
        try {
          setIsLoading(true);
          const response = await api.getProduct(id);
          const product = response.product;
          
          setFormData({
            name: product.productName || product.name || '',
            description: product.description || '',
            price: product.price || '',
            category: product.category || '',
            quantity: product.quantityInStock || product.stock || '',
            unit: product.unit || 'kg',
            isOrganic: product.isOrganic || false,
            harvestDate: product.harvestDate ? product.harvestDate.split('T')[0] : '',
            expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : ''
          });
          
          if (product.image || (product.images && product.images[0])) {
            setImagePreview(product.image || product.images[0]);
          }
        } catch (err) {
          console.error('Failed to load product:', err);
          setErrors({ submit: 'Failed to load product data' });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadProduct();
    }
  }, [isEditing, id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
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
    const fileInput = document.getElementById('productImage');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.quantity || parseInt(formData.quantity) < 1) newErrors.quantity = 'Minimum stock is 1';
    if (!formData.harvestDate) newErrors.harvestDate = 'Harvest date is required';

    // Date validations
    const today = getTodayStr();
    if (formData.harvestDate && formData.harvestDate > today) {
      newErrors.harvestDate = 'Harvest date cannot be in the future';
    }
    if (formData.expiryDate) {
      if (formData.expiryDate < today) {
        newErrors.expiryDate = 'Best before date cannot be in the past';
      }
      if (formData.harvestDate && formData.expiryDate <= formData.harvestDate) {
        newErrors.expiryDate = 'Best before date must be after harvest date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Removed premium subscription required error
    
    if (kycStatus !== 'approved') {
      setErrors({ submit: 'KYC not approved. Please complete KYC and wait for approval before adding products.' });
      return;
    }
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Check if user is logged in
      const token = localStorage.getItem('token');
      if (!token) {
        setErrors({ submit: 'Please login again to add products.' });
        navigate('/farmer/login');
        return;
      }

      // Map frontend form data to backend expected field names
      const productData = {
        productName: formData.name,  // Backend expects 'productName'
        price: parseFloat(formData.price),
        description: formData.description,
        quantityInStock: parseInt(formData.quantity),  // Backend expects 'quantityInStock'
        expiryDate: formData.expiryDate,
        images: selectedImage ? [imagePreview] : [],  // Backend expects 'images' array
        category: formData.category,
        unit: formData.unit,
        isOrganic: formData.isOrganic,
        harvestDate: formData.harvestDate
      };

      console.log('Sending product data:', productData);  // Debug log
      console.log('Token:', token); // Debug log

      let response;
      if (isEditing) {
        response = await api.updateProduct(id, productData);
        console.log('Product update response:', response);  // Debug log
        alert('Product updated successfully!');
      } else {
        response = await api.createProduct(productData);
        console.log('Product creation response:', response);  // Debug log
        alert('Product added successfully!');
      }
      navigate('/farmer/products');
    } catch (error) {
      console.error('Add product error:', error);
      
      if (error.message.includes('401')) {
        setErrors({ submit: 'Please login again to add products.' });
        navigate('/farmer/login');
      } else if (error.message.includes('403')) {
        setErrors({ submit: 'You are not authorized to add products. Please make sure you are logged in as a farmer.' });
      } else if (error.message.includes('400')) {
        setErrors({ submit: 'Invalid product data. Please check your inputs.' });
      } else {
        setErrors({ submit: 'Failed to add product. Please try again. Error: ' + error.message });
      }
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
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing ? 'Update your product information' : 'Add a new product to your farm inventory'}
            </p>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {kycStatus !== 'approved' && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                You cannot add products until your KYC is approved. Please complete your KYC.
                <button
                  type="button"
                  onClick={() => navigate('/farmer/kyc')}
                  className="ml-2 underline"
                  style={{ color: '#51ac37' }}
                >
                  Go to KYC
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Fresh Organic Tomatoes"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Unit ($) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.price ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.price && <p className="text-red-600 text-sm mt-1">{errors.price}</p>}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Quantity *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="1"
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.quantity ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                {errors.quantity && <p className="text-red-600 text-sm mt-1">{errors.quantity}</p>}
              </div>

              {/* Harvest Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harvest Date *
                </label>
                <input
                  type="date"
                  name="harvestDate"
                  value={formData.harvestDate}
                  onChange={handleChange}
                  max={getTodayStr()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.harvestDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.harvestDate && <p className="text-red-600 text-sm mt-1">{errors.harvestDate}</p>}
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Best Before Date
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  min={getTodayStr()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: When should customers consume this product by?
                </p>
                {errors.expiryDate && <p className="text-red-600 text-sm mt-1">{errors.expiryDate}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe your product, growing methods, quality, etc."
              />
              {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Product Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              
              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <label htmlFor="productImage" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload a product image
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        PNG, JPG, GIF, WebP up to 5MB
                      </span>
                    </label>
                    <input
                      id="productImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => document.getElementById('productImage').click()}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      Choose Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-64 object-cover rounded-lg border border-gray-300"
                  />
                  <div className="absolute top-2 right-2 space-x-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById('productImage').click()}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    id="productImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              )}
              
              {errors.image && <p className="text-red-600 text-sm mt-1">{errors.image}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Recommended: Square images (1:1 ratio) for best display
              </p>
            </div>

            {/* Organic Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isOrganic"
                checked={formData.isOrganic}
                onChange={handleChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                This is an organic product
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
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isLoading 
                  ? (isEditing ? 'Updating Product...' : 'Adding Product...') 
                  : (isEditing ? 'Update Product' : 'Add Product')
                }
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/farmer/products')}
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

export default AddProduct;