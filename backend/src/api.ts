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
import { computeHashes } from './hash-engine.js';
import { pinToIpfs } from './ipfs-storage.js';

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app: Application = express();

// ============ IN-MEMORY STORAGE ============
/**
 * In-memory posts storage
 * In production, this would be replaced with a blockchain smart contract
 * or decentralized database. For MVP, we store post metadata in memory.
 */
interface Post {
  id: string;
  ipfsCid: string;
  metadataCid: string;
  gatewayUrl: string;
  metadataUrl: string;
  walletAddress: string;
  title?: string;
  description?: string;
  exactHash: string;
  perceptualHash: string;
  audioHash: string | null;
  assetType: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  status: 'ORIGINAL' | 'EXACT_DUPLICATE' | 'VISUAL_MATCH' | 'AUDIO_MATCH';
  timestamp: string;
}

const posts: Post[] = [];

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
 * Validates uploaded files for multi-asset support
 * Accepts: video, image, audio, and other file types
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  // Supported asset types
  const allowedMimeTypes: string[] = [
    // Video formats
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
    'video/x-flv',
    
    // Image formats
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    
    // Audio formats
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/flac',
    
    // Document/Other formats
    'application/pdf',
    'text/plain',
    'application/json',
    'application/zip',
    'application/x-rar-compressed'
  ];

  // Check if MIME type is in allowed list OR starts with video/image/audio
  const isAllowed = 
    allowedMimeTypes.includes(file.mimetype) ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype.startsWith('text/') ||
    file.mimetype.startsWith('application/');

  if (isAllowed) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error(`Invalid file type: ${file.mimetype}. Please upload a valid video, image, audio, or document file.`));
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
app.get('/health', (_req: Request, res: Response): void => {
  res.json({ 
    status: 'ok', 
    message: 'VideoGuard Backend API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get All Posts Endpoint
 * GET /posts
 * 
 * Returns all posts sorted by timestamp (newest first)
 * Each post contains IPFS CID and metadata
 * 
 * Response:
 * - Success: { success: true, posts: [...] }
 * - Error: { success: false, error: "Error message" }
 */
app.get('/posts', (req: Request, res: Response): void => {
  try {
    // Sort posts by timestamp (newest first)
    const sortedPosts = [...posts].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`[GET POSTS] Returning ${sortedPosts.length} posts`);

    res.json({
      success: true,
      count: sortedPosts.length,
      posts: sortedPosts
    });
  } catch (error) {
    console.error('[GET POSTS ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts'
    });
  }
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
    console.log('[UPLOAD] Asset file received:');
    console.log(`  - Original name: ${req.file.originalname}`);
    console.log(`  - MIME type: ${req.file.mimetype}`);
    console.log(`  - Size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Buffer length: ${req.file.buffer.length} bytes`);

    // PHASE 2: Generate all hashes using multi-asset detection
    console.log('[UPLOAD] Starting multi-asset hash generation...');
    const hashStartTime = Date.now();
    
    const hashResult = await computeHashes(req.file.buffer, req.file.mimetype);
    
    const hashDuration = Date.now() - hashStartTime;
    console.log(`[UPLOAD] ✓ Hash generation completed in ${hashDuration}ms`);
    console.log(`[UPLOAD] Asset Type: ${hashResult.assetType}`);

    // PHASE 3: Pin to IPFS via Pinata
    console.log('[UPLOAD] Starting IPFS pinning...');
    const ipfsStartTime = Date.now();
    
    const ipfsResult = await pinToIpfs(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      {
        assetType: hashResult.assetType,
        exactHash: hashResult.exactHash,
        uploadedAt: new Date().toISOString()
      }
    );
    
    const ipfsDuration = Date.now() - ipfsStartTime;
    console.log(`[UPLOAD] ✓ IPFS pinning completed in ${ipfsDuration}ms`);

    // PHASE 4: Create and pin metadata JSON
    console.log('[UPLOAD] Creating metadata JSON...');
    const metadataStartTime = Date.now();
    
    const createdAt = new Date().toISOString();
    
    const metadata = {
      assetType: hashResult.assetType,
      author: req.body.walletAddress || 'anonymous',
      createdAt: createdAt,
      title: req.body.title || req.file.originalname,
      description: req.body.description || req.body.caption || '',
      hashes: {
        exactHash: hashResult.exactHash,
        perceptualHash: hashResult.perceptualHash || (hashResult.assetType === 'audio' || hashResult.assetType === 'text' ? 'no_video' : ''),
        audioHash: hashResult.audioHash || (hashResult.assetType === 'image' || hashResult.assetType === 'text' ? 'no_audio' : '')
      },
      media: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeInMB: parseFloat((req.file.size / (1024 * 1024)).toFixed(2)),
        cid: ipfsResult.cid,
        gatewayUrl: ipfsResult.gatewayUrl
      }
    };

    // Pin metadata JSON to IPFS
    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
    const metadataResult = await pinToIpfs(
      metadataBuffer,
      `metadata_${req.file.originalname}.json`,
      'application/json',
      {
        assetType: 'metadata',
        relatedAssetCid: ipfsResult.cid,
        author: req.body.walletAddress || 'anonymous',
        uploadedAt: createdAt
      }
    );

    const metadataDuration = Date.now() - metadataStartTime;
    console.log(`[UPLOAD] ✓ Metadata JSON pinned in ${metadataDuration}ms`);
    console.log(`[UPLOAD] Metadata CID: ${metadataResult.cid}`);

    // Log blockchain registration data (not actually sent yet)
    console.log('\n[BLOCKCHAIN] Would register on Polygon with:');
    console.log(JSON.stringify({
      action: 'REGISTER_ASSET',
      exactHash: hashResult.exactHash,
      perceptualHash: hashResult.perceptualHash,
      audioHash: hashResult.audioHash,
      ipfsCid: ipfsResult.cid,
      metadataCid: metadataResult.cid,
      assetType: hashResult.assetType
    }, null, 2));
    console.log('[BLOCKCHAIN] (Actual contract call will be implemented in next phase)\n');

    // Extract file information with all data
    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sizeInMB: (req.file.size / (1024 * 1024)).toFixed(2),
      uploadedAt: new Date().toISOString()
    };

    const totalDuration = hashDuration + ipfsDuration + metadataDuration;
    console.log(`[UPLOAD] ✓ Asset processed successfully!`);
    console.log(`[UPLOAD] Total processing time: ${totalDuration}ms`);
    console.log(`[UPLOAD] Exact Hash: ${hashResult.exactHash.substring(0, 16)}...`);
    console.log(`[UPLOAD] Perceptual Hash: ${hashResult.perceptualHash.substring(0, 16)}...`);
    console.log(`[UPLOAD] IPFS CID: ${ipfsResult.cid}\n`);

    // Check for duplicate content
    let status: 'ORIGINAL' | 'EXACT_DUPLICATE' | 'VISUAL_MATCH' | 'AUDIO_MATCH' = 'ORIGINAL';
    
    for (const existingPost of posts) {
      if (existingPost.exactHash === hashResult.exactHash) {
        status = 'EXACT_DUPLICATE';
        break;
      }
      if (hashResult.perceptualHash && existingPost.perceptualHash === hashResult.perceptualHash) {
        status = 'VISUAL_MATCH';
        break;
      }
      if (hashResult.audioHash && existingPost.audioHash === hashResult.audioHash) {
        status = 'AUDIO_MATCH';
        break;
      }
    }

    // Store post in memory
    const newPost: Post = {
      id: Date.now().toString(),
      ipfsCid: ipfsResult.cid,
      metadataCid: metadataResult.cid,
      gatewayUrl: ipfsResult.gatewayUrl,
      metadataUrl: metadataResult.gatewayUrl,
      walletAddress: req.body.walletAddress || 'anonymous',
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      exactHash: hashResult.exactHash,
      perceptualHash: hashResult.perceptualHash,
      audioHash: hashResult.audioHash,
      assetType: hashResult.assetType,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: status,
      timestamp: createdAt
    };

    posts.push(newPost);
    console.log(`[UPLOAD] ✓ Post stored with status: ${status}`);
    console.log(`[UPLOAD] Total posts in memory: ${posts.length}\n`);

    // Return success response with all data
    res.json({
      success: true,
      message: 'Asset uploaded, hashed, and pinned to IPFS successfully',
      post: newPost,
      metadata: metadata,
      assetType: hashResult.assetType,
      fileInfo: fileInfo,
      hashes: {
        exactHash: hashResult.exactHash,
        perceptualHash: hashResult.perceptualHash,
        audioHash: hashResult.audioHash
      },
      ipfs: {
        cid: ipfsResult.cid,
        gatewayUrl: ipfsResult.gatewayUrl,
        metadataCid: metadataResult.cid,
        metadataUrl: metadataResult.gatewayUrl
      },
      status: status,
      processingTime: {
        hashing: `${hashDuration}ms`,
        ipfs: `${ipfsDuration}ms`,
        metadata: `${metadataDuration}ms`,
        total: `${totalDuration}ms`
      }
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
app.use((error: Error, _req: Request, res: Response, _next: NextFunction): void => {
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
