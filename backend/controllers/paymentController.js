import User from '../models/user.js';
import FarmerSubscription from '../models/farmerSubscription.js';
import CartOrder from '../models/cartOrder.js';
import Order from '../models/order.js';
import FoodSubscription from '../models/Subscription.js';
import FoodSubscriptionLog from '../models/SubscriptionLog.js';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';

export const payhereConfig = {
  merchantId: process.env.PAYHERE_MERCHANT_ID?.trim(),
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET?.trim(),
  appId: process.env.PAYHERE_APP_ID?.trim(),
  appSecret: process.env.PAYHERE_APP_SECRET?.trim(),
  mode: process.env.PAYHERE_MODE?.trim() || 'sandbox',
  returnUrl: process.env.PAYHERE_RETURN_URL?.trim() || 'http://localhost:5173/farmer/subscription-success',
  customerReturnUrl: process.env.PAYHERE_CUSTOMER_RETURN_URL?.trim() || 'http://localhost:5173/payment-success',
  cancelUrl: process.env.PAYHERE_CANCEL_URL?.trim() || 'http://localhost:5173/farmer/subscription-cancelled',
  customerCancelUrl: process.env.PAYHERE_CUSTOMER_CANCEL_URL?.trim() || 'http://localhost:5173/payment-cancel',
  // Must point to the mounted payments router: /api/payments/payhere-notify
  notifyUrl: process.env.PAYHERE_NOTIFY_URL?.trim() || 'http://localhost:5002/api/payments/payhere-notify',
  
  apiBaseUrl: process.env.PAYHERE_MODE === 'live'
    ? 'https://www.payhere.lk/pay/api'
    : 'https://sandbox.payhere.lk/pay/api'
};

// Helper: determine if running in sandbox mode for PayHere
const isSandboxMode = () => {
  try {
    return (process.env.PAYMENT_MODE || process.env.PAYHERE_MODE || '').toLowerCase() === 'sandbox';
  } catch {
    return true; // default to sandbox in development
  }
};

// Validate PayHere Configuration
export const validatePayHereConfig = () => {
  const issues = [];
  
  if (!payhereConfig.merchantId) issues.push('Missing PAYHERE_MERCHANT_ID');
  if (!payhereConfig.merchantSecret) issues.push('Missing PAYHERE_MERCHANT_SECRET');

  if (issues.length > 0) {
    console.error('PayHere Configuration Issues:', issues);
    return false;
  }

  console.log('PayHere configuration validated successfully');
  console.log(`Mode: ${payhereConfig.mode}`);
  console.log(`Merchant ID: ${payhereConfig.merchantId}`);
  return true;
};

validatePayHereConfig();

export const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const amountFormatted = parseFloat(amount).toFixed(2);
  const hashString = `${merchantId}${orderId}${amountFormatted}${currency}${hashedSecret}`;
  return crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
};

// For recurring payments (using CryptoJS)
export const generateRecurringPayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  try {
    const cleanMerchantId = merchantId.toString().trim();
    const cleanOrderId = orderId.toString().trim();
    const cleanAmount = parseFloat(amount).toFixed(2);
    const cleanCurrency = currency.toString().toUpperCase().trim();
    const cleanSecret = merchantSecret.toString().trim();

    const secretHash = CryptoJS.MD5(cleanSecret).toString().toUpperCase();
    const hashString = cleanMerchantId + cleanOrderId + cleanAmount + cleanCurrency + secretHash;
    const finalHash = CryptoJS.MD5(hashString).toString().toUpperCase();
    
    return finalHash;
  } catch (error) {
    console.error('Recurring hash generation failed:', error);
    throw error;
  }
};

// Hash verification for notifications
export const verifyPayHereHash = (data, merchantSecret) => {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig
  } = data;

  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const amountFormatted = parseFloat(payhere_amount).toFixed(2);
  const hashString = `${merchant_id}${order_id}${amountFormatted}${payhere_currency}${status_code}${hashedSecret}`;
  const localHash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

  return localHash === md5sig.toUpperCase();
};

export const handleCartPaymentNotification = async (notificationData) => {
  try {
    const {
      order_id,
      payment_id,
      payhere_amount,
      status_code,
      status_message
    } = notificationData;

    console.log('Processing one-time cart payment notification:', {
      orderId: order_id,
      paymentId: payment_id,
      statusCode: status_code
    });

    const order = await CartOrder.findOne({ payhereOrderId: order_id });

    if (!order) {
      console.error('Cart order not found:', order_id);
      return;
    }

    if (status_code === '2') {
      console.log('Cart payment successful');
      
      order.paymentStatus = 'completed';
      order.orderStatus = 'confirmed';
      order.payherePaymentId = payment_id;
      order.updatedAt = new Date();
      
      await order.save();
      
      console.log('Cart order updated successfully:', {
        orderId: order.orderId,
        status: order.paymentStatus
      });
      
    } else {
      console.log('Cart payment failed:', status_message);
      
      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      order.updatedAt = new Date();
      
      await order.save();
    }

  } catch (error) {
    console.error('Failed to handle cart payment notification:', error);
  }
};

// Handle initial food subscription payment
export const handleInitialFoodPaymentWithRecurring = async (notificationData) => {
  try {
    const {
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      email,
      custom_1,
      custom_2,
      recurring_token,
      next_occurrence_date
    } = notificationData;

    const planId = custom_1?.replace('plan_', '') || 'food_premium';
    const isRecurring = custom_2 === 'food_monthly_recurring';

    console.log('Processing initial food payment:', {
      orderId: order_id,
      paymentId: payment_id,
      amount: payhere_amount,
      hasRecurringToken: !!recurring_token,
      isRecurring
    });

    const existingSubscription = await FoodSubscription.findOne({ payhereOrderId: order_id });

    if (existingSubscription) {
      console.log('Updating existing food subscription with recurring data...');

      if (isRecurring && recurring_token) {
        existingSubscription.payhereRecurringToken = recurring_token;
        existingSubscription.payherePaymentId = payment_id;
        existingSubscription.autoRenew = true;
        existingSubscription.status = 'active';
        existingSubscription.nextBillingDate = next_occurrence_date ?
          new Date(next_occurrence_date) :
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        existingSubscription.updatedAt = new Date();

        await existingSubscription.save();
        console.log('Existing food subscription updated with auto-renewal');
      }
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const nextBillingDate = isRecurring && recurring_token ?
      (next_occurrence_date ? new Date(next_occurrence_date) : endDate) :
      null;

    const subscription = new FoodSubscription({
      userEmail: email || 'customer@example.com',
      customerName: 'Food Subscriber',
      phoneNumber: '0771234567',
      address: 'Colombo, Sri Lanka',
      planId: planId,
      planName: 'Premium Food Subscription',
      status: 'active',
      amount: parseFloat(payhere_amount),
      currency: payhere_currency,
      billingCycle: 'monthly',
      paymentMethod: 'payhere',
      payhereOrderId: order_id,
      payherePaymentId: payment_id,
      payhereRecurringToken: recurring_token,
      autoRenew: isRecurring && !!recurring_token,
      startDate: startDate,
      endDate: endDate,
      nextBillingDate: nextBillingDate,
      renewalAttempts: 0,
      maxRenewalAttempts: 3,
      renewalHistory: [{
        renewalDate: startDate,
        amount: parseFloat(payhere_amount),
        status: 'success',
        paymentId: payment_id,
        attempt: 1,
        payhereToken: recurring_token
      }]
    });

    await subscription.save();

    await FoodSubscriptionLog.create({
      subscriptionId: subscription._id,
      userEmail: subscription.userEmail,
      action: 'created',
      details: {
        paymentId: payment_id,
        amount: parseFloat(payhere_amount),
        currency: payhere_currency,
        autoRenewal: subscription.autoRenew,
        recurringToken: !!recurring_token,
        payhereToken: recurring_token
      }
    });

    console.log('New food subscription created with auto-renewal:', {
      id: subscription._id,
      autoRenew: subscription.autoRenew,
      nextBilling: subscription.nextBillingDate,
      hasRecurringToken: !!subscription.payhereRecurringToken
    });

  } catch (error) {
    console.error('Failed to handle initial food payment with recurring:', error);
  }
};

// Handle recurring food subscription payment
export const handleRecurringFoodPayment = async (notificationData) => {
  try {
    const {
      subscription_id,
      payment_id,
      payhere_amount,
      status_code,
      email,
      next_occurrence_date
    } = notificationData;

    console.log('Processing recurring food payment:', { subscription_id, status_code });

    const subscription = await FoodSubscription.findOne({
      $or: [
        { payhereRecurringToken: subscription_id },
        { userEmail: email?.toLowerCase().trim() }
      ],
      autoRenew: true
    }).sort({ createdAt: -1 });

    if (!subscription) {
      console.error('Food subscription not found for recurring payment');
      return;
    }

    if (status_code === '2') {
      console.log('Recurring food payment successful');

      const currentEndDate = new Date(subscription.endDate);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      subscription.status = 'active';
      subscription.endDate = newEndDate;
      subscription.nextBillingDate = next_occurrence_date ?
        new Date(next_occurrence_date) : newEndDate;
      subscription.renewalAttempts = 0;
      subscription.paymentFailure = false;
      subscription.updatedAt = new Date();

      subscription.renewalHistory.push({
        renewalDate: new Date(),
        amount: parseFloat(payhere_amount),
        status: 'success',
        paymentId: payment_id,
        attempt: subscription.renewalAttempts + 1,
        payhereToken: subscription.payhereRecurringToken
      });

      await subscription.save();

      await FoodSubscriptionLog.create({
        subscriptionId: subscription._id,
        userEmail: subscription.userEmail,
        action: 'renewed',
        details: {
          paymentId: payment_id,
          amount: parseFloat(payhere_amount),
          currency: 'LKR',
          payhereToken: subscription.payhereRecurringToken
        }
      });

      console.log('Food subscription renewed with new end date:', {
        oldEndDate: currentEndDate.toISOString(),
        newEndDate: newEndDate.toISOString(),
        nextBilling: subscription.nextBillingDate.toISOString()
      });

    } else {
      console.log('Recurring food payment failed');

      subscription.renewalAttempts += 1;
      subscription.paymentFailure = true;
      subscription.lastPaymentFailureDate = new Date();
      subscription.status = subscription.renewalAttempts >= subscription.maxRenewalAttempts ?
        'cancelled' : 'pending_renewal';

      subscription.renewalHistory.push({
        renewalDate: new Date(),
        amount: parseFloat(payhere_amount),
        status: 'failed',
        failureReason: `Payment failed with status code: ${status_code}`,
        attempt: subscription.renewalAttempts,
        payhereToken: subscription.payhereRecurringToken
      });

      if (subscription.renewalAttempts >= subscription.maxRenewalAttempts) {
        subscription.autoRenew = false;
      }

      await subscription.save();

      await FoodSubscriptionLog.create({
        subscriptionId: subscription._id,
        userEmail: subscription.userEmail,
        action: 'failed',
        details: {
          paymentId: payment_id,
          amount: parseFloat(payhere_amount),
          currency: 'LKR',
          reason: `Payment failed with status code: ${status_code}`,
          payhereToken: subscription.payhereRecurringToken
        }
      });
    }

  } catch (error) {
    console.error('Failed to handle recurring food payment:', error);
  }
};

// Handle failed food subscription payment
export const handleFailedFoodPayment = async (notificationData) => {
  try {
    const { order_id, status_code, status_message } = notificationData;

    console.log(`Handling failed food payment for order: ${order_id}`);

    const subscription = await FoodSubscription.findOne({ payhereOrderId: order_id });

    if (subscription) {
      subscription.status = 'payment_failed';
      subscription.paymentFailure = true;
      subscription.lastPaymentFailureDate = new Date();
      subscription.renewalAttempts += 1;

      subscription.renewalHistory.push({
        renewalDate: new Date(),
        amount: subscription.amount,
        status: 'failed',
        failureReason: `${status_code} - ${status_message}`,
        attempt: subscription.renewalAttempts
      });

      if (subscription.renewalAttempts >= subscription.maxRenewalAttempts) {
        subscription.status = 'cancelled';
        subscription.autoRenew = false;
      }

      await subscription.save();

      await FoodSubscriptionLog.create({
        subscriptionId: subscription._id,
        userEmail: subscription.userEmail,
        action: 'failed',
        details: {
          amount: subscription.amount,
          currency: subscription.currency,
          reason: `${status_code} - ${status_message}`
        }
      });

      console.log('Food subscription updated with failure information');
    }

  } catch (error) {
    console.error('Failed to handle failed food payment:', error);
  }
};

// Create farmer subscription payment
export const createFarmerSubscriptionPayment = async (req, res) => {
  try {
    const { customerData, amount, currency = 'LKR' } = req.body;

    if (!validatePayHereConfig()) {
      return res.status(500).json({ 
        error: 'Payment configuration incomplete. Please contact support.' 
      });
    }

    // Validate required fields
    if (!customerData?.email || !customerData?.firstName || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, firstName, amount' 
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Generate unique order ID
    const orderId = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Clean and validate phone number
    let cleanPhone = (customerData.phone || '').replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('94')) {
      cleanPhone = '0' + cleanPhone.substring(2);
    } else if (!cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    const totalAmount = numAmount;

    const hash = generatePayHereHash(
      payhereConfig.merchantId,
      orderId,
      totalAmount,
      currency,
      payhereConfig.merchantSecret
    );

    const paymentData = {
      sandbox: payhereConfig.mode === 'sandbox',
      merchant_id: payhereConfig.merchantId,
      // Append query param correctly for both clean and existing query cases
      return_url: `${payhereConfig.returnUrl}${payhereConfig.returnUrl.includes('?') ? '&' : '?'}order_id=${orderId}`,
      cancel_url: `${payhereConfig.cancelUrl}?error=payment_cancelled`,
      notify_url: payhereConfig.notifyUrl,
      order_id: orderId,
      items: 'Farmer Premium Subscription',
      currency: currency.toUpperCase(),
      amount: totalAmount.toFixed(2),
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.email.trim().toLowerCase(),
      phone: cleanPhone,
      address: customerData.address.trim(),
      city: customerData.city || 'Colombo',
      country: 'Sri Lanka',
      hash: hash,
      custom_1: 'farmer_subscription',
      // Pass farmerId for reliable linking on notify
      custom_2: customerData.farmerId || `farmer_${customerData.email.trim().toLowerCase()}`
    };

    console.log('Farmer subscription payment created:', {
      orderId,
      amount: totalAmount,
      email: customerData.email
    });

    res.json({ 
      success: true, 
      paymentData,
      orderId,
      message: 'Payment form data generated successfully' 
    });

  } catch (error) {
    console.error('Error creating farmer subscription payment:', error);
    res.status(500).json({ 
      error: 'Failed to create payment form',
      details: error.message 
    });
  }
};

// PayHere notification handler
export const handlePayHereNotification = async (req, res) => {
  try {
    console.log('===== PAYHERE NOTIFICATION RECEIVED =====');
    console.log('Full notification data:', JSON.stringify(req.body, null, 2));
    console.log('Timestamp:', new Date().toISOString());
    
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      custom_1,
      custom_2,
      method,
      payment_id,
      status_message
    } = req.body;

    // Verify the MD5 signature
    const localMd5sig = crypto
      .createHash('md5')
      .update(
        payhereConfig.merchantId +
        order_id +
        payhere_amount +
        payhere_currency +
        status_code +
        crypto.createHash('md5').update(payhereConfig.merchantSecret).digest('hex').toUpperCase()
      )
      .digest('hex')
      .toUpperCase();

    console.log('MD5 signature verification:', {
      received: md5sig,
      calculated: localMd5sig,
      match: localMd5sig === md5sig
    });

    if (localMd5sig !== md5sig) {
      console.error('PayHere MD5 signature validation failed');
      return res.status(400).send('Invalid signature');
    }

    // Handle farmer subscription payment
      if (custom_1 === 'farmer_subscription') {
      // Try to resolve farmer via custom_2
      let farmer = null;
      let resolvedBy = '';
      if (custom_2 && /^[0-9a-fA-F]{24}$/.test(custom_2)) {
        farmer = await User.findOne({ _id: custom_2, type: 'farmer' });
        resolvedBy = 'farmerId';
      } else if (custom_2?.startsWith('farmer_')) {
        const email = custom_2.replace('farmer_', '');
        farmer = await User.findOne({ email: email, type: 'farmer' });
        resolvedBy = 'email';
      }
      const email = farmer?.email || (custom_2?.startsWith('farmer_') ? custom_2.replace('farmer_', '') : '');
      
      console.log(`Processing farmer subscription for: ${email || custom_2}, status: ${status_code}, resolvedBy: ${resolvedBy}`);
      
      if (status_code === '2') { // Success
        console.log(`Farmer subscription payment successful for: ${email}`);
        
        // Update farmer subscription status
        if (farmer) {
          console.log(`Found farmer:`, {
            email: farmer.email,
            currentSubscriptionStatus: farmer.subscriptionPaid,
            kycStatus: farmer.kycStatus
          });
          
          farmer.subscriptionPaid = true;
          farmer.farmerStatus = farmer.kycStatus === 'approved' ? 'approved' : 'pending_review';
          await farmer.save();
          
          console.log(`Farmer subscription activated for: ${email}`);
          console.log(`Updated farmer status:`, {
            subscriptionPaid: farmer.subscriptionPaid,
            farmerStatus: farmer.farmerStatus
          });

          // Insert FarmerSubscription record if not exists for this order_id
          const existing = await FarmerSubscription.findOne({ orderId: order_id });
          if (!existing) {
            const amountNum = parseFloat(payhere_amount);
            const sub = new FarmerSubscription({
              farmerId: farmer._id,
              farmerEmail: farmer.email.toLowerCase(),
              orderId: order_id,
              amount: isNaN(amountNum) ? 1500 : amountNum,
              currency: (payhere_currency || 'LKR').toUpperCase(),
              status: 'paid',
              paymentMethod: method || 'payhere_sandbox',
              paymentId: payment_id || undefined,
              isActive: true,
              demoMode: false,
              instantPayment: false
            });
            await sub.save();
            console.log('FarmerSubscription record created:', {
              orderId: sub.orderId,
              farmerId: String(sub.farmerId),
              amount: sub.amount,
              currency: sub.currency
            });
          } else {
            console.log('FarmerSubscription already exists for order:', order_id);
          }
        } else {
          console.error(`Farmer not found for email: ${email}`);
        }
        
      } else {
  console.log(`Farmer subscription payment failed for: ${email}, status: ${status_code}`);
        // Optionally mark a failed subscription attempt
        if (order_id) {
          try {
            const farmer = await User.findOne({ email: email, type: 'farmer' });
            if (farmer) {
              const existing = await FarmerSubscription.findOne({ orderId: order_id });
              if (!existing) {
                await new FarmerSubscription({
                  farmerId: farmer._id,
                  farmerEmail: farmer.email.toLowerCase(),
                  orderId: order_id,
                  amount: parseFloat(payhere_amount) || 1500,
                  currency: (payhere_currency || 'LKR').toUpperCase(),
                  status: 'failed',
                  paymentMethod: method || 'payhere_sandbox',
                  paymentId: payment_id || undefined,
                  isActive: false,
                  demoMode: false,
                  instantPayment: false
                }).save();
              }
            }
          } catch (e) {
            console.warn('Could not persist failed subscription record:', e.message);
          }
        }
      }
    }
    // Handle cart order payment
    else if (custom_1 === 'cart_order') {
      console.log('Processing cart order payment for order:', order_id, 'status:', status_code);
      await handleCartPaymentNotification(req.body);
    }
    // Handle food subscription payments (both initial and recurring)
    else if (custom_1?.startsWith('plan_') || custom_2 === 'food_monthly_recurring') {
      console.log('Processing food subscription payment for order:', order_id, 'status:', status_code);
      if (status_code === '2') {
        await handleInitialFoodPaymentWithRecurring(req.body);
      } else {
        await handleFailedFoodPayment(req.body);
      }
    }
    // Handle recurring food subscription payments
    else if (req.body.subscription_id) {
      console.log('Processing recurring food subscription payment:', req.body.subscription_id);
      await handleRecurringFoodPayment(req.body);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('PayHere notification handling failed:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Create customer cart payment
export const createCartPayment = async (req, res) => {
  try {
    console.log('Creating PayHere One-time Cart Payment...');

    const { amount, currency = 'LKR', cartItems, customerData } = req.body;

    if (!payhereConfig.merchantId || !payhereConfig.merchantSecret) {
      console.error('PayHere configuration missing');
      return res.status(500).json({
        success: false,
        error: 'PayHere configuration invalid'
      });
    }

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    if (!customerData?.firstName || !customerData?.lastName || !customerData?.email || !customerData?.address) {
      return res.status(400).json({
        success: false,
        error: 'Customer information is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const orderId = `CART_${timestamp}_${randomSuffix}`;

    let cleanPhone = customerData.phone?.trim() || '0771234567';
    cleanPhone = cleanPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('94')) {
      cleanPhone = '0' + cleanPhone.substring(2);
    } else if (!cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    const subtotal = numAmount;
    const tax = 0;
    const shipping = 0;
    const totalAmount = subtotal + tax + shipping;

    const hash = generatePayHereHash(
      payhereConfig.merchantId,
      orderId,
      totalAmount,
      currency,
      payhereConfig.merchantSecret
    );

    let itemsDescription = 'Cart Items';
    if (cartItems && cartItems.length > 0) {
      itemsDescription = cartItems.map(item => 
        `${item.productName} (x${item.quantity})`
      ).join(', ');
      
      if (itemsDescription.length > 100) {
        itemsDescription = itemsDescription.substring(0, 97) + '...';
      }
    }

    const paymentData = {
      sandbox: payhereConfig.mode === 'sandbox',
      merchant_id: payhereConfig.merchantId,
      return_url: `${payhereConfig.customerReturnUrl}?order_id=${orderId}`,
      cancel_url: payhereConfig.customerCancelUrl,
      notify_url: payhereConfig.notifyUrl,
      order_id: orderId,
      items: itemsDescription,
      currency: currency.toUpperCase(),
      amount: totalAmount.toFixed(2),
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.email.trim().toLowerCase(),
      phone: cleanPhone,
      address: customerData.address.trim(),
      city: customerData.city || 'Colombo',
      country: 'Sri Lanka',
      hash: hash,
      custom_1: 'cart_order',
      custom_2: `customer_${customerData.email.trim().toLowerCase()}`
    };

  // Default all new orders to pending; status will be updated by notify URL in production,
  // or auto-completed after return URL when in sandbox mode (see finalizeCartPaymentAfterReturn).
  const orderData = {
      customerEmail: customerData.email.trim().toLowerCase(),
      customerName: `${customerData.firstName} ${customerData.lastName}`.trim(),
      phoneNumber: cleanPhone,
      address: customerData.address.trim(),
      city: customerData.city || 'Colombo',
      orderId: orderId,
      items: cartItems ? cartItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.price * item.quantity
      })) : [],
      subtotal: subtotal,
      tax: tax,
      shipping: shipping,
      totalAmount: totalAmount,
      currency: currency.toUpperCase(),
      paymentStatus: 'pending',
      orderStatus: 'pending',
      payhereOrderId: orderId
    };

    const order = new CartOrder(orderData);
    await order.save();

    console.log('One-time cart payment order created:', {
      orderId,
      amount: totalAmount,
      itemsCount: cartItems?.length || 0
    });

    res.json({
      success: true,
      orderId: orderId,
      paymentData: paymentData,
      amount: totalAmount,
      currency: currency.toUpperCase(),
      message: 'One-time cart payment created successfully'
    });

  } catch (error) {
    console.error('Cart payment creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Payment creation failed',
      message: error.message
    });
  }
};

// Finalize cart payment after PayHere redirects user back to the site.
// In sandbox mode, PayHere often won't POST to our notify URL, so we mark as completed here.
// In production, we DO NOT auto-complete; we wait for /payhere-notify to verify and update.
export const finalizeCartPaymentAfterReturn = async (req, res) => {
  try {
    const orderId = (req.body?.orderId || req.query?.orderId || req.body?.order_id || req.query?.order_id || '').trim();
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    // Try by both fields (orderId and payhereOrderId are the same in our flow)
    let order = await CartOrder.findOne({ $or: [ { orderId }, { payhereOrderId: orderId } ] });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // If already completed, return idempotently
    if (order.paymentStatus === 'completed') {
      return res.json({ success: true, message: 'Order already completed', orderId: order.orderId, status: order.paymentStatus });
    }

    if (isSandboxMode()) {
      order.paymentStatus = 'completed';
      order.orderStatus = 'confirmed';
      order.updatedAt = new Date();
      await order.save();

      // Also try to reflect in legacy Order model if present
      const legacy = await Order.findOne({ orderId: order.orderId });
      if (legacy) {
        legacy.paymentDone = true;
        await legacy.save();
      }

      return res.json({ success: true, message: 'Sandbox mode: order marked as completed', orderId: order.orderId, status: order.paymentStatus });
    }

    // Production: do not auto-complete
    return res.json({
      success: true,
      message: 'Production mode: awaiting PayHere notification to confirm payment',
      orderId: order.orderId,
      status: order.paymentStatus
    });
  } catch (error) {
    console.error('Failed to finalize payment after return:', error);
    return res.status(500).json({ success: false, error: 'Failed to finalize payment', details: error.message });
  }
};

// DEMO MODE: Instant farmer subscription (bypasses PayHere sandbox)
export const createInstantFarmerSubscription = async (req, res) => {
  try {
    console.log('Received instant farmer subscription request:', req.body);
    const { farmerId, farmerEmail, firstName, lastName } = req.body;

    // Validate required fields
    if (!farmerId || !farmerEmail) {
      console.log('Missing required fields:', { farmerId, farmerEmail });
      return res.status(400).json({ 
        error: 'Missing required fields: farmerId, farmerEmail' 
      });
    }

    // Validate farmerId format (should be a valid MongoDB ObjectId)
    if (!farmerId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid farmerId format:', farmerId);
      return res.status(400).json({ 
        error: 'Invalid farmer ID format' 
      });
    }

    console.log('Looking for existing subscription for farmer:', farmerId);

    // Check if farmer exists first
    const farmer = await User.findById(farmerId);
    if (!farmer || farmer.type !== 'farmer') {
      console.log('Farmer not found or not a farmer:', farmerId);
      return res.status(404).json({ 
        error: 'Farmer not found' 
      });
    }

    // Check if farmer already has an active subscription
    const existingSubscription = await FarmerSubscription.findOne({
      farmerId: farmerId,
      isActive: true,
      status: 'paid'
    });

    if (existingSubscription && !existingSubscription.isExpired()) {
      console.log('Found existing active subscription:', existingSubscription);
      return res.status(400).json({
        error: 'Farmer already has an active subscription',
        subscription: {
          orderId: existingSubscription.orderId,
          subscriptionEnd: existingSubscription.subscriptionEnd,
          isActive: true
        }
      });
    }

    // Generate unique order ID for demo
    const orderId = `DEMO_SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create instant paid subscription record
    const subscription = new FarmerSubscription({
      farmerId: farmerId,
      farmerEmail: farmerEmail.toLowerCase().trim(),
      orderId: orderId,
      amount: 1500, // LKR 1500
      currency: 'LKR',
      status: 'paid',
      paymentMethod: 'demo_instant',
      paymentId: `DEMO_PAY_${Date.now()}`,
      isActive: true,
      demoMode: true,
      instantPayment: true
    });

    await subscription.save();

    // Update farmer's subscription status in User model
    await User.findByIdAndUpdate(farmerId, {
      subscriptionPaid: true,
      farmerStatus: 'approved',
      lastSubscriptionDate: new Date()
    });

    console.log('Instant farmer subscription created:', {
      farmerId,
      farmerEmail,
      orderId,
      amount: 1500,
      demo: true
    });

    res.json({
      success: true,
      message: 'Farmer subscription activated instantly (Demo Mode)',
      subscription: {
        orderId: subscription.orderId,
        amount: subscription.amount,
        currency: subscription.currency,
        status: subscription.status,
        subscriptionStart: subscription.subscriptionStart,
        subscriptionEnd: subscription.subscriptionEnd,
        isActive: subscription.isActive,
        demoMode: subscription.demoMode
      }
    });

  } catch (error) {
    console.error('Error creating instant farmer subscription:', error);
    res.status(500).json({
      error: 'Failed to create instant subscription',
      details: error.message
    });
  }
};

// DEMO MODE: Instant cart payment (bypasses PayHere sandbox)
export const createInstantCartPayment = async (req, res) => {
  try {
    const { customerData, cartItems } = req.body;

    // Validate required fields
    if (!customerData?.email || !cartItems?.length) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerData.email, cartItems' 
      });
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid cart total amount' });
    }

    // Generate unique order ID for demo
    const orderId = `DEMO_ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Group items by farmer and create CartOrder records
    const farmerGroups = {};
    cartItems.forEach(item => {
      const farmerId = item.farmerId;
      if (!farmerGroups[farmerId]) {
        farmerGroups[farmerId] = {
          farmerId: farmerId,
          farmerEmail: item.farmerEmail,
          products: [],
          subtotal: 0
        };
      }
      farmerGroups[farmerId].products.push({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.price * item.quantity
      });
      farmerGroups[farmerId].subtotal += item.price * item.quantity;
    });

    // Create CartOrder records for each farmer
    const cartOrders = [];
    for (const [farmerId, group] of Object.entries(farmerGroups)) {
      const cartOrder = new CartOrder({
        customerId: customerData.customerId,
        customerEmail: customerData.email.toLowerCase().trim(),
        farmerId: group.farmerId,
        farmerEmail: group.farmerEmail,
        orderId: orderId,
        paymentId: `DEMO_PAY_${Date.now()}`,
        products: group.products,
        totalAmount: group.subtotal,
        currency: 'LKR',
        status: 'paid',
        paymentStatus: 'completed',
        paymentMethod: 'demo_instant',
        shippingAddress: {
          address: customerData.address,
          city: customerData.city || 'Colombo',
          phone: customerData.phone
        },
        demoMode: true,
        instantPayment: true
      });

      await cartOrder.save();
      cartOrders.push(cartOrder);
    }

    console.log('Instant cart payment created:', {
      orderId,
      totalAmount,
      customerId: customerData.customerId,
      farmerCount: cartOrders.length,
      demo: true
    });

    res.json({
      success: true,
      message: 'Order payment completed instantly (Demo Mode)',
      order: {
        orderId: orderId,
        totalAmount: totalAmount,
        currency: 'LKR',
        status: 'paid',
        paymentStatus: 'completed',
        farmerOrders: cartOrders.length,
        demoMode: true
      }
    });

  } catch (error) {
    console.error('Error creating instant cart payment:', error);
    res.status(500).json({
      error: 'Failed to create instant cart payment',
      details: error.message
    });
  }
};

// Check farmer capabilities (always return true for demo mode)
export const getFarmerCapabilities = async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({ error: 'farmerId is required' });
    }

    // In demo mode, all farmers have full capabilities regardless of subscription status
    const capabilities = {
      canAddProducts: true,
      canAddPromotions: true,
      hasActiveSubscription: true, // Always true for demo
      subscriptionStatus: 'active',
      demoMode: true,
      message: 'All features enabled for demo mode'
    };

    // Optional: Still check if farmer actually has a subscription for data consistency
    const subscription = await FarmerSubscription.findOne({
      farmerId: farmerId,
      isActive: true,
      status: 'paid'
    });

    if (subscription) {
      capabilities.actualSubscription = {
        orderId: subscription.orderId,
        subscriptionEnd: subscription.subscriptionEnd,
        isExpired: subscription.isExpired()
      };
    }

    res.json({
      success: true,
      farmerId,
      capabilities
    });

  } catch (error) {
    console.error('Error checking farmer capabilities:', error);
    res.status(500).json({
      error: 'Failed to check farmer capabilities',
      details: error.message
    });
  }
};

// Get cancelled orders (for admin dashboard)
export const getCancelledOrders = async (req, res) => {
  try {
    // Find cancelled orders from CartOrder collection
    const cancelledCartOrders = await CartOrder.find({ 
      orderStatus: 'cancelled' 
    }).sort({ cancelledDate: -1, updatedAt: -1 });

    // Also check legacy Order collection
    const cancelledLegacyOrders = await Order.find({ 
      status: 'cancelled' 
    }).sort({ cancelledDate: -1, updatedAt: -1 });

    console.log('Found cancelled CartOrders:', cancelledCartOrders.length);
    console.log('Found cancelled legacy Orders:', cancelledLegacyOrders.length);

    if (cancelledCartOrders.length > 0) {
      console.log('Sample CartOrder:', {
        orderId: cancelledCartOrders[0].orderId,
        orderStatus: cancelledCartOrders[0].orderStatus,
        cancelledDate: cancelledCartOrders[0].cancelledDate,
        customerName: cancelledCartOrders[0].customerName
      });
    }

    // Format CartOrder results
    const formattedCartOrders = cancelledCartOrders.map(order => ({
      orderId: order.orderId,
      customerName: order.customerName || 'Unknown Customer',
      customerEmail: order.customerEmail || 'unknown@email.com',
      farmerName: 'Farmer',
      farmerEmail: 'farmer@greenharvest.com',
      totalAmount: order.totalAmount || 0,
      currency: order.currency || 'LKR',
      cancelledAt: order.cancelledDate || order.updatedAt || new Date(),
      cancellationReason: order.cancelReason || 'No reason provided',
      refundStatus: order.refundStatus || 'not_requested',
      refundAmount: order.refundAmount || 0,
      refundBank: order.refundBank || undefined,
      productsCount: order.items?.length || 0,
      products: order.items || [],
      demoMode: true,
      source: 'CartOrder',
      phoneNumber: order.phoneNumber,
      address: order.address,
      paymentStatus: order.paymentStatus
    }));

    // Format legacy Order results
    const formattedLegacyOrders = cancelledLegacyOrders.map(order => ({
      orderId: order.orderId,
      customerName: order.name || 'Unknown Customer',
      customerEmail: order.email || 'unknown@email.com',
      farmerName: 'Legacy Farmer',
      farmerEmail: 'legacy@farmer.com',
      totalAmount: order.orderedItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
      currency: 'LKR',
      cancelledAt: order.cancelledDate || order.updatedAt || order.date || new Date(),
      cancellationReason: order.cancelReason || 'No reason provided',
      refundStatus: order.refundStatus || 'not_requested',
      refundAmount: order.refundAmount || 0,
      productsCount: order.orderedItems?.length || 0,
      products: order.orderedItems || [],
      demoMode: true,
      source: 'Order',
      phoneNumber: order.phone,
      address: order.address
    }));

    // Combine and sort all cancelled orders
    const allCancelledOrders = [...formattedCartOrders, ...formattedLegacyOrders]
      .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt));

    console.log('Total formatted cancelled orders:', allCancelledOrders.length);
    console.log('Sample formatted order:', allCancelledOrders[0]);

    res.json({
      success: true,
      cancelledOrders: allCancelledOrders,
      totalCount: allCancelledOrders.length,
      cartOrdersCount: formattedCartOrders.length,
      legacyOrdersCount: formattedLegacyOrders.length
    });

  } catch (error) {
    console.error('Error fetching cancelled orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cancelled orders',
      details: error.message
    });
  }
};

// Test endpoint to manually cancel an existing order (for development only)
export const cancelTestOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required'
      });
    }

    // Find the order in CartOrder collection
    let order = await CartOrder.findOne({ orderId });
    let orderType = 'CartOrder';
    
    if (!order) {
      // Try legacy Order collection
      order = await Order.findOne({ orderId });
      orderType = 'Order';
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update the order to cancelled status
    if (orderType === 'CartOrder') {
      order.orderStatus = 'cancelled';
      order.paymentStatus = 'cancelled';
      order.cancelledDate = new Date();
      order.cancelReason = 'Manually cancelled for testing';
      order.refundStatus = 'not_requested';
    } else {
      order.status = 'cancelled';
      order.cancelledDate = new Date();
      order.cancelReason = 'Manually cancelled for testing';
      order.refundStatus = 'not_requested';
    }

    await order.save();

    res.json({
      success: true,
      message: `Order ${orderId} has been cancelled`,
      order: {
        orderId: order.orderId,
        status: order.orderStatus || order.status,
        cancelledDate: order.cancelledDate,
        cancelReason: order.cancelReason,
        orderType
      }
    });

  } catch (error) {
    console.error('Error cancelling test order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel test order',
      details: error.message
    });
  }
};

// Get all orders (for debugging - shows all orders with their statuses)
export const getAllOrdersStatus = async (req, res) => {
  try {
    // Get all CartOrders
    const cartOrders = await CartOrder.find({}).select('orderId orderStatus paymentStatus cancelledDate cancelReason').sort({ createdAt: -1 }).limit(10);
    
    // Get all legacy Orders  
    const legacyOrders = await Order.find({}).select('orderId status cancelledDate cancelReason').sort({ date: -1 }).limit(10);

    res.json({
      success: true,
      cartOrders: cartOrders.map(o => ({
        orderId: o.orderId,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        cancelledDate: o.cancelledDate,
        cancelReason: o.cancelReason,
        source: 'CartOrder'
      })),
      legacyOrders: legacyOrders.map(o => ({
        orderId: o.orderId,
        status: o.status,
        cancelledDate: o.cancelledDate,
        cancelReason: o.cancelReason,
        source: 'Order'
      })),
      totalCartOrders: cartOrders.length,
      totalLegacyOrders: legacyOrders.length
    });

  } catch (error) {
    console.error('Error fetching orders status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders status',
      details: error.message
    });
  }
};

// Process refund for cancelled order (admin only)
export const processRefund = async (req, res) => {
  try {
    const { orderId, adminUserId, refundAmount } = req.body;

    if (!orderId || !adminUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields: orderId, adminUserId' 
      });
    }

    // Find all CartOrder records for this orderId
    const cartOrders = await CartOrder.find({ 
      orderId: orderId,
      orderStatus: 'cancelled'
    });

    if (!cartOrders.length) {
      return res.status(404).json({ error: 'No cancelled orders found for this orderId' });
    }

    // In demo mode, just mark as refunded without actual payment processing
    const refundedOrders = [];
    for (const cartOrder of cartOrders) {
      if (cartOrder.refundStatus !== 'completed') {
        const refundAmountToUse = refundAmount || cartOrder.totalAmount;
        await cartOrder.completeRefund(refundAmountToUse);
        
        refundedOrders.push({
          farmerId: cartOrder.farmerId,
          farmerEmail: cartOrder.farmerEmail,
          totalAmount: cartOrder.totalAmount,
          refundAmount: refundAmountToUse
        });
      }
    }

    console.log('Refunds processed (demo mode):', {
      orderId,
      refundedCount: refundedOrders.length,
      adminUserId
    });

    res.json({
      success: true,
      message: 'Refund processed successfully (Demo Mode)',
      orderId,
      refundedOrders: refundedOrders.length,
      details: refundedOrders,
      demoMode: true
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      error: 'Failed to process refund',
      details: error.message
    });
  }
};

// Cancel order (for admin and customer use)
export const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason, userId, bank } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ 
        error: 'Missing required fields: orderId, reason' 
      });
    }

    // Normalize bank object
    const bankInfo = bank && typeof bank === 'object' ? {
      accountName: bank.accountName || '',
      accountNumber: bank.accountNumber || '',
      bankName: bank.bankName || '',
      branch: bank.branch || '',
      notes: bank.notes || ''
    } : null;

    // Find all CartOrder records for this orderId
  const cartOrders = await CartOrder.find({ orderId: orderId });

    if (!cartOrders.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Cancel all related CartOrder records
    const cancelledOrders = [];
    for (const cartOrder of cartOrders) {
      if (cartOrder.orderStatus === 'cancelled') {
        continue; // Skip if already cancelled
      }

      if (typeof cartOrder.cancelOrder === 'function') {
        await cartOrder.cancelOrder(reason, bankInfo);
      } else {
        // Fallback (older model without method)
        cartOrder.orderStatus = 'cancelled';
        cartOrder.paymentStatus = 'cancelled';
        cartOrder.cancelledDate = new Date();
        cartOrder.cancelReason = reason;
        cartOrder.refundStatus = 'requested';
        if (bankInfo) {
          cartOrder.refundBank = bankInfo;
        }
        await cartOrder.save();
      }
      cancelledOrders.push({
        farmerId: cartOrder.farmerId,
        farmerEmail: cartOrder.farmerEmail,
        totalAmount: cartOrder.totalAmount,
        products: Array.isArray(cartOrder.items) ? cartOrder.items.length : 0
      });
    }

    console.log('Orders cancelled:', {
      orderId,
      reason,
      cancelledCount: cancelledOrders.length,
      userId
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      orderId,
      reason,
      cancelledOrders: cancelledOrders.length,
      details: cancelledOrders
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      error: 'Failed to cancel order',
      details: error.message
    });
  }
};

// CREATE FOOD SUBSCRIPTION PAYMENT ENDPOINT (Recurring)
export const createFoodSubscriptionPayment = async (req, res) => {
  try {
    console.log('Creating PayHere Recurring Food Subscription Payment...');

    const { amount, currency = 'LKR', planId, enableAutoRenew = true, customerData } = req.body;

    if (!payhereConfig.merchantId || !payhereConfig.merchantSecret) {
      console.error('PayHere configuration missing');
      return res.status(500).json({
        success: false,
        error: 'PayHere configuration invalid'
      });
    }

    const fixedAmount = 2500;
    const numAmount = parseFloat(amount);
    if (numAmount !== fixedAmount) {
      return res.status(400).json({
        success: false,
        error: `Invalid amount. Food subscription is fixed at LKR ${fixedAmount} per month`
      });
    }

    if (!customerData?.name || !customerData?.email || !customerData?.address) {
      return res.status(400).json({
        success: false,
        error: 'Customer name, email, and delivery address are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const orderId = `FOOD_${timestamp}_${randomSuffix}`;

    let cleanPhone = customerData.phone?.trim() || '0771234567';
    cleanPhone = cleanPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('94')) {
      cleanPhone = '0' + cleanPhone.substring(2);
    } else if (!cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    const totalAmount = fixedAmount;

    const hash = enableAutoRenew ? 
      generateRecurringPayHereHash(
        payhereConfig.merchantId,
        orderId,
        totalAmount,
        currency,
        payhereConfig.merchantSecret
      ) :
      generatePayHereHash(
        payhereConfig.merchantId,
        orderId,
        totalAmount,
        currency,
        payhereConfig.merchantSecret
      );

    const paymentData = {
      sandbox: payhereConfig.mode === 'sandbox',
      merchant_id: payhereConfig.merchantId,
      return_url: `${payhereConfig.customerReturnUrl}?order_id=${orderId}`,
      cancel_url: payhereConfig.customerCancelUrl,
      notify_url: payhereConfig.notifyUrl,
      order_id: orderId,
      items: 'Premium Food Subscription - Monthly',
      currency: currency.toUpperCase(),
      amount: totalAmount.toFixed(2),
      first_name: customerData.name.split(' ')[0] || 'Customer',
      last_name: customerData.name.split(' ').slice(1).join(' ') || '',
      email: customerData.email.trim().toLowerCase(),
      phone: cleanPhone,
      address: customerData.address.trim(),
      city: customerData.city || 'Colombo',
      country: 'Sri Lanka',
      hash: hash,
      custom_1: `plan_${planId || 'food_premium'}`,
      custom_2: enableAutoRenew ? 'food_monthly_recurring' : 'food_one_time'
    };

    if (enableAutoRenew) {
      paymentData.recurrence = 'Monthly';
      paymentData.duration = '1 Year';
    }

    console.log('Food subscription payment created:', {
      orderId,
      amount: totalAmount,
      email: customerData.email,
      autoRenew: enableAutoRenew
    });

    res.json({
      success: true,
      orderId: orderId,
      paymentData: paymentData,
      amount: totalAmount,
      currency: currency.toUpperCase(),
      autoRenew: enableAutoRenew,
      message: 'Food subscription payment created successfully'
    });

  } catch (error) {
    console.error('Food subscription creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Food subscription creation failed',
      message: error.message
    });
  }
};