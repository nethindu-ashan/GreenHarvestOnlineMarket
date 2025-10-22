// controllers/reviewController.js

import Review from '../models/review.js';
import User from '../models/user.js';

// Create or update current user's review
export async function upsertMyReview(req, res) {
  try {
    if (!req.user || req.user.type !== 'customer') {
      return res.status(403).json({ message: 'Only logged-in customers can post reviews' });
    }

    const { title, content, rating, category } = req.body;
    if (!title || !content || !rating) {
      return res.status(400).json({ message: 'Title, content and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Load user for a display name
    const dbUser = await User.findById(req.user.id);
    if (!dbUser) return res.status(404).json({ message: 'User not found' });
    const userDisplayName = dbUser.firstName ? `${dbUser.firstName} ${dbUser.lastName || ''}`.trim() : (dbUser.name || dbUser.email);

    const update = { title, content, rating, category: category || 'General Discussion', userDisplayName };

    const review = await Review.findOneAndUpdate(
      { user: req.user.id },
      { $set: update, $setOnInsert: { user: req.user.id } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: 'Review saved', review });
  } catch (error) {
    res.status(500).json({ message: 'Error saving review: ' + error.message });
  }
}

// Get current user's review
export async function getMyReview(req, res) {
  try {
    if (!req.user || req.user.type !== 'customer') {
      return res.status(403).json({ message: 'Only logged-in customers can view this' });
    }
    const review = await Review.findOne({ user: req.user.id }).lean();
    res.json({ review });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching review: ' + error.message });
  }
}

// Public: list all reviews (newest first)
export async function listReviews(req, res) {
  try {
    const reviews = await Review.find()
      .select('user userDisplayName title content rating category createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ message: 'Error listing reviews: ' + error.message });
  }
}

// Delete current user's review
export async function deleteMyReview(req, res) {
  try {
    if (!req.user || req.user.type !== 'customer') {
      return res.status(403).json({ message: 'Only logged-in customers can delete reviews' });
    }
    const result = await Review.findOneAndDelete({ user: req.user.id });
    if (!result) return res.status(404).json({ message: 'No review to delete' });
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review: ' + error.message });
  }
}
