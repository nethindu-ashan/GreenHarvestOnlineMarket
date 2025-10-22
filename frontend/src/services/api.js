// API utility functions for connecting to backend

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  // Helper method to make HTTP requests
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authentication token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log('Making API request:', { url, method: config.method || 'GET' });
      const response = await fetch(url, config);
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', { status: response.status, text: errorText });
        let message = `Request failed (${response.status})`;
        if (errorText) {
          try {
            const parsed = JSON.parse(errorText);
            message = parsed?.message || message;
          } catch {
            message = errorText;
          }
        }
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      
      const result = await response.json();
      console.log('API response success:', result);
      return result;
    } catch (error) {
      console.error('API request failed:', { url, error: error.message });
      
      // Check if it's a network error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Failed to connect to server. Please check if the backend is running.');
      }
      
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // User Authentication Methods
  async login(credentials) {
    return this.post('/users/login', credentials);
  }

  async loginFarmer(credentials) {
    return this.post('/users/login', credentials);
  }

  async register(userData) {
    return this.post('/users/register', userData);
  }

  async resendVerification(email) {
    return this.post('/users/resend-verification', { email });
  }

  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('farmerUser');
    return Promise.resolve();
  }

  // Profile Methods
  async getCurrentUser() {
    return this.get('/users/me');
  }

  async updateProfile(profileData) {
    return this.put('/users/profile', profileData);
  }

  async deleteAccount() {
    return this.delete('/users/me');
  }

  // Password reset via OTP
  async requestPasswordOtp(email) {
    return this.post('/users/password/forgot', { email });
  }

  async resetPasswordWithOtp({ email, otp, newPassword }) {
    return this.post('/users/password/reset', { email, otp, newPassword });
  }

  // Product Methods
  async getProducts() {
    return this.get('/products');
  }

  async getProduct(id) {
    return this.get(`/products/${id}`);
  }

  async createProduct(productData) {
    return this.post('/products', productData);
  }

  async updateProduct(id, productData) {
    return this.put(`/products/${id}`, productData);
  }

  async deleteProduct(id) {
    return this.delete(`/products/${id}`);
  }

  // Farmer-specific product methods
  async getFarmerProducts() {
    // Use the dedicated farmer products endpoint
    return this.get('/products/farmer');
  }

  // Farmer subscription & approval workflow
  async paySubscription() {
    return this.post('/users/farmer/pay-subscription', {});
  }

  // Farmer KYC workflow
  async submitKyc(payload) {
    // payload: { nicFrontUrl, nicBackUrl, bank: { accountName, accountNumber, bankName, branch, swiftCode } }
    return this.post('/users/farmer/kyc', payload);
  }

  async listPendingFarmers() {
    return this.get('/users/admin/farmers/pending');
  }

  async approveFarmer(id) {
    return this.post(`/users/admin/farmers/${id}/approve`, {});
  }

  async declineFarmer(id, reason='') {
    return this.post(`/users/admin/farmers/${id}/decline`, { reason });
  }

  async approveKyc(farmerId) {
    return this.post(`/users/admin/farmers/${farmerId}/kyc/approve`, {});
  }

  async declineKyc(farmerId, reason='') {
    return this.post(`/users/admin/farmers/${farmerId}/kyc/decline`, { reason });
  }

  async listPendingKycs() {
    return this.get('/users/admin/farmers/pending-kyc');
  }

  // Admin dashboard stats
  async getAdminDashboardStats() {
    return this.get('/users/admin/dashboard-stats');
  }

  // Admin: list users
  async adminListUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/users/admin/users${query ? `?${query}` : ''}`);
  }

  // Admin: list orders (summary)
  async adminListOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/orders/admin/orders${query ? `?${query}` : ''}`);
  }

  // Utility system health (requires auth)
  async getSystemHealth() {
    return this.get('/utility/health');
  }

  // Cart Methods
  async getCart() {
    return this.get('/cart');
  }

  async addToCart(productId, quantity = 1) {
    return this.post('/cart/add', { productId, quantity });
  }

  async updateCartItem(productId, quantity) {
    // Backend expects PUT /cart/update with { productId, quantity }
    return this.put('/cart/update', { productId, quantity });
  }

  async removeFromCart(productId) {
    return this.delete(`/cart/remove/${productId}`);
  }

  async clearCart() {
    return this.delete('/cart/clear');
  }

  // Order Methods
  async getOrders() {
    return this.get('/orders');
  }

  async createOrder(orderData) {
    return this.post('/orders', orderData);
  }

  async getOrder(id) {
    return this.get(`/orders/${id}`);
  }

  async updateOrder(id, orderData) {
    return this.put(`/orders/${id}`, orderData);
  }

  // Farmer-specific order methods
  async getFarmerOrders() {
    return this.get('/orders/farmer');
  }

  async updateOrderItemStatus(orderId, productId, status) {
    return this.put('/orders/item-status', { orderId, productId, status });
  }

  async updateOrderStatus(orderId, status) {
    return this.put(`/orders/${orderId}/status`, { status });
  }

  // Review Methods
  async getReviews() {
    return this.get('/reviews');
  }
  async getMyReview() {
    return this.get('/reviews/me');
  }
  async saveMyReview(data) {
    // upsert via POST
    return this.post('/reviews/me', data);
  }
  async deleteMyReview() {
    return this.delete('/reviews/me');
  }

  // Promotion Methods
  async createPromotion(promotionData) {
    return this.post('/promotions', promotionData);
  }
  
  async getPromotion(id) {
    return this.get(`/promotions/${id}`);
  }
  
  async updatePromotion(id, promotionData) {
    return this.put(`/promotions/${id}`, promotionData);
  }
  
  async deletePromotion(id) {
    return this.delete(`/promotions/${id}`);
  }
  
  async getFarmerPromotions() {
    return this.get('/promotions/farmer');
  }
  
  async getActivePromotions() {
    return this.get('/promotions/active');
  }

  // Utility Methods
  async testConnection() {
    try {
      const response = await fetch(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');
      return await response.json();
    } catch (error) {
      console.error('Backend connection test failed:', error);
      throw error;
    }
  }
}

// Export a single instance
export default new ApiService();