import htmlPdf from 'html-pdf-node';
import User from '../models/user.js';
import Order from '../models/order.js';
import CartOrder from '../models/cartOrder.js';
import Products from '../models/product.js';

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

// Helper function to format dates
const formatDate = (date, formatType = 'datetime') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  if (formatType === 'datetime') {
    return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour12: false });
  } else if (formatType === 'date') {
    return d.toLocaleDateString('en-GB');
  }
  return d.toISOString();
};

// Helper function to get date range
const getDateRange = (period) => {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30); // Default to last 30 days
  }

  return { startDate, endDate };
};

// Escape regex special chars
const escapeRegExp = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Generate PDF HTML template
const generatePDFTemplate = (title, content, reportType) => {
  const currentDate = formatDate(new Date(), 'datetime');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background: #fff;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #22c55e;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #22c55e;
          margin-bottom: 10px;
        }
        .company-info {
          color: #666;
          font-size: 14px;
        }
        .report-title {
          font-size: 24px;
          color: #1f2937;
          margin: 20px 0;
          text-align: center;
        }
        .report-meta {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 25px;
          border-left: 4px solid #22c55e;
        }
        .meta-item {
          margin-bottom: 5px;
          font-size: 14px;
        }
        .meta-label {
          font-weight: bold;
          color: #374151;
        }
        .content {
          margin-bottom: 30px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .table th {
          background: #22c55e;
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        .table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
        }
        .table tr:nth-child(even) {
          background: #f9fafb;
        }
        .table tr:hover {
          background: #f0f9ff;
        }
        .summary-card {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }
        .summary-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .summary-value {
          font-size: 28px;
          font-weight: bold;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }
        .stat-card {
          background: #f8fafc;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #22c55e;
        }
        .stat-title {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          font-style: italic;
        }
        .amount {
          font-weight: 600;
          color: #059669;
        }
        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .status.completed {
          background: #d1fae5;
          color: #065f46;
        }
        .status.pending {
          background: #fef3c7;
          color: #92400e;
        }
        .status.cancelled {
          background: #fee2e2;
          color: #991b1b;
        }
        @media print {
          .container {
            padding: 10px;
          }
          .table {
            font-size: 12px;
          }
          .table th,
          .table td {
            padding: 8px 6px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🌱 GreenHarvest</div>
          <div class="company-info">
            Fresh Farm Products Marketplace<br>
            Connecting Farmers with Customers
          </div>
        </div>
        
        <h1 class="report-title">${title}</h1>
        
        <div class="report-meta">
          <div class="meta-item">
            <span class="meta-label">Generated:</span> ${currentDate}
          </div>
          <div class="meta-item">
            <span class="meta-label">Report Type:</span> ${reportType}
          </div>
        </div>
        
        <div class="content">
          ${content}
        </div>
        
        <div class="footer">
          <p>This report was generated automatically by GreenHarvest system.</p>
          <p>For support, contact us at support@greenharvest.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Customer Payment Summary Report
export const generateCustomerPaymentReport = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { period = 'month', startDate: customStartDate, endDate: customEndDate } = req.query;
    
    // Build inclusive date filters for both collections
    let cartDateFilter = {};
    let orderDateFilter = {};
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate); start.setHours(0,0,0,0);
      const end = new Date(customEndDate); end.setHours(23,59,59,999);
      cartDateFilter = { createdAt: { $gte: start, $lte: end } };
      orderDateFilter = { date: { $gte: start, $lte: end } };
    } else {
      const { startDate, endDate } = getDateRange(period);
      cartDateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
      orderDateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    // Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Case-insensitive email match (Order/CartOrder store email not userId)
    const emailRegex = new RegExp('^' + escapeRegExp(user.email || '') + '$', 'i');

    // Fetch orders from both collections using correct fields
    const [orders, cartOrders] = await Promise.all([
      Order.find({ 
        email: emailRegex,
        ...orderDateFilter,
        paymentDone: true
      }).sort({ date: -1 }).lean(),
      CartOrder.find({ 
        customerEmail: emailRegex,
        ...cartDateFilter,
        paymentStatus: { $in: ['completed', 'paid'] }
      }).sort({ createdAt: -1 }).lean()
    ]);

    const allOrders = [
      ...orders.map(o => ({
        type: 'order',
        id: o.orderId || o._id?.toString(),
        date: o.date,
        amount: (o.orderedItems || []).reduce((s,i) => s + (i.price || 0) * (i.quantity || 0), 0),
        method: 'N/A',
        status: o.paymentDone ? 'completed' : 'pending'
      })),
      ...cartOrders.map(o => ({
        type: 'cart',
        id: o.orderId || o._id?.toString(),
        date: o.createdAt,
        amount: o.totalAmount || 0,
        method: o.paymentMethod || 'payhere',
        status: o.paymentStatus
      }))
    ].sort((a,b) => new Date(b.date) - new Date(a.date));

    // Calculate summary statistics
  const totalAmount = allOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const totalOrders = allOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;
    
    // Payment method breakdown
    const paymentMethods = allOrders.reduce((acc, order) => {
      const method = order.method || 'Unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    // Generate statistics HTML
    const statsHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">Total Orders</div>
          <div class="stat-value">${totalOrders}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Total Amount</div>
          <div class="stat-value">${formatCurrency(totalAmount)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Average Order Value</div>
          <div class="stat-value">${formatCurrency(avgOrderValue)}</div>
        </div>
      </div>
    `;

    // Generate payment methods HTML
    const paymentMethodsHTML = Object.keys(paymentMethods).length > 0 ? `
      <h3 style="margin-bottom: 15px; color: #374151;">Payment Methods Breakdown</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Payment Method</th>
            <th>Number of Orders</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(paymentMethods).map(([method, count]) => `
            <tr>
              <td>${method}</td>
              <td>${count}</td>
              <td>${((count / totalOrders) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    // Generate orders table HTML
    const ordersHTML = allOrders.length > 0 ? `
      <h3 style="margin-bottom: 15px; color: #374151;">Payment History</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Payment Method</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${allOrders.map(order => `
            <tr>
              <td>${(order.id || '').toString().slice(-6)}</td>
              <td>${formatDate(order.date, 'datetime')}</td>
              <td class="amount">${formatCurrency(order.amount)}</td>
              <td>${order.method || 'N/A'}</td>
              <td><span class="status ${order.status}">${order.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="no-data">No payment records found for the selected period.</div>';

    const content = statsHTML + paymentMethodsHTML + ordersHTML;
    const html = generatePDFTemplate(
      `Payment Summary Report - ${user.firstName} ${user.lastName}`,
      content,
      'Customer Payment Summary'
    );

    // Generate PDF
    const options = { 
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' }
    };

    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);

      res.type('pdf');
      res.set('Content-Disposition', `attachment; filename="payment-summary-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating customer payment report:', error);
    res.status(500).json({ error: 'Failed to generate payment report' });
  }
};

// Farmer Earnings Report
export const generateFarmerEarningsReport = async (req, res) => {
  try {
    const farmerId = req.user.userId || req.user.id;
    const { period = 'month', startDate: customStartDate, endDate: customEndDate } = req.query;

    // Check if user is a farmer
    if (req.user.type !== 'farmer') {
      return res.status(403).json({ error: 'Access denied. Only farmers can access earnings reports.' });
    }
    
    let cartDateFilter = {};
    let orderDateFilter = {};
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate); start.setHours(0,0,0,0);
      const end = new Date(customEndDate); end.setHours(23,59,59,999);
      cartDateFilter = { createdAt: { $gte: start, $lte: end } };
      orderDateFilter = { date: { $gte: start, $lte: end } };
    } else {
      const { startDate, endDate } = getDateRange(period);
      cartDateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
      orderDateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    // Fetch farmer details
    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    // Fetch farmer's products
  // Products owned by this farmer (owner field)
  const products = await Products.find({ owner: farmerId }).lean();
  const myMongoIds = new Set(products.map(p => p._id?.toString()));
  const myProductIds = new Set(products.map(p => p.productId));
  const myProductNames = new Set(products.map(p => p.productName));

    // Fetch orders containing farmer's products
    const [orders, cartOrders] = await Promise.all([
      // Note: legacy Order model doesn't link items to farmer, skip it as attribution isn't possible
      Order.find({ ...orderDateFilter, paymentDone: true }).sort({ date: -1 }).lean(),
      CartOrder.find({ ...cartDateFilter, paymentStatus: { $in: ['completed', 'paid'] } }).sort({ createdAt: -1 }).lean()
    ]);
    const allOrders = cartOrders; // only CartOrder has productId/name for attribution

    // Calculate earnings from farmer's products
    let totalEarnings = 0;
    let totalQuantitySold = 0;
    let orderDetails = [];
    const productSales = {};

    allOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const belongs = (item.productId && (myMongoIds.has(item.productId) || myProductIds.has(item.productId))) || (item.productName && myProductNames.has(item.productName));
        if (!belongs) return;
        const earnings = (item.price || 0) * (item.quantity || 0);
        totalEarnings += earnings;
        totalQuantitySold += item.quantity || 0;

        const productKey = item.productId || item.productName;
        if (!productSales[productKey]) {
          productSales[productKey] = {
            productName: item.productName || item.name || 'Unknown Product',
            quantity: 0,
            earnings: 0,
            orders: 0
          };
        }
        productSales[productKey].quantity += item.quantity || 0;
        productSales[productKey].earnings += earnings;
        productSales[productKey].orders += 1;

        orderDetails.push({
          orderId: order.orderId || order._id?.toString().slice(-6),
          date: order.createdAt,
          productName: item.productName || item.name || 'Unknown Product',
          quantity: item.quantity || 0,
          price: item.price || 0,
          earnings
        });
      });
    });

    // Sort order details by date
    orderDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

    const avgOrderValue = orderDetails.length > 0 ? totalEarnings / orderDetails.length : 0;
    const activeProducts = Object.keys(productSales).length;

    // Generate statistics HTML
    const statsHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">Total Earnings</div>
          <div class="stat-value">${formatCurrency(totalEarnings)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Products Sold</div>
          <div class="stat-value">${totalQuantitySold}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Active Products</div>
          <div class="stat-value">${activeProducts}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Average Sale Value</div>
          <div class="stat-value">${formatCurrency(avgOrderValue)}</div>
        </div>
      </div>
    `;

    // Generate product performance HTML
    const productPerformanceHTML = Object.keys(productSales).length > 0 ? `
      <h3 style="margin-bottom: 15px; color: #374151;">Product Performance</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Quantity Sold</th>
            <th>Total Earnings</th>
            <th>Orders</th>
            <th>Avg. Price</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(productSales).map(([productId, data]) => `
            <tr>
              <td>${data.productName}</td>
              <td>${data.quantity}</td>
              <td class="amount">${formatCurrency(data.earnings)}</td>
              <td>${data.orders}</td>
              <td class="amount">${formatCurrency(data.earnings / data.quantity)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    // Generate sales history HTML
    const salesHistoryHTML = orderDetails.length > 0 ? `
      <h3 style="margin-bottom: 15px; color: #374151;">Sales History</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price per Unit</th>
            <th>Earnings</th>
          </tr>
        </thead>
        <tbody>
          ${orderDetails.slice(0, 50).map(detail => `
            <tr>
              <td>${detail.orderId}</td>
              <td>${formatDate(detail.date, 'datetime')}</td>
              <td>${detail.productName}</td>
              <td>${detail.quantity}</td>
              <td class="amount">${formatCurrency(detail.price)}</td>
              <td class="amount">${formatCurrency(detail.earnings)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${orderDetails.length > 50 ? `<p style="text-align: center; margin-top: 10px; color: #6b7280; font-style: italic;">Showing latest 50 transactions of ${orderDetails.length} total</p>` : ''}
    ` : '<div class="no-data">No sales records found for the selected period.</div>';

    const content = statsHTML + productPerformanceHTML + salesHistoryHTML;
    const html = generatePDFTemplate(
      `Earnings Report - ${farmer.firstName} ${farmer.lastName}`,
      content,
      'Farmer Earnings Report'
    );

    // Generate PDF
    const options = { 
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' }
    };

    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    res.type('pdf');
    res.set('Content-Disposition', `attachment; filename="earnings-report-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating farmer earnings report:', error);
    res.status(500).json({ error: 'Failed to generate earnings report' });
  }
};

// Admin User Activity Report
export const generateAdminUserActivityReport = async (req, res) => {
  try {
    const { period = 'month', startDate: customStartDate, endDate: customEndDate } = req.query;

    // Check if user is an admin
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only admins can access user activity reports.' });
    }
    
    let dateFilter = {};
    if (customStartDate && customEndDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(customStartDate),
          $lte: new Date(customEndDate)
        }
      };
    } else {
      const { startDate, endDate } = getDateRange(period);
      dateFilter = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // Fetch user statistics
    const [
      totalUsers,
      totalFarmers,
      totalCustomers,
      newUsers,
      verifiedUsers,
      kycApprovedFarmers,
      totalOrders,
      completedOrders,
      totalProducts,
      activeProducts
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ type: 'farmer' }),
      User.countDocuments({ type: 'customer' }),
      User.countDocuments(dateFilter),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ type: 'farmer', kycStatus: 'approved' }),
      Order.countDocuments({}),
      Order.countDocuments({ paymentStatus: { $in: ['completed', 'paid'] } }),
      Products.countDocuments({}),
      Products.countDocuments({ inStock: true })
    ]);

    // Fetch recent registrations
    const recentUsers = await User.find(dateFilter)
      .select('firstName lastName email type createdAt isVerified kycStatus')
      .sort({ createdAt: -1 })
      .limit(20);

    // Fetch order statistics for the period
    const orderStats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    const periodRevenue = orderStats[0]?.totalRevenue || 0;
    const periodOrders = orderStats[0]?.totalOrders || 0;
    const avgOrderValue = orderStats[0]?.averageOrderValue || 0;

    // Calculate engagement rates
    const farmerEngagementRate = totalFarmers > 0 ? (kycApprovedFarmers / totalFarmers * 100) : 0;
    const orderCompletionRate = totalOrders > 0 ? (completedOrders / totalOrders * 100) : 0;
    const verificationRate = totalUsers > 0 ? (verifiedUsers / totalUsers * 100) : 0;

    // Generate overview statistics HTML
    const overviewHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">Total Users</div>
          <div class="stat-value">${totalUsers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Farmers</div>
          <div class="stat-value">${totalFarmers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Customers</div>
          <div class="stat-value">${totalCustomers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">New Users (Period)</div>
          <div class="stat-value">${newUsers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Total Orders</div>
          <div class="stat-value">${totalOrders}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Period Revenue</div>
          <div class="stat-value">${formatCurrency(periodRevenue)}</div>
        </div>
      </div>
    `;

    // Generate engagement statistics HTML
    const engagementHTML = `
      <h3 style="margin-bottom: 15px; color: #374151;">Engagement Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">Verification Rate</div>
          <div class="stat-value">${verificationRate.toFixed(1)}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Farmer KYC Approval</div>
          <div class="stat-value">${farmerEngagementRate.toFixed(1)}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Order Completion Rate</div>
          <div class="stat-value">${orderCompletionRate.toFixed(1)}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Active Products</div>
          <div class="stat-value">${activeProducts} / ${totalProducts}</div>
        </div>
      </div>
    `;

    // Generate recent users HTML
    const recentUsersHTML = recentUsers.length > 0 ? `
      <h3 style="margin-bottom: 15px; color: #374151;">Recent Registrations</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Type</th>
            <th>Registration Date</th>
            <th>Verified</th>
            <th>KYC Status</th>
          </tr>
        </thead>
        <tbody>
          ${recentUsers.map(user => `
            <tr>
              <td>${user.firstName} ${user.lastName}</td>
              <td>${user.email}</td>
              <td style="text-transform: capitalize;">${user.type}</td>
              <td>${formatDate(user.createdAt, 'datetime')}</td>
              <td><span class="status ${user.isVerified ? 'completed' : 'pending'}">${user.isVerified ? 'Yes' : 'No'}</span></td>
              <td><span class="status ${user.kycStatus || 'pending'}">${user.kycStatus || 'N/A'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="no-data">No new registrations found for the selected period.</div>';

    const content = overviewHTML + engagementHTML + recentUsersHTML;
    const html = generatePDFTemplate(
      'User Activity & System Report',
      content,
      'Admin User Activity Report'
    );

    // Generate PDF
    const options = { 
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' }
    };

    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    res.type('pdf');
    res.set('Content-Disposition', `attachment; filename="user-activity-report-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating admin user activity report:', error);
    res.status(500).json({ error: 'Failed to generate user activity report' });
  }
};

// Customer Invoice PDF by orderId
export const generateCustomerInvoice = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { orderId } = req.params;

    // Try to find in both orders and cartorders
    // 'Order' model uses fields: orderId, orderedItems, name, email, address, phone, date, paymentDone
    // 'CartOrder' model uses fields: orderId, items, customerName, customerEmail, address, phoneNumber, createdAt, paymentStatus
    let order = await CartOrder.findOne({ orderId });
    let source = 'cart';
    if (!order) {
      order = await Order.findOne({ orderId });
      source = 'order';
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Authorization: ensure the token email matches order email/customerEmail
    const user = await User.findById(userId).lean();
    const orderEmail = source === 'cart' ? order.customerEmail : order.email;
    if (!user || (user.email && orderEmail && user.email.toLowerCase() !== orderEmail.toLowerCase())) {
      return res.status(403).json({ error: 'Access denied for this invoice' });
    }

    // Normalize fields
    const buyer = {
      name: source === 'cart' ? order.customerName : order.name,
      email: orderEmail,
      address: source === 'cart' ? `${order.address}${order.city ? ', ' + order.city : ''}` : order.address,
      phone: source === 'cart' ? order.phoneNumber : order.phone,
    };
    const createdAt = source === 'cart' ? (order.createdAt || new Date()) : (order.date || new Date());
    const paymentStatus = source === 'cart' ? order.paymentStatus : (order.paymentDone ? 'completed' : 'pending');
    const items = source === 'cart' ? order.items.map(i => ({
      name: i.productName,
      quantity: i.quantity,
      price: i.price,
      total: i.totalPrice,
    })) : order.orderedItems.map(i => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      total: i.price * i.quantity,
    }));
    const subtotal = source === 'cart' ? order.subtotal : items.reduce((s,i)=>s+(i.total||0),0);
    const tax = source === 'cart' ? (order.tax || 0) : 0;
    const shipping = source === 'cart' ? (order.shipping || 0) : 0;
    const totalAmount = source === 'cart' ? order.totalAmount : (subtotal + tax + shipping);

    // Build invoice HTML content using same style
    const headerHTML = `
      <div class="stats-grid" style="margin-bottom: 10px;">
        <div class="stat-card">
          <div class="stat-title">Invoice No</div>
          <div class="stat-value">INV-${orderId}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Order ID</div>
          <div class="stat-value">${orderId}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Date</div>
          <div class="stat-value">${formatDate(createdAt, 'datetime')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Payment Status</div>
          <div class="stat-value">${paymentStatus}</div>
        </div>
      </div>`;

    const buyerHTML = `
      <h3 style="margin-bottom: 10px; color: #374151;">Billed To</h3>
      <table class="table">
        <tbody>
          <tr><td>Name</td><td>${buyer.name || ''}</td></tr>
          <tr><td>Email</td><td>${buyer.email || ''}</td></tr>
          <tr><td>Phone</td><td>${buyer.phone || ''}</td></tr>
          <tr><td>Address</td><td>${buyer.address || ''}</td></tr>
        </tbody>
      </table>`;

    const itemsHTML = `
      <h3 style="margin: 15px 0; color: #374151;">Items</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr>
              <td>${it.name}</td>
              <td>${it.quantity}</td>
              <td class="amount">${formatCurrency(it.price)}</td>
              <td class="amount">${formatCurrency(it.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    const totalsHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-title">Subtotal</div><div class="stat-value">${formatCurrency(subtotal)}</div></div>
        <div class="stat-card"><div class="stat-title">Tax</div><div class="stat-value">${formatCurrency(tax)}</div></div>
        <div class="stat-card"><div class="stat-title">Shipping</div><div class="stat-value">${formatCurrency(shipping)}</div></div>
        <div class="stat-card"><div class="stat-title">Grand Total</div><div class="stat-value">${formatCurrency(totalAmount)}</div></div>
      </div>`;

    const content = headerHTML + buyerHTML + itemsHTML + totalsHTML;
    const html = generatePDFTemplate(
      `Invoice`,
      content,
      'Customer Invoice'
    );

    // Generate PDF
    const options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' }
    };
    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    res.type('pdf');
    res.set('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

// Customer Purchased Products Report (aggregated by product)
export const generateCustomerPurchasedProductsReport = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { period = 'month', startDate: customStartDate, endDate: customEndDate } = req.query;

    // Resolve date filter
    let dateFilter = {};
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0,0,0,0);
      const end = new Date(customEndDate);
      end.setHours(23,59,59,999);
      dateFilter = { $gte: start, $lte: end };
    } else {
      const { startDate, endDate } = getDateRange(period);
      dateFilter = { $gte: startDate, $lte: endDate };
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const emailRegex = new RegExp('^' + escapeRegExp(user.email || '') + '$', 'i');

    // Fetch purchased items from CartOrder and Order
    const cartOrders = await CartOrder.find({
      customerEmail: emailRegex,
      createdAt: dateFilter,
      paymentStatus: { $in: ['completed', 'paid', 'pending'] }
    }).lean();

    const simpleOrders = await Order.find({
      email: emailRegex,
      date: dateFilter,
      $or: [
        { paymentDone: true },
        { status: 'pending' }
      ]
    }).lean();

    // Collect items
    const items = [];
    for (const co of cartOrders) {
      for (const it of (co.items || [])) {
        items.push({
          key: it.productId || it.productName,
          name: it.productName,
          quantity: it.quantity || 0,
          price: it.price || 0,
          total: it.totalPrice || ((it.price || 0) * (it.quantity || 0))
        });
      }
    }
    for (const so of simpleOrders) {
      for (const it of (so.orderedItems || [])) {
        items.push({
          key: it.name,
          name: it.name,
          quantity: it.quantity || 0,
          price: it.price || 0,
          total: (it.price || 0) * (it.quantity || 0)
        });
      }
    }

    // Aggregate by product name/key
    const aggMap = new Map();
    for (const it of items) {
      const k = it.key || it.name;
      const prev = aggMap.get(k) || { name: it.name, quantity: 0, revenue: 0, unitTotal: 0, unitCount: 0, orders: 0 };
      prev.name = it.name || prev.name;
      prev.quantity += it.quantity || 0;
      prev.revenue += it.total || 0;
      prev.unitTotal += (it.price || 0);
      prev.unitCount += 1;
      prev.orders += 1;
      aggMap.set(k, prev);
    }

    const aggregated = Array.from(aggMap.values()).sort((a,b)=> b.revenue - a.revenue);
    const totalQty = aggregated.reduce((s,a)=>s+a.quantity,0);
    const totalRevenue = aggregated.reduce((s,a)=>s+a.revenue,0);

    const summaryHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-title">Total Products</div><div class="stat-value">${aggregated.length}</div></div>
        <div class="stat-card"><div class="stat-title">Total Quantity</div><div class="stat-value">${totalQty}</div></div>
        <div class="stat-card"><div class="stat-title">Total Spent</div><div class="stat-value">${formatCurrency(totalRevenue)}</div></div>
      </div>`;

    const tableHTML = aggregated.length > 0 ? `
      <h3 style="margin-bottom: 15px; color: #374151;">Purchased Products</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Avg Unit Price</th>
            <th>Total Spent</th>
          </tr>
        </thead>
        <tbody>
          ${aggregated.map(p => `
            <tr>
              <td>${p.name}</td>
              <td>${p.quantity}</td>
              <td class="amount">${formatCurrency(p.unitCount ? p.unitTotal / p.unitCount : 0)}</td>
              <td class="amount">${formatCurrency(p.revenue)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="no-data">No purchased products found for the selected period.</div>';

    const html = generatePDFTemplate(
      `Purchased Products Report - ${user.firstName} ${user.lastName}`,
      summaryHTML + tableHTML,
      'Customer Purchased Products'
    );

    const options = { format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' } };
    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    res.type('pdf');
    res.set('Content-Disposition', `attachment; filename="purchased-products-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    console.error('Error generating customer purchased products report:', e);
    res.status(500).json({ error: 'Failed to generate purchased products report' });
  }
};

// Farmer Sold Products Report (aggregated by product)
export const generateFarmerSoldProductsReport = async (req, res) => {
  try {
    const farmerId = req.user.userId || req.user.id;
    const { period = 'month', startDate: customStartDate, endDate: customEndDate } = req.query;

    // Date range
    let dateFilter = {};
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0,0,0,0);
      const end = new Date(customEndDate);
      end.setHours(23,59,59,999);
      dateFilter = { $gte: start, $lte: end };
    } else {
      const { startDate, endDate } = getDateRange(period);
      dateFilter = { $gte: startDate, $lte: endDate };
    }

    // Fetch farmer products
  const myProducts = await Products.find({ owner: farmerId }).lean();
  const myMongoIds = new Set(myProducts.map(p => p._id?.toString()));
  const myProductIds = new Set(myProducts.map(p => p.productId));
  const myProductNames = new Set(myProducts.map(p => p.productName));

    // Get completed cart orders in period
    const cartOrders = await CartOrder.find({
      createdAt: dateFilter,
      paymentStatus: { $in: ['completed', 'paid', 'pending'] }
    }).lean();

    // Aggregate items that belong to this farmer
    const aggMap = new Map();
    for (const co of cartOrders) {
      for (const it of (co.items || [])) {
        const belongs = (it.productId && (myMongoIds.has(it.productId) || myProductIds.has(it.productId))) || (it.productName && myProductNames.has(it.productName));
        if (!belongs) continue;
        const key = it.productId || it.productName;
        const prev = aggMap.get(key) || { name: it.productName, quantity: 0, revenue: 0, unitTotal: 0, unitCount: 0, orders: 0 };
        prev.name = it.productName || prev.name;
        prev.quantity += it.quantity || 0;
        const total = it.totalPrice != null ? it.totalPrice : (it.price || 0) * (it.quantity || 0);
        prev.revenue += total;
        prev.unitTotal += (it.price || 0);
        prev.unitCount += 1;
        prev.orders += 1;
        aggMap.set(key, prev);
      }
    }

    const aggregated = Array.from(aggMap.values()).sort((a,b)=> b.revenue - a.revenue);
    const totalQty = aggregated.reduce((s,a)=>s+a.quantity,0);
    const totalRevenue = aggregated.reduce((s,a)=>s+a.revenue,0);

    const summaryHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-title">Products Sold</div><div class="stat-value">${aggregated.length}</div></div>
        <div class="stat-card"><div class="stat-title">Total Quantity</div><div class="stat-value">${totalQty}</div></div>
        <div class="stat-card"><div class="stat-title">Total Revenue</div><div class="stat-value">${formatCurrency(totalRevenue)}</div></div>
      </div>`;

    const tableHTML = aggregated.length > 0 ? `
      <h3 style="margin-bottom: 15px; color: #374151;">Sold Products</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Avg Unit Price</th>
            <th>Total Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${aggregated.map(p => `
            <tr>
              <td>${p.name}</td>
              <td>${p.quantity}</td>
              <td class="amount">${formatCurrency(p.unitCount ? p.unitTotal / p.unitCount : 0)}</td>
              <td class="amount">${formatCurrency(p.revenue)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="no-data">No sold products found for the selected period.</div>';

    const html = generatePDFTemplate(
      'Sold Products Report',
      summaryHTML + tableHTML,
      'Farmer Sold Products'
    );

    const options = { format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' } };
    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    res.type('pdf');
    res.set('Content-Disposition', `attachment; filename="sold-products-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    console.error('Error generating farmer sold products report:', e);
    res.status(500).json({ error: 'Failed to generate sold products report' });
  }
};