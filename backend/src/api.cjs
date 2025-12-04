/**
 * VideoGuard Backend API Server
 * 
 * This server handles video file uploads for the VideoGuard 
 * blockchain-based video copyright protection system.
 * 
 * Features:
 * - Express.js server with CORS support
 * - Video file upload handling using multer
 * - Environment variable configuration
 * - Modular file structure for future expansion
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// Get __dirname equivalent in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express application
const app = express();

// ============ MIDDLEWARE CONFIGURATION ============

/**
 * CORS Middleware
 * Allows frontend applications to make requests to this backend
 * Configure origins based on your frontend URL
 */
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Allow all origins by default
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * JSON Body Parser
 * Parses incoming JSON payloads
 */
app.use(express.json());

/**
 * URL-encoded Body Parser
 * Parses incoming URL-encoded payloads
 */
app.use(express.urlencoded({ extended: true }));

// ============ FILE UPLOAD CONFIGURATION ============

/**
 * Multer Storage Configuration
 * Stores uploaded files in memory as Buffer objects
 * This is suitable for processing files before storing them elsewhere (IPFS)
 */
const storage = multer.memoryStorage();

/**
 * File Filter Function
 * Validates that uploaded files are video formats
 * Accepts common video MIME types
 */
const fileFilter = (req, file, cb) => {
  // Allowed video MIME types
  const allowedMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

/**
 * Multer Upload Middleware
 * Configures file upload with:
 * - Memory storage
 * - File type validation
 * - 100MB file size limit
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// ============ ROUTES ============

/**
 * Health Check Endpoint
 * GET /health
 * Returns server status
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'VideoGuard Backend API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Video Upload Endpoint
 * POST /upload
 * 
 * Accepts video file uploads via multipart/form-data
 * Expects the video file under the "video" field
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Field name: "video"
 * - File type: video/*
 * 
 * Response:
 * - Success: { success: true, message: "Video uploaded successfully", fileInfo: {...} }
 * - Error: { success: false, error: "Error message" }
 */
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      console.log('[UPLOAD] No file received in request');
      return res.status(400).json({
        success: false,
        error: 'No video file provided. Please upload a video file with the field name "video".'
      });
    }

    // Log upload details
    console.log('[UPLOAD] Video file received:');
    console.log(`  - Original name: ${req.file.originalname}`);
    console.log(`  - MIME type: ${req.file.mimetype}`);
    console.log(`  - Size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Buffer length: ${req.file.buffer.length} bytes`);

    // Extract file information
    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sizeInMB: (req.file.size / (1024 * 1024)).toFixed(2),
      uploadedAt: new Date().toISOString()
    };

    // Log successful upload
    console.log('[UPLOAD] File processed successfully');

    // Return success response
    // Note: File is currently in memory (req.file.buffer)
    // In next steps, this will be hashed and uploaded to IPFS
    res.json({
      success: true,
      message: 'Video uploaded successfully',
      fileInfo: fileInfo
    });

  } catch (error) {
    // Log error details
    console.error('[UPLOAD ERROR]', error.message);
    
    // Return error response
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while processing the upload'
    });
  }
});

/**
 * 404 Handler
 * Catches all undefined routes
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedPath: req.originalUrl
  });
});

/**
 * Global Error Handler
 * Catches all errors that occur in the application
 */
app.use((error, req, res, next) => {
  console.error('[SERVER ERROR]', error);
  
  // Handle multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds the 100MB limit'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${error.message}`
    });
  }
  
  // Handle other errors
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// ============ SERVER INITIALIZATION ============

/**
 * Start the Express server
 * Listens on the port specified in environment variables or defaults to 3001
 */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('=================================');
  console.log('VideoGuard Backend Server');
  console.log('=================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Upload endpoint: POST http://localhost:${PORT}/upload`);
  console.log('=================================');
  console.log('Waiting for requests...\n');
});

module.exports = app;
