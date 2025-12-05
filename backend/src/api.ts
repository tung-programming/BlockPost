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
import { detectRepostOnChain, registerAssetOnChain } from './blockchain.js';

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
  gatewayUrl: string;
  walletAddress: string;
  caption?: string;
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

    // Extract file information
    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sizeInMB: (req.file.size / (1024 * 1024)).toFixed(2),
      uploadedAt: new Date().toISOString()
    };

    // PHASE 4: Blockchain Integration - Detect repost and register if new
    const blockchainMode = process.env.BLOCKCHAIN_MODE || 'backend';
    
    if (blockchainMode === 'frontend') {
      // Frontend mode: Return hashes and IPFS data, let frontend handle blockchain
      const totalDuration = hashDuration + ipfsDuration;
      
      console.log(`[UPLOAD] ✓ Asset processed (frontend blockchain mode)`);
      console.log(`[UPLOAD] Hashes generated, IPFS uploaded`);
      console.log(`[UPLOAD] Frontend will handle blockchain transaction\n`);
      
      res.json({
        success: true,
        status: 'READY_FOR_BLOCKCHAIN',
        assetType: hashResult.assetType,
        fileInfo: fileInfo,
        hashes: {
          exactHash: hashResult.exactHash,
          perceptualHash: hashResult.perceptualHash,
          audioHash: hashResult.audioHash
        },
        ipfs: {
          cid: ipfsResult.cid,
          gatewayUrl: ipfsResult.gatewayUrl
        },
        processingTime: {
          hashing: `${hashDuration}ms`,
          ipfs: `${ipfsDuration}ms`,
          total: `${totalDuration}ms`
        }
      });
      return;
    }
    
    // Backend mode: Server handles blockchain transaction
    try {
      console.log('[UPLOAD] Starting blockchain interaction...');
      const blockchainStartTime = Date.now();

      // Step 1: Check if this asset already exists on-chain
      const detectResult = await detectRepostOnChain(
        hashResult.exactHash,
        hashResult.perceptualHash,
        hashResult.audioHash
      );

      const blockchainDuration = Date.now() - blockchainStartTime;

      if (detectResult.isDuplicate) {
        // REPOST DETECTED - Do not register, return original creator info
        const totalDuration = hashDuration + ipfsDuration + blockchainDuration;
        
        console.log(`[UPLOAD] ⚠️  REPOST DETECTED!`);
        console.log(`[UPLOAD] Original Creator: ${detectResult.originalCreator}`);
        console.log(`[UPLOAD] Match Type: ${detectResult.matchType}`);
        console.log(`[UPLOAD] Confidence: ${detectResult.confidence}%`);
        console.log(`[UPLOAD] Total processing time: ${totalDuration}ms\n`);

        res.json({
          success: true,
          status: 'REPOST_DETECTED',
          assetType: hashResult.assetType,
          fileInfo: fileInfo,
          hashes: {
            exactHash: hashResult.exactHash,
            perceptualHash: hashResult.perceptualHash,
            audioHash: hashResult.audioHash
          },
          ipfs: {
            cid: ipfsResult.cid,
            gatewayUrl: ipfsResult.gatewayUrl
          },
          repost: {
            originalCreator: detectResult.originalCreator,
            matchType: detectResult.matchType,
            confidence: detectResult.confidence
          },
          processingTime: {
            hashing: `${hashDuration}ms`,
            ipfs: `${ipfsDuration}ms`,
            blockchain: `${blockchainDuration}ms`,
            total: `${totalDuration}ms`
          }
        });

      } else {
        // NEW ASSET - Register on blockchain
        console.log('[UPLOAD] New asset detected, registering on blockchain...');
        
        const receipt = await registerAssetOnChain({
          exactHash: hashResult.exactHash,
          perceptualHash: hashResult.perceptualHash,
          audioHash: hashResult.audioHash,
          ipfsCid: ipfsResult.cid,
          assetType: hashResult.assetType
        });

        const totalBlockchainDuration = Date.now() - blockchainStartTime;
        const totalDuration = hashDuration + ipfsDuration + totalBlockchainDuration;

        console.log(`[UPLOAD] ✓ NEW ASSET REGISTERED!`);
        console.log(`[UPLOAD] Transaction Hash: ${receipt.hash}`);
        console.log(`[UPLOAD] Block Number: ${receipt.blockNumber}`);
        console.log(`[UPLOAD] Total processing time: ${totalDuration}ms\n`);

        res.json({
          success: true,
          status: 'NEW_ASSET_REGISTERED',
          assetType: hashResult.assetType,
          fileInfo: fileInfo,
          hashes: {
            exactHash: hashResult.exactHash,
            perceptualHash: hashResult.perceptualHash,
            audioHash: hashResult.audioHash
          },
          ipfs: {
            cid: ipfsResult.cid,
            gatewayUrl: ipfsResult.gatewayUrl
          },
          onChain: {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            contractAddress: process.env.CONTRACT_ADDRESS,
            gasUsed: receipt.gasUsed.toString()
          },
          processingTime: {
            hashing: `${hashDuration}ms`,
            ipfs: `${ipfsDuration}ms`,
            blockchain: `${totalBlockchainDuration}ms`,
            total: `${totalDuration}ms`
          }
        });
      }

    } catch (blockchainError) {
      // Blockchain interaction failed, but we still have the IPFS upload
      console.error('[UPLOAD] Blockchain interaction failed:', blockchainError);
      console.error('[UPLOAD] Asset hashes and IPFS CID:', {
        exactHash: hashResult.exactHash,
        perceptualHash: hashResult.perceptualHash,
        audioHash: hashResult.audioHash,
        ipfsCid: ipfsResult.cid
      });

      res.status(500).json({
        success: false,
        message: 'Blockchain interaction failed',
        error: blockchainError instanceof Error ? blockchainError.message : 'Unknown blockchain error',
        partialSuccess: {
          hashes: {
            exactHash: hashResult.exactHash,
            perceptualHash: hashResult.perceptualHash,
            audioHash: hashResult.audioHash
          },
          ipfs: {
            cid: ipfsResult.cid,
            gatewayUrl: ipfsResult.gatewayUrl
          }
        }
      });
      return;
    }

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
 * Assets Listing Endpoint
 * GET /assets
 * 
 * Returns a list of registered assets from the blockchain
 * TODO: Implement fetching from contract events or cache
 * 
 * Response:
 * - Success: { assets: [] }
 */
app.get('/assets', async (_req: Request, res: Response): Promise<void> => {
  // TODO: later fetch recent assets from contract events or a cache
  res.json({ 
    assets: [],
    message: 'Asset listing not yet implemented. Will fetch from contract events.'
  });
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
