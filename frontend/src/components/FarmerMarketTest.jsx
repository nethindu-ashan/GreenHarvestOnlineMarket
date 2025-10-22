import React from 'react';
import { Link } from 'react-router-dom';

const FarmerMarketTest = () => {
  // Mock data to test the UI
  const mockProduct = {
    _id: '1',
    productName: 'Fresh Tomatoes',
    price: 5.99,
    images: ['https://images.unsplash.com/photo-1546470427-e2bb4160b8d8'],
    owner: {
      _id: 'farmer123',
      name: 'Green Valley Farm',
      farmName: 'Green Valley Organic Farm'
    }
  };

  const mockFarmer = {
    _id: 'farmer123',
    name: 'John Smith',
    email: 'john@greenvalley.com',
    marketData: {
      farmName: 'Green Valley Organic Farm',
      farmDescription: 'We are a family-owned organic farm dedicated to providing fresh, healthy produce to our community. Our sustainable farming practices ensure the highest quality vegetables and fruits.',
      location: 'Sacramento Valley, California',
      specialization: 'Organic vegetables and fruits',
      contactPhone: '+1 (555) 123-4567',
      coverPhoto: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d',
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      farmPhotos: [
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854',
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b'
      ]
    }
  };

  const mockProducts = [
    {
      _id: '1',
      productName: 'Fresh Tomatoes',
      description: 'Vine-ripened organic tomatoes, perfect for salads and cooking',
      price: 5.99,
      quantityInStock: 25,
      images: ['https://images.unsplash.com/photo-1546470427-e2bb4160b8d8']
    },
    {
      _id: '2',
      productName: 'Organic Lettuce',
      description: 'Crisp, fresh lettuce grown without pesticides',
      price: 3.49,
      quantityInStock: 15,
      images: ['https://images.unsplash.com/photo-1556801712-76c8eb07bbc9']
    },
    {
      _id: '3',
      productName: 'Sweet Carrots',
      description: 'Sweet, crunchy carrots harvested fresh daily',
      price: 2.99,
      quantityInStock: 0,
      images: ['https://images.unsplash.com/photo-1582515073490-39981397c445']
    }
  ];

  const formatCurrency = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Test Header */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-blue-800 mb-2">Farmer Market Feature Test</h1>
          <p className="text-blue-600">
            This page demonstrates the new farmer profile functionality. Click the farm name below to see how it would link to a farmer's market page.
          </p>
        </div>

        {/* Product Cards Demo */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Product Cards with Farm Names</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProducts.map((product) => (
              <div key={product._id} className="group border rounded-lg p-4 flex flex-col hover:shadow-md transition-shadow">
                <div className="block mb-3 aspect-[4/3] bg-white overflow-hidden rounded border">
                  <img src={product.images[0]} alt={product.productName} className="object-contain w-full h-full group-hover:scale-105 transition-transform" />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="text-sm font-medium text-gray-800 leading-tight mb-1 line-clamp-2 group-hover:text-green-700">{product.productName}</div>
                  {/* Farm Name - This is what we added */}
                  <Link 
                    to={`/farmer/market/${mockFarmer._id}`}
                    className="text-xs text-green-600 hover:text-green-700 hover:underline mb-1 flex items-center gap-1"
                  >
                    🌱 {mockFarmer.marketData.farmName}
                  </Link>
                  <div className="text-xs text-gray-500 mb-2">Organic Vegetables</div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div>
                      <div className="text-sm font-semibold text-green-700">{formatCurrency(product.price)}</div>
                    </div>
                    <span className={`text-xs ${product.quantityInStock > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                      {product.quantityInStock > 0 ? `${product.quantityInStock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                  <button className="w-full mt-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm">
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Origin Section Demo */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Product Details - Origin Section</h2>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Origin</p>
                <Link 
                  to={`/farmer/market/${mockProduct.owner._id}`}
                  className="font-medium text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                >
                  🌱 {mockProduct.owner.name || mockProduct.owner.farmName || 'Local Farm'}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Price</p>
                <p className="font-medium text-gray-800">{formatCurrency(mockProduct.price)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Farmer Market Profile Demo */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <h2 className="text-xl font-semibold text-gray-800 p-6 pb-4">Farmer Market Profile View</h2>
          
          {/* Cover Photo */}
          <div className="relative h-64 bg-gradient-to-r from-green-400 to-green-600">
            <img 
              src={mockFarmer.marketData.coverPhoto} 
              alt="Farm Cover" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          </div>

          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 relative z-10">
              {/* Profile Photo */}
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-200 mb-4 sm:mb-0">
                <img 
                  src={mockFarmer.marketData.profilePhoto} 
                  alt="Farmer Profile" 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Farm Info */}
              <div className="sm:ml-6 flex-1">
                <h1 className="text-3xl font-bold text-white sm:text-gray-800 mb-2">
                  {mockFarmer.marketData.farmName}
                </h1>
                <p className="text-green-100 sm:text-gray-600 mb-2">
                  📍 {mockFarmer.marketData.location}
                </p>
                <p className="text-green-100 sm:text-gray-600">
                  🌱 {mockFarmer.marketData.specialization}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Farm Description */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">About Our Farm</h2>
          <p className="text-gray-600 leading-relaxed">{mockFarmer.marketData.farmDescription}</p>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Farmer Name</p>
              <p className="font-medium text-gray-800">{mockFarmer.name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Phone</p>
              <p className="font-medium text-gray-800">{mockFarmer.marketData.contactPhone}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Email</p>
              <p className="font-medium text-gray-800">{mockFarmer.email}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Location</p>
              <p className="font-medium text-gray-800">{mockFarmer.marketData.location}</p>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Our Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProducts.map((product) => (
              <div key={product._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Product Image */}
                <div className="h-48 bg-gray-200 overflow-hidden">
                  <img 
                    src={product.images[0]} 
                    alt={product.productName} 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">{product.productName}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(product.price)}
                    </span>
                    <span className={`text-sm ${product.quantityInStock > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                      {product.quantityInStock > 0 ? `${product.quantityInStock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                  
                  {/* View Product Button */}
                  <button
                    className="w-full mt-3 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    View Product
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Implementation Summary */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-800 mb-4">Implementation Complete</h2>
          <ul className="space-y-2 text-green-700">
            <li>• <strong>Product Details Origin:</strong> Farm name is clickable and links to farmer profile</li>
            <li>• <strong>Product Cards Farm Names:</strong> Added farm name under product name in all product listings</li>
            <li>• <strong>Clickable Farm Links:</strong> Farm names in product cards link to farmer market pages</li>
            <li>• <strong>Farmer Market Page:</strong> Displays cover photo, profile photo, farm description, and contact info</li>
            <li>• <strong>Products Display:</strong> Shows all products from the farmer with images and stock status</li>
            <li>• <strong>Responsive Design:</strong> Works on desktop and mobile devices</li>
            <li>• <strong>Backend API:</strong> Updated to support public farmer profile access</li>
            <li>• <strong>Routing:</strong> Added route for <code>/farmer/market/:farmerId</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FarmerMarketTest;