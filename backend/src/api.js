/**
 * Backend API Server
 * PERSON 3: Implement Express API here
 * 
 * Endpoints to implement:
 * POST /api/posts - Create new post (hash content, store on IPFS, register on blockchain)
 * GET /api/posts - Get all posts
 * GET /api/posts/:id - Get specific post
 * POST /api/verify - Verify content originality
 * GET /api/user/:handle - Get user profile
 * POST /api/auth/register - User registration
 * POST /api/auth/login - User login
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const HashEngine = require('./hash-engine');
const IPFSStorage = require('./ipfs-storage');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize IPFS
const ipfsStorage = new IPFSStorage();

// ============ ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BlockPost Backend API is running' });
});

// TODO: Implement POST /api/posts
app.post('/api/posts', upload.single('media'), async (req, res) => {
  try {
    // 1. Extract caption and media from request
    // 2. Generate hash using HashEngine
    // 3. Upload media to IPFS
    // 4. Register hash on blockchain
    // 5. Store post in database
    // 6. Return post data
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TODO: Implement GET /api/posts
app.get('/api/posts', async (req, res) => {
  try {
    // Fetch all posts from database
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TODO: Implement POST /api/verify
app.post('/api/verify', upload.single('media'), async (req, res) => {
  try {
    // 1. Generate hash for submitted content
    // 2. Check against blockchain registry
    // 3. Return verification status
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TODO: Implement GET /api/user/:handle
app.get('/api/user/:handle', async (req, res) => {
  try {
    // Fetch user profile and posts
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TODO: Implement authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

app.post('/api/auth/login', async (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`BlockPost Backend API running on http://localhost:${PORT}`);
});

module.exports = app;
