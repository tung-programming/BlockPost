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
import { pinToIpfs, pinJSONToIPFS } from './ipfs-storage.js';
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
  mediaCid: string;              // CID of the raw media file
  mediaGatewayUrl: string;       // Gateway URL for media file
  metadataCid: string;           // CID of the metadata JSON
  metadataGatewayUrl: string;    // Gateway URL for metadata JSON
  walletAddress: string;         // Creator's wallet address
  caption?: string;
  exactHash: string;
  perceptualHash: string;
  audioHash: string | null;
  assetType: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  status: 'ORIGINAL' | 'REPOST_DETECTED';
  originalCreator?: string;      // For reposts: original creator address
  matchType?: string;            // For reposts: type of match detected
  confidence?: number;           // For reposts: confidence percentage
  timestamp: string;
  onChain?: {                    // Blockchain data (only for originals)
    txHash: string;
    blockNumber: number;
    contractAddress: string;
    gasUsed: string;
  };
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
app.get('/posts', (_req: Request, res: Response): void => {
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
 * Asset Upload Endpoint
 * POST /upload
 * 
 * Accepts media file uploads (video, image, audio) via multipart/form-data
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Field name: "video" (for any media type)
 * - Additional fields: walletAddress (required), title, description
 * 
 * Response:
 * - Success: Returns status (REPOST_DETECTED or NEW_ASSET_REGISTERED) with IPFS and blockchain data
 * - Error: { success: false, error: "Error message" }
 */
app.post('/upload', upload.single('video'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      console.log('[UPLOAD] No file received in request');
      res.status(400).json({
        success: false,
        error: 'No file provided. Please upload a file with the field name "video".'
      });
      return;
    }

    // Extract wallet address and optional fields from request body
    const walletAddress = req.body.walletAddress || req.headers['x-wallet-address'] as string;
    const username = req.body.username || null;
    const displayName = req.body.displayName || null;
    const title = req.body.title || null;
    const description = req.body.description || null;

    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: 'Wallet address is required. Please provide walletAddress in request body or X-Wallet-Address header.'
      });
      return;
    }

    // Log upload details
    console.log('[UPLOAD] Asset file received:');
    console.log(`  - Original name: ${req.file.originalname}`);
    console.log(`  - MIME type: ${req.file.mimetype}`);
    console.log(`  - Size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Wallet: ${walletAddress}`);

    // PHASE 1: Generate all hashes using multi-asset detection
    console.log('[UPLOAD] Starting multi-asset hash generation...');
    const hashStartTime = Date.now();
    
    const hashResult = await computeHashes(req.file.buffer, req.file.mimetype);
    
    const hashDuration = Date.now() - hashStartTime;
    console.log(`[UPLOAD] ✓ Hash generation completed in ${hashDuration}ms`);
    console.log(`[UPLOAD] Asset Type: ${hashResult.assetType}`);

    // PHASE 2: Pin raw media file to IPFS
    console.log('[UPLOAD] Pinning media file to IPFS...');
    const mediaIpfsStart = Date.now();
    
    const mediaResult = await pinToIpfs(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      {
        assetType: hashResult.assetType,
        exactHash: hashResult.exactHash
      }
    );
    
    const mediaIpfsDuration = Date.now() - mediaIpfsStart;
    console.log(`[UPLOAD] ✓ Media file pinned: ${mediaResult.cid}`);

    // PHASE 3: Create and pin metadata JSON to IPFS
    console.log('[UPLOAD] Creating and pinning metadata JSON...');
    const metadataIpfsStart = Date.now();
    
    const metadata = {
      creator: walletAddress,
      creatorName: displayName || username || null,
      creatorUsername: username || null,
      createdAt: new Date().toISOString(),
      assetType: hashResult.assetType,
      mediaCid: mediaResult.cid,
      mediaMimeType: req.file.mimetype,
      title: title,
      description: description,
      fileName: req.file.originalname,
      fileSize: req.file.size
    };
    
    console.log('[UPLOAD] ✓ Metadata includes author info:', {
      creator: metadata.creator,
      creatorName: metadata.creatorName,
      creatorUsername: metadata.creatorUsername
    });

    const metadataResult = await pinJSONToIPFS(
      metadata,
      `metadata-${hashResult.exactHash.substring(0, 16)}`
    );
    
    const metadataIpfsDuration = Date.now() - metadataIpfsStart;
    const totalIpfsDuration = mediaIpfsDuration + metadataIpfsDuration;
    console.log(`[UPLOAD] ✓ Metadata JSON pinned: ${metadataResult.cid}`);

    // PHASE 4: Check blockchain mode
    const blockchainMode = process.env.BLOCKCHAIN_MODE || 'backend';
    
    if (blockchainMode === 'frontend') {
      // Frontend mode: Return hashes and IPFS data, let frontend handle blockchain
      const totalDuration = hashDuration + totalIpfsDuration;
      
      console.log(`[UPLOAD] ✓ Asset processed (frontend blockchain mode)`);
      console.log(`[UPLOAD] Hashes generated, IPFS uploaded (media + metadata)`);
      console.log(`[UPLOAD] Frontend will handle blockchain transaction\n`);
      
      res.json({
        success: true,
        status: 'READY_FOR_BLOCKCHAIN',
        assetType: hashResult.assetType,
        fileInfo: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          sizeInMB: (req.file.size / (1024 * 1024)).toFixed(2)
        },
        hashes: {
          exactHash: hashResult.exactHash,
          perceptualHash: hashResult.perceptualHash,
          audioHash: hashResult.audioHash
        },
        ipfs: {
          mediaCid: mediaResult.cid,
          mediaGatewayUrl: mediaResult.gatewayUrl,
          metadataCid: metadataResult.cid,
          metadataGatewayUrl: metadataResult.gatewayUrl
        },
        processingTime: {
          hashing: `${hashDuration}ms`,
          ipfs: `${totalIpfsDuration}ms`,
          total: `${totalDuration}ms`
        }
      });
      return;
    }

    // Backend mode: Server handles blockchain transactions
    console.log('[UPLOAD] Backend blockchain mode - detecting repost...');
    const blockchainStartTime = Date.now();
    
    const detectResult = await detectRepostOnChain(
      hashResult.exactHash,
      hashResult.perceptualHash,
      hashResult.audioHash || 'no_audio'
    );

    const blockchainDuration = Date.now() - blockchainStartTime;

    if (detectResult.isDuplicate) {
      // REPOST DETECTED - Do not register on blockchain, but allow upload
      const totalDuration = hashDuration + totalIpfsDuration + blockchainDuration;
      
      console.log(`[UPLOAD] ⚠️  REPOST DETECTED!`);
      console.log(`[UPLOAD] Original Creator: ${detectResult.originalCreator}`);
      console.log(`[UPLOAD] Match Type: ${detectResult.matchType}`);
      console.log(`[UPLOAD] Confidence: ${detectResult.confidence}%`);
      console.log(`[UPLOAD] Upload allowed but NOT registered on-chain`);
      console.log(`[UPLOAD] Total processing time: ${totalDuration}ms\n`);

      // Store in memory as a repost
      const repostEntry: Post = {
        id: `repost-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        mediaCid: mediaResult.cid,
        mediaGatewayUrl: mediaResult.gatewayUrl,
        metadataCid: metadataResult.cid,
        metadataGatewayUrl: metadataResult.gatewayUrl,
        walletAddress: walletAddress,
        caption: title || undefined,
        exactHash: hashResult.exactHash,
        perceptualHash: hashResult.perceptualHash,
        audioHash: hashResult.audioHash,
        assetType: hashResult.assetType,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        status: 'REPOST_DETECTED',
        originalCreator: detectResult.originalCreator,
        matchType: detectResult.matchType,
        confidence: detectResult.confidence,
        timestamp: new Date().toISOString()
      };
      posts.push(repostEntry);

      res.json({
        success: true,
        status: 'REPOST_DETECTED',
        assetType: hashResult.assetType,
        fileInfo: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          sizeInMB: (req.file.size / (1024 * 1024)).toFixed(2)
        },
        hashes: {
          exactHash: hashResult.exactHash,
          perceptualHash: hashResult.perceptualHash,
          audioHash: hashResult.audioHash
        },
        ipfs: {
          mediaCid: mediaResult.cid,
          mediaGatewayUrl: mediaResult.gatewayUrl,
          metadataCid: metadataResult.cid,
          metadataGatewayUrl: metadataResult.gatewayUrl
        },
        repost: {
          originalCreator: detectResult.originalCreator,
          matchType: detectResult.matchType,
          confidence: detectResult.confidence
        },
        processingTime: {
          hashing: `${hashDuration}ms`,
          ipfs: `${totalIpfsDuration}ms`,
          blockchain: `${blockchainDuration}ms`,
          total: `${totalDuration}ms`
        }
      });
      return;
    }

    // PHASE 5: NEW ASSET - Register on blockchain (use metadataCid, not mediaCid)
    console.log('[UPLOAD] New asset detected, registering on blockchain...');
    
    const receipt = await registerAssetOnChain({
      exactHash: hashResult.exactHash,
      perceptualHash: hashResult.perceptualHash,
      audioHash: hashResult.audioHash || 'no_audio',
      ipfsCid: metadataResult.cid,  // Store metadata CID on-chain, NOT media CID
      assetType: hashResult.assetType
    });

    const totalBlockchainDuration = Date.now() - blockchainStartTime;
    const totalDuration = hashDuration + totalIpfsDuration + totalBlockchainDuration;

    console.log(`[UPLOAD] ✓ NEW ASSET REGISTERED!`);
    console.log(`[UPLOAD] Transaction Hash: ${receipt.hash}`);
    console.log(`[UPLOAD] Block Number: ${receipt.blockNumber}`);
    console.log(`[UPLOAD] Metadata CID stored on-chain: ${metadataResult.cid}`);
    console.log(`[UPLOAD] Total processing time: ${totalDuration}ms\n`);

    // Store in memory as original
    const originalEntry: Post = {
      id: `original-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      mediaCid: mediaResult.cid,
      mediaGatewayUrl: mediaResult.gatewayUrl,
      metadataCid: metadataResult.cid,
      metadataGatewayUrl: metadataResult.gatewayUrl,
      walletAddress: walletAddress,
      caption: title || undefined,
      exactHash: hashResult.exactHash,
      perceptualHash: hashResult.perceptualHash,
      audioHash: hashResult.audioHash,
      assetType: hashResult.assetType,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'ORIGINAL',
      timestamp: new Date().toISOString(),
      onChain: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber || 0,
        contractAddress: process.env.CONTRACT_ADDRESS || '',
        gasUsed: receipt.gasUsed.toString()
      }
    };
    posts.push(originalEntry);

    res.json({
      success: true,
      status: 'NEW_ASSET_REGISTERED',
      assetType: hashResult.assetType,
      fileInfo: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        sizeInMB: (req.file.size / (1024 * 1024)).toFixed(2)
      },
      hashes: {
        exactHash: hashResult.exactHash,
        perceptualHash: hashResult.perceptualHash,
        audioHash: hashResult.audioHash
      },
      ipfs: {
        mediaCid: mediaResult.cid,
        mediaGatewayUrl: mediaResult.gatewayUrl,
        metadataCid: metadataResult.cid,
        metadataGatewayUrl: metadataResult.gatewayUrl
      },
      onChain: {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        contractAddress: process.env.CONTRACT_ADDRESS,
        gasUsed: receipt.gasUsed.toString()
      },
      processingTime: {
        hashing: `${hashDuration}ms`,
        ipfs: `${totalIpfsDuration}ms`,
        blockchain: `${totalBlockchainDuration}ms`,
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
 * Register Post After Frontend Blockchain Transaction
 * POST /register-post
 * 
 * Called by frontend after successful blockchain transaction to store post in backend
 * 
 * Request body:
 * - status: 'ORIGINAL' | 'REPOST_DETECTED'
 * - mediaCid, metadataCid, walletAddress, hashes, etc.
 */
app.post('/register-post', express.json(), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      mediaCid,
      mediaGatewayUrl,
      metadataCid,
      metadataGatewayUrl,
      walletAddress,
      exactHash,
      perceptualHash,
      audioHash,
      assetType,
      mimeType,
      fileName,
      fileSize,
      title,
      onChain,
      repost
    } = req.body;

    const newPost: Post = {
      id: `${status === 'ORIGINAL' ? 'original' : 'repost'}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      mediaCid,
      mediaGatewayUrl,
      metadataCid,
      metadataGatewayUrl,
      walletAddress,
      caption: title || undefined,
      exactHash,
      perceptualHash,
      audioHash,
      assetType,
      mimeType,
      fileName,
      fileSize,
      status,
      timestamp: new Date().toISOString(),
      ...(status === 'REPOST_DETECTED' && repost && {
        originalCreator: repost.originalCreator,
        matchType: repost.matchType,
        confidence: repost.confidence
      }),
      ...(status === 'ORIGINAL' && onChain && {
        onChain: {
          txHash: onChain.txHash,
          blockNumber: onChain.blockNumber,
          contractAddress: onChain.contractAddress,
          gasUsed: onChain.gasUsed
        }
      })
    };

    posts.push(newPost);

    console.log(`[REGISTER POST] ✓ Post registered: ${newPost.id} (${status})`);
    console.log(`[REGISTER POST] Asset Type: ${assetType}`);
    console.log(`[REGISTER POST] Media CID: ${mediaCid}`);
    console.log(`[REGISTER POST] Metadata CID: ${metadataCid}`);
    console.log(`[REGISTER POST] Total posts in array: ${posts.length}`);
    console.log(`[REGISTER POST] Full post data:`, JSON.stringify(newPost, null, 2));

    res.json({
      success: true,
      message: 'Post registered successfully',
      postId: newPost.id
    });

  } catch (error) {
    console.error('[REGISTER POST ERROR]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register post'
    });
  }
});

/**
 * Assets/Feed Listing Endpoint
 * GET /assets
 * 
 * Returns a list of all uploaded assets (both original and reposts)
 * with complete IPFS and blockchain data.
 * 
 * In production, this would fetch from contract events or a decentralized database.
 * For now, returns in-memory posts array.
 * 
 * Response:
 * - Success: { success: true, count: number, assets: AssetSummary[] }
 */
app.get('/assets', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Sort by timestamp (newest first)
    const sortedAssets = [...posts].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`[GET ASSETS] Total posts in memory: ${posts.length}`);
    console.log(`[GET ASSETS] Returning ${sortedAssets.length} assets`);
    console.log(`[GET ASSETS] Asset types:`, sortedAssets.map(a => a.assetType).join(', '));
    console.log(`[GET ASSETS] Asset IDs:`, sortedAssets.map(a => a.id).join(', '));

    res.json({
      success: true,
      count: sortedAssets.length,
      assets: sortedAssets.map(post => ({
        id: post.id,
        assetType: post.assetType,
        mediaCid: post.mediaCid,
        mediaGatewayUrl: post.mediaGatewayUrl,
        metadataCid: post.metadataCid,
        metadataGatewayUrl: post.metadataGatewayUrl,
        hashes: {
          exactHash: post.exactHash,
          perceptualHash: post.perceptualHash,
          audioHash: post.audioHash
        },
        status: post.status,
        timestamp: post.timestamp,
        // Include repost info if it's a repost
        ...(post.status === 'REPOST_DETECTED' && {
          repost: {
            originalCreator: post.originalCreator,
            matchType: post.matchType,
            confidence: post.confidence
          }
        }),
        // Include blockchain data if it's an original
        ...(post.status === 'ORIGINAL' && post.onChain && {
          onChain: post.onChain
        })
      }))
    });
  } catch (error) {
    console.error('[GET ASSETS ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assets'
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
