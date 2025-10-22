// Notification system for farmers
class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
  }

  // Add a new notification
  addNotification(notification) {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      ...notification
    };
    this.notifications.unshift(newNotification);
    this.notifyListeners();
    return newNotification;
  }

  // Get all notifications
  getNotifications() {
    return this.notifications;
  }

  // Get unread notifications count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Subscribe to notification updates
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Check product alerts and create notifications
  checkProductAlerts(products) {
    const currentDate = new Date();
    const oneWeekFromNow = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    products.forEach(product => {
      // Check stock levels
      if (product.quantityInStock === 0) {
        this.addNotification({
          type: 'error',
          title: 'Out of Stock Alert',
          message: `${product.productName || product.name} is out of stock`,
          productId: product._id,
          action: 'restock'
        });
      } else if (product.quantityInStock <= 5) {
        this.addNotification({
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${product.productName || product.name} has only ${product.quantityInStock} units left`,
          productId: product._id,
          action: 'restock'
        });
      }

      // Check expiry dates
      if (product.expiryDate) {
        const expiryDate = new Date(product.expiryDate);
        if (expiryDate <= currentDate) {
          this.addNotification({
            type: 'error',
            title: 'Product Expired',
            message: `${product.productName || product.name} has expired`,
            productId: product._id,
            action: 'remove'
          });
        } else if (expiryDate <= oneWeekFromNow) {
          const daysUntilExpiry = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
          this.addNotification({
            type: 'warning',
            title: 'Expiry Alert',
            message: `${product.productName || product.name} expires in ${daysUntilExpiry} day(s)`,
            productId: product._id,
            action: 'update'
          });
        }
      }
    });
  }

  // Format notification time
  formatTime(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}

// Create a singleton instance
const notificationService = new NotificationService();

export default notificationService;