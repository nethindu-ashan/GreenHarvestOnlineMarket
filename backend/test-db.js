// test-db.js - Simple database connectivity test

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

dotenv.config();

async function testDatabase() {
  try {
  console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
  console.log('Database connected successfully');

    // Test reading users
    console.log('📊 Testing database operations...');
    const userCount = await User.countDocuments();
    console.log(`👥 Total users in database: ${userCount}`);

    // Test finding admin user
    const admin = await User.findOne({ type: 'admin' });
    if (admin) {
  console.log(`Admin user found: ${admin.email}`);
    } else {
  console.log('No admin user found');
    }

    // Test creating a simple test user (we'll delete it after)
    const testUser = new User({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'testpassword123',
      type: 'customer',
      isVerified: false
    });

    console.log('💾 Testing user creation...');
    const savedUser = await testUser.save();
  console.log(`Test user created with ID: ${savedUser._id}`);

    // Clean up - delete the test user
    await User.deleteOne({ _id: savedUser._id });
    console.log('🧹 Test user cleaned up');

  console.log('All database tests passed!');
    
  } catch (error) {
  console.error('Database test failed:', error.message);
  } finally {
    await mongoose.disconnect();
  console.log('Database connection closed');
    process.exit(0);
  }
}

testDatabase();