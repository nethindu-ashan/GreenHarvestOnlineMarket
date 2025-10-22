import Promotion from '../models/promotion.js';
import Product from '../models/product.js';
import { uploadBase64Image, deleteImage } from '../utils/cloudinary.js';

// Create a new promotion
const createPromotion = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const promotionData = {
      ...req.body,
      farmerId
    };

    // Validate product belongs to farmer if productId is specified
    if (promotionData.productId) {
      const product = await Product.findOne({ 
        _id: promotionData.productId, 
        farmerId 
      });
      if (!product) {
        return res.status(400).json({ 
          message: 'Product not found or does not belong to you' 
        });
      }
    }

    // Validate price relationship
    if (promotionData.discountedPrice >= promotionData.originalPrice) {
      return res.status(400).json({ 
        message: 'Discounted price must be less than original price' 
      });
    }

    // Handle image upload to Cloudinary
    if (promotionData.image && typeof promotionData.image === 'string' && promotionData.image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadBase64Image(promotionData.image, 'promotions');
        promotionData.image = uploadResult.url;
      } catch (error) {
        console.error('Promotion image upload failed:', error);
        return res.status(500).json({
          message: "Failed to upload promotion image",
          error: error.message
        });
      }
    }

    const promotion = new Promotion(promotionData);
    await promotion.save();

    await promotion.populate('productId', 'productName price');
    
    res.status(201).json({
      success: true,
      message: 'Promotion created successfully',
      promotion
    });
  } catch (error) {
    console.error('Create promotion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create promotion',
      error: error.message 
    });
  }
};

// Get all promotions for the logged-in farmer
const getFarmerPromotions = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    let query = { farmerId };
    
    // Filter by status if provided
    if (status === 'active') {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.endDate = { $lt: new Date() };
    }

    const promotions = await Promotion.find(query)
      .populate('productId', 'productName price category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Promotion.countDocuments(query);

    res.json({
      success: true,
      promotions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get farmer promotions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch promotions' 
    });
  }
};

// Get a single promotion by ID
const getPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;

    const promotion = await Promotion.findOne({ 
      _id: id, 
      farmerId 
    }).populate('productId', 'productName price category');

    if (!promotion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Promotion not found' 
      });
    }

    res.json({
      success: true,
      promotion
    });
  } catch (error) {
    console.error('Get promotion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch promotion' 
    });
  }
};

// Update a promotion
const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;
    const updateData = req.body;

    // Validate product belongs to farmer if productId is being updated
    if (updateData.productId) {
      const product = await Product.findOne({ 
        _id: updateData.productId, 
        farmerId 
      });
      if (!product) {
        return res.status(400).json({ 
          message: 'Product not found or does not belong to you' 
        });
      }
    }

    // Validate price relationship if being updated
    if (updateData.originalPrice && updateData.discountedPrice && 
        updateData.discountedPrice >= updateData.originalPrice) {
      return res.status(400).json({ 
        message: 'Discounted price must be less than original price' 
      });
    }

    const promotion = await Promotion.findOneAndUpdate(
      { _id: id, farmerId },
      updateData,
      { new: true, runValidators: true }
    ).populate('productId', 'productName price category');

    if (!promotion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Promotion not found' 
      });
    }

    res.json({
      success: true,
      message: 'Promotion updated successfully',
      promotion
    });
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update promotion',
      error: error.message 
    });
  }
};

// Delete a promotion
const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;

    const promotion = await Promotion.findOneAndDelete({ 
      _id: id, 
      farmerId 
    });

    if (!promotion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Promotion not found' 
      });
    }

    res.json({
      success: true,
      message: 'Promotion deleted successfully'
    });
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete promotion' 
    });
  }
};

// Get all active promotions (public endpoint for customers)
const getActivePromotions = async (req, res) => {
  try {
    const now = new Date();
    const { productId, farmerId } = req.query;

    let query = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    };

    // Filter by product if specified
    if (productId) {
      query.$or = [
        { productId: productId },
        { productId: null } // General promotions
      ];
    }

    // Filter by farmer if specified
    if (farmerId) {
      query.farmerId = farmerId;
    }

    const promotions = await Promotion.find(query)
      .populate('productId', 'productName price category images')
      .populate('farmerId', 'name businessName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      promotions
    });
  } catch (error) {
    console.error('Get active promotions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch active promotions' 
    });
  }
};

// Apply promotion code
const applyPromotionCode = async (req, res) => {
  try {
    const { promoCode, productId } = req.body;

    if (!promoCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Promo code is required' 
      });
    }

    const now = new Date();
    let query = {
      promoCode: promoCode,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    };

    // Add usage limit check
    query.$or = [
      { maxUsage: null },
      { $expr: { $lt: ['$currentUsage', '$maxUsage'] } }
    ];

    const promotion = await Promotion.findOne(query)
      .populate('productId', 'productName price')
      .populate('farmerId', 'name businessName');

    if (!promotion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid or expired promo code' 
      });
    }

    // Check if promotion applies to the specific product
    if (promotion.productId && productId && promotion.productId._id.toString() !== productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'This promo code is not valid for the selected product' 
      });
    }

    res.json({
      success: true,
      message: 'Promo code applied successfully',
      promotion
    });
  } catch (error) {
    console.error('Apply promotion code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to apply promo code' 
    });
  }
};

export {
  createPromotion,
  getFarmerPromotions,
  getPromotion,
  updatePromotion,
  deletePromotion,
  getActivePromotions,
  applyPromotionCode
};