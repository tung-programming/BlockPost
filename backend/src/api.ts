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

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import multer, { MulterError } from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import HashEngine from './hash-engine.js';

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app: Application = express();

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
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  // Allowed video MIME types
  const allowedMimeTypes: string[] = [
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
    cb(new Error('Invalid file type. Only video files are allowed.'));
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
app.get('/health', (req: Request, res: Response): void => {
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
app.post('/upload', upload.single('video'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      console.log('[UPLOAD] No file received in request');
      res.status(400).json({
        success: false,
        error: 'No video file provided. Please upload a video file with the field name "video".'
      });
      return;
    }

    // Log upload details
    console.log('[UPLOAD] Video file received:');
    console.log(`  - Original name: ${req.file.originalname}`);
    console.log(`  - MIME type: ${req.file.mimetype}`);
    console.log(`  - Size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Buffer length: ${req.file.buffer.length} bytes`);

    // PHASE 2: Generate all hashes using 3-layer detection
    console.log('[UPLOAD] Starting hash generation...');
    const hashStartTime = Date.now();
    
    const hashes = await HashEngine.generateAllHashes(req.file.buffer);
    
    const hashDuration = Date.now() - hashStartTime;
    console.log(`[UPLOAD] ✓ Hash generation completed in ${hashDuration}ms`);

    // Extract file information with hashes
    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sizeInMB: (req.file.size / (1024 * 1024)).toFixed(2),
      uploadedAt: new Date().toISOString(),
      hashes: {
        exactHash: hashes.exactHash,
        perceptualHash: hashes.perceptualHash,
        audioHash: hashes.audioHash
      },
      processingTime: `${hashDuration}ms`
    };

    // Log successful upload with hash summary
    console.log('[UPLOAD] ✓ Video processed successfully with 3-layer hashing');
    console.log(`[UPLOAD] Exact Hash: ${hashes.exactHash.substring(0, 16)}...`);
    console.log(`[UPLOAD] Perceptual Hash: ${hashes.perceptualHash.substring(0, 16)}...`);

    // Return success response with all hash data
    res.json({
      success: true,
      message: 'Video uploaded and hashed successfully',
      fileInfo: fileInfo
    });

  } catch (error) {
    // Log error details
    console.error('[UPLOAD ERROR]', error instanceof Error ? error.message : 'Unknown error');
    
    // Return error response
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while processing the upload'
    });
  }
});

/**
 * 404 Handler
 * Catches all undefined routes
 */
app.use('*', (req: Request, res: Response): void => {
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
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('[SERVER ERROR]', error);
  
  // Handle multer errors
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: 'File size exceeds the 100MB limit'
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: `Upload error: ${error.message}`
    });
    return;
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
const PORT: number = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, (): void => {
  console.log('=================================');
  console.log('VideoGuard Backend Server');
  console.log('=================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Upload endpoint: POST http://localhost:${PORT}/upload`);
  console.log('=================================');
  console.log('Waiting for requests...\n');
});

export default app;
