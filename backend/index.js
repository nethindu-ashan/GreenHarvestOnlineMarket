// index.js

import express from 'express';
import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the user, product, order, cart, and utility routers
import userRouter from './routes/userRouter.js';
import productsRouter from './routes/productRouter.js';
import orderRouter from './routes/orderRouter.js';
import cartRouter from './routes/cartRouter.js';
import utilityRouter from './routes/utilityRouter.js';
import reviewRouter from './routes/reviewRouter.js';
import paymentRouter from './routes/paymentRouter.js';
import promotionRouter from './routes/promotionRouter.js';
import reportRouter from './routes/reportRouter.js';
// Import payment controllers for notification handling
import { handlePayHereNotification } from './controllers/paymentController.js';

import User from './models/user.js';

dotenv.config({ path: path.join(__dirname, '.env') });  // Load environment variables from .env file

const app = express();

// Add detailed mongoose connection diagnostics
function logConnState(prefix='') {
  const states = ['disconnected','connected','connecting','disconnecting','uninitialized','reconnected'];
  const state = mongoose.connection.readyState;
  console.log(`${prefix}Mongoose state: ${state} (${states[state] || 'unknown'})`);
}

mongoose.connection.on('connecting', () => console.log('MongoDB connecting...'));
mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err.message));

function maskMongoUri(uri = '') {
  if (!uri) return '';
  try {
    const u = new URL(uri.replace('mongodb+srv://', 'https://'));
    const user = u.username || '';
    const host = u.host;
    return `mongodb+srv://${user ? user + ':***@' : ''}${host}/...`;
  } catch {
    return 'mongodb+srv://***';
  }
}

async function diagnoseDns(hostname) {
  return new Promise((resolve) => {
    dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, records) => {
      if (err) return resolve({ ok: false, error: err.message });
      resolve({ ok: true, records });
    });
  });
}

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Please set it in backend/.env');
    return;
  }
  console.log('Using MONGO_URI:', maskMongoUri(uri));
  logConnState('Before connect: ');

  // Retry with backoff
  const maxAttempts = 3;
  let attempt = 0;
  let lastError = null;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20000,
      });
      logConnState('After connect: ');
  console.log('MongoDB connected on attempt', attempt);
      // Once connected, ensure default admin exists
      await ensureDefaultAdmin();
      return;
    } catch (error) {
      lastError = error;
      console.error(`MongoDB connection attempt ${attempt} failed:`, error.message);
      if (attempt < maxAttempts) {
        const backoff = attempt * 3000;
        console.log(`Retrying in ${backoff / 1000}s...`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  // Final failure
  console.error('Initial MongoDB connection failed after retries:', lastError?.message);
  try {
    const host = new URL(uri.replace('mongodb+srv://', 'https://')).host;
    const dnsDiag = await diagnoseDns(host);
    console.log('DNS SRV diagnostic:', dnsDiag);
  } catch (e) {
    console.log('DNS SRV diagnostic skipped:', e.message);
  }
  console.log('Tips:');
  console.log(' - Ensure your current IP is whitelisted in MongoDB Atlas (Network Access → Add IP Address).');
  console.log(' - Verify Database Access user and password match MONGO_URI (URL-encode special characters).');
  console.log(' - Confirm DNS can resolve SRV records for your cluster from this machine.');
  console.log('Server continues without active DB connection. Some features may be limited.');
};

connectDB();

// Ensure there is at least one admin account
let seededAdminOnce = false;
async function ensureDefaultAdmin() {
  if (seededAdminOnce) return;
  try {
    const existing = await User.findOne({ type: 'admin' }).lean();
    if (existing) {
      console.log('Admin account exists:', existing.email);
      seededAdminOnce = true;
      return;
    }
    const email = process.env.ADMIN_EMAIL || 'admin@greenharvest.local';
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      console.warn('ADMIN_PASSWORD not set. Generated a temporary admin password:', password);
    }
    const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const lastName = process.env.ADMIN_LAST_NAME || 'User';

    const admin = new User({
      email,
      firstName,
      lastName,
      password,
      type: 'admin',
      isVerified: true,
    });
    await admin.save();
    console.log('Default admin created:', email);
    if (!process.env.ADMIN_PASSWORD) {
      console.log('IMPORTANT: Set ADMIN_PASSWORD in backend/.env to a secure value and restart the server.');
    }
    seededAdminOnce = true;
  } catch (e) {
    console.error('Failed to ensure default admin:', e.message);
  }
}

// Middleware
// Enhanced CORS to allow any localhost dev port and specific known origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5176',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow non-browser or same-origin requests
    if (allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
  console.warn('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));  // Enable CORS (Cross-Origin Resource Sharing)
// Increase JSON body limit to allow base64 image data from frontend (default 100kb is too small)
app.use(express.json({ limit: '6mb' }));  // Parse incoming JSON requests with higher limit
// Parse URL-encoded bodies (required for PayHere notify callbacks)
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method === 'POST' && req.path.includes('/register')) {
    console.log('Registration request body:', {
      ...req.body,
      password: '[HIDDEN]'
    });
  }
  next();
});

// Routes
app.use('/api/users', userRouter);  // Mount the user routes at /api/users
app.use('/api/products', productsRouter);  // Mount the product routes
app.use('/api/orders', orderRouter);  // Mount the order routes
app.use('/api/cart', cartRouter);  // Mount the cart routes
app.use('/api/utility', utilityRouter);  // Mount the utility routes
app.use('/api/reviews', reviewRouter);  // Mount the reviews routes
app.use('/api/payments', paymentRouter);  // Mount the payment routes
app.use('/api/promotions', promotionRouter);  // Mount the promotion routes
app.use('/api/reports', reportRouter);  // Mount the report routes
app.use('/api/reports', reportRouter);  // Mount the report routes

// Direct PayHere notification endpoint (for backward compatibility)
app.post('/api/payhere-notify', handlePayHereNotification);

// Basic test route to ensure server is working
app.get('/', (req, res) => {
  res.json({
    message: 'Server is working!',
    routes: ['api/users', 'api/products', 'api/orders', 'api/cart', 'api/utility', 'api/reviews'],  // List available routes
  });
});

// Debug endpoint to check environment variables
app.get('/debug', (req, res) => {
  res.json({
    PORT: process.env.PORT,
    JWT_SECRET_KEY_EXISTS: !!process.env.JWT_SECRET_KEY,
    JWT_SECRET_KEY_LENGTH: process.env.JWT_SECRET_KEY ? process.env.JWT_SECRET_KEY.length : 0,
    NODE_ENV: process.env.NODE_ENV
  });
});

// DB status endpoint
app.get('/db-status', (req, res) => {
  const stateMap = ['disconnected','connected','connecting','disconnecting','uninitialized','reconnected'];
  res.json({
    stateCode: mongoose.connection.readyState,
    state: stateMap[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    dbReady: mongoose.connection.readyState === 1
  });
});

// Start server with fallback if port is in use
const BASE_PORT = parseInt(process.env.PORT, 10) || 5000;

function start(port, attempt = 0) {
  const server = app.listen(port, () => {
    if (attempt > 0) {
      console.log(`Fallback successful. Server running on port ${port}`);
    } else {
      console.log(`Server is running on port ${port}`);
    }
    console.log(`JWT_SECRET_KEY loaded: ${!!process.env.JWT_SECRET_KEY}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (attempt < 5) {
        const nextPort = port + 1;
        console.warn(`Port ${port} in use. Trying port ${nextPort}...`);
        start(nextPort, attempt + 1);
      } else {
        console.error('All fallback ports are in use. Please free a port or set PORT env variable.');
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

start(BASE_PORT);
