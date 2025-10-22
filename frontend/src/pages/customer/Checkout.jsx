import React, { useEffect, useState } from 'react';
import formatCurrency from '../../utils/currency';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const Checkout = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartError, setCartError] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    paymentMethod: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    specialInstructions: ''
  });

  // Load real cart from backend and guard access
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        setLoadingCart(true);
        setCartError('');
        const data = await api.getCart();
        const items = (data?.cart?.items || [])
          .filter(it => it.productId) // safety
          .map(it => ({
            id: (it.productId && (it.productId._id || it.productId.id)) || it.productId,
            name: it.productId.productName,
            price: it.productId.price,
            quantity: it.quantity,
          }));
        setCartItems(items);
        if (items.length === 0) {
          // No items -> back to cart
          navigate('/cart');
        }
      } catch (e) {
        setCartError(e.message || 'Failed to load cart');
      } finally {
        setLoadingCart(false);
      }
    };
    load();
  }, [navigate]);

  const getSubtotal = () => cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const getTax = () => 0; // Tax disabled / not applied
  const getShipping = () => getSubtotal() > 5000 ? 0 : 800; // Example flat shipping in LKR
  const getTotal = () => getSubtotal() + getTax() + getShipping();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step < 2) {
      nextStep();
      return;
    }

    // SANDBOX: Create PayHere cart payment and redirect to checkout
    try {
      const customerData = {
        customerId: JSON.parse(localStorage.getItem('user'))?.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
        city: formData.city
      };

      // Enrich cart items with farmer and product info
      const cartData = await api.getCart();
      const enrichedCartItems = (cartData?.cart?.items || [])
        .filter(item => item.productId)
        .map(item => ({
          productId: item.productId._id || item.productId.id,
          productName: item.productId.productName,
          quantity: item.quantity,
          price: item.productId.price,
          farmerId: item.productId.farmer?._id || item.productId.farmer?.id,
          farmerEmail: item.productId.farmer?.email
        }));

      const totalAmount = enrichedCartItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
      if (totalAmount <= 0) throw new Error('Your cart is empty or invalid.');

      const resp = await api.post('/payments/cart-payment', {
        customerData,
        amount: totalAmount,
        currency: 'LKR',
        cartItems: enrichedCartItems
      });

      if (!resp.success || !resp.paymentData) {
        throw new Error(resp.error || 'Failed to prepare payment');
      }

      redirectToPayHere(resp.paymentData);
    } catch (err) {
      console.error('Payment creation failed:', err.message);
      if (err.status === 401 || err.status === 403) {
        alert('Your session expired. Please login again.');
        navigate('/login');
        return;
      }
      alert(err.message || 'Failed to process payment. Please try again.');
    }
  };

  const redirectToPayHere = (paymentData) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentData.sandbox
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';

    Object.keys(paymentData).forEach(key => {
      if (paymentData[key] !== undefined && paymentData[key] !== null) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = paymentData[key];
        form.appendChild(input);
      }
    });

    document.body.appendChild(form);
    form.submit();
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Checkout</h1>

        {loadingCart && (
          <div className="mb-6 text-gray-600">Loading your cart...</div>
        )}
        {cartError && (
          <div className="mb-6 text-red-600">{cartError}</div>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    step >= stepNumber
                      ? 'text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                  style={{
                    backgroundColor: step >= stepNumber ? '#51ac37' : undefined
                  }}
                >
                  {stepNumber}
                </div>
                <span className={`ml-2 ${step >= stepNumber ? 'text-green-600' : 'text-gray-600'}`}>
                  {stepNumber === 1 ? 'Delivery Details' : 'Review & Pay'}
                </span>
                {stepNumber < 2 && <div className="w-8 h-px bg-gray-300 mx-4"></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              {/* Step 1: Delivery Information */}
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Delivery Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{backgroundColor: '#51ac37'}}
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2: Review Order & Payment */}
              {step === 2 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Review Your Order</h2>
                  
                  {/* Order Items */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Order Items</h3>
                    <div className="space-y-3">
                      {cartItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-gray-600 ml-2">x{item.quantity}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Delivery Address</h3>
                    <div className="text-gray-600">
                      <p>{formData.firstName} {formData.lastName}</p>
                      <p>{formData.address}</p>
                      <p>{formData.city}, {formData.state} {formData.zipCode}</p>
                      <p>{formData.phone}</p>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions (Optional)</label>
                    <textarea
                      name="specialInstructions"
                      value={formData.specialInstructions}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Any special delivery instructions..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Payment Gateway Notice */}
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-lg font-medium text-green-800 mb-2">Secure Payment via PayHere</h4>
                    <p className="text-green-700 text-sm">
                      You will be redirected to PayHere sandbox to complete your payment securely.
                    </p>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                      style={{backgroundColor: '#51ac37'}}
                    >
                      Proceed to Payment
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(getSubtotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatCurrency(getTax())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span>{getShipping() === 0 ? 'Free' : formatCurrency(getShipping())}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span style={{color: '#51ac37'}}>{formatCurrency(getTotal())}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;