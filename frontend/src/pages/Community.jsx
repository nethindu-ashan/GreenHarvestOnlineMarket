import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Community = () => {
  const [showAddReview, setShowAddReview] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', content: '', rating: 5, category: 'Product Review' });

  const isLoggedIn = !!localStorage.getItem('token');
  const currentUser = useMemo(() => {
    try {
      const c = localStorage.getItem('customerUser');
      return c ? JSON.parse(c) : null;
    } catch { return null; }
  }, []);
  const isCustomer = !!currentUser;

  // Load reviews list and my review
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const listRes = await api.getReviews();
        setReviews(listRes.reviews || []);
        if (isCustomer) {
          try {
            const myRes = await api.getMyReview();
            const r = myRes.review || null;
            setMyReview(r);
            if (r) setForm({ title: r.title, content: r.content, rating: r.rating, category: r.category || 'Product Review' });
          } catch (e) {
            // ignore if no review yet
          }
        }
      } catch (e) {
        setError(e.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isCustomer]);

  const categories = ['All', 'Product Review', 'Service Review', 'General Discussion', 'Recipes'];
  const avgRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((t, r) => t + (Number(r.rating) || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isCustomer) {
      alert('Please login as a customer to post a review');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: form.title?.trim(),
        content: form.content?.trim(),
        rating: Number(form.rating) || 5,
        category: form.category || 'General Discussion'
      };
      if (!payload.title || !payload.content) {
        alert('Please fill title and content');
        setSaving(false);
        return;
      }
      await api.saveMyReview(payload);
      const listRes = await api.getReviews();
      setReviews(listRes.reviews || []);
      const myRes = await api.getMyReview();
      setMyReview(myRes.review || null);
      setShowAddReview(false);
    } catch (e) {
      alert(e.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
  if (!isCustomer) return;
    if (!confirm('Delete your review?')) return;
    try {
      await api.deleteMyReview();
      const listRes = await api.getReviews();
      setReviews(listRes.reviews || []);
      setMyReview(null);
      setForm({ title: '', content: '', rating: 5, category: 'Product Review' });
    } catch (e) {
      alert(e.message || 'Failed to delete review');
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span key={index} className={index < rating ? 'text-yellow-500' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Community Reviews & Discussions</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Share your experiences, read reviews from other customers, and connect with the GreenHarvest community.
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold mb-2" style={{color: '#51ac37'}}>450+</div>
            <div className="text-gray-600">Customer Reviews</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold mb-2" style={{color: '#51ac37'}}>4.8</div>
            <div className="text-gray-600">Average Rating</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold mb-2" style={{color: '#51ac37'}}>98%</div>
            <div className="text-gray-600">Satisfaction Rate</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:opacity-90"
              style={{
                backgroundColor: category === 'All' ? '#51ac37' : 'white',
                color: category === 'All' ? 'white' : '#51ac37',
                border: `2px solid #51ac37`
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Add Review Section */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Customer Reviews & Discussions</h2>
              <button
                onClick={() => setShowAddReview(!showAddReview)}
                className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                style={{backgroundColor: '#51ac37'}}
              >
                {showAddReview ? 'Cancel' : 'Add Review'}
              </button>
            </div>

            {/* Add Review Form */}
            {showAddReview && (
              <form onSubmit={handleSave} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Title *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({...form, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter review title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({...form, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Product Review">Product Review</option>
                      <option value="Service Review">Service Review</option>
                      <option value="General Discussion">General Discussion</option>
                      <option value="Recipes">Recipes</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating *
                  </label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setForm({...form, rating: star})}
                        className={`text-2xl ${star <= form.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">({form.rating}/5)</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review *
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({...form, content: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Share your experience..."
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{backgroundColor: '#51ac37'}}
                  >
                    {myReview ? 'Update Review' : 'Post Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddReview(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Summary */}
            {!loading && !error && (
              <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
                <div>Average Rating: <span className="font-semibold">{avgRating || 0}</span> / 5</div>
                <div>Total Reviews: <span className="font-semibold">{reviews.length}</span></div>
              </div>
            )}
            {/* Errors */}
            {error && (
              <div className="mb-4 text-red-600">{error}</div>
            )}
            {/* Reviews List */}
            <div className="space-y-4">
              {loading && <div className="text-gray-600">Loading reviews...</div>}
              {!loading && !error && reviews.length === 0 && (
                <div className="text-gray-600">No reviews yet. Be the first to share your experience!</div>
              )}
              {!loading && reviews.map((r) => (
                <div key={r._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{backgroundColor: '#51ac37'}}>
                        {(r.userDisplayName || 'U').charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{r.userDisplayName || 'Customer'}</div>
                        <div className="text-sm text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {r.category}
                      </span>
                      {r.rating && (
                        <div className="flex items-center">
                          {renderStars(r.rating)}
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{r.title}</h3>
                  <p className="text-gray-600 mb-4 whitespace-pre-line">{r.content}</p>
                  {isCustomer && myReview && String(myReview.user) === String(r.user) && (
                    <div className="flex items-center gap-3 text-sm">
                      <button onClick={() => { setForm({ title: r.title, content: r.content, rating: r.rating, category: r.category }); setShowAddReview(true); }} className="text-green-600 hover:text-green-700 font-medium">Edit</button>
                      <button onClick={handleDelete} className="text-red-600 hover:text-red-700 font-medium">Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Join Community CTA */}
        <div 
          className="rounded-lg p-8 text-center text-white"
          style={{backgroundColor: '#51ac37'}}
        >
          <h2 className="text-3xl font-bold mb-4">Share Your Experience</h2>
          <p className="text-green-100 mb-6 max-w-2xl mx-auto">
            Help other customers discover the best products and share your honest reviews about your GreenHarvest experience.
          </p>
          {isCustomer ? (
            <button
              onClick={() => { setShowAddReview(true); if (myReview) setForm({ title: myReview.title, content: myReview.content, rating: myReview.rating, category: myReview.category }); }}
              className="px-6 py-3 bg-white text-green-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              {myReview ? 'Edit Your Review' : 'Write a Review'}
            </button>
          ) : (
            <Link to="/login" className="px-6 py-3 bg-white text-green-700 font-medium rounded-lg hover:bg-gray-100 transition-colors">Login to Write a Review</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;