/**
 * IPFS Storage Module - Pinata Integration
 * 
 * This module handles pinning files to IPFS using Pinata's HTTP API.
 * Pinata provides reliable IPFS pinning with fast gateways and CDN support.
 * 
 * Features:
 * - Pin files to IPFS via Pinata
 * - Attach custom metadata (creator, timestamp, assetType)
 * - Generate gateway URLs for immediate access
 * - Support both JWT and API key/secret authentication
 * 
 * @module ipfs-storage
 */

import FormData from 'form-data';
import axios from 'axios';
import { Readable } from 'stream';

/**
 * IPFS pinning result containing CID and gateway URL
 */
export interface IpfsResult {
  cid: string;                  // IPFS Content Identifier
  gatewayUrl: string;           // Public gateway URL for immediate access
}

/**
 * Pinata API response structure
 */
interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Pin a file to IPFS using Pinata API
 * 
 * This function uploads any file (video, image, audio, text) to IPFS
 * using Pinata's pinning service. The file is permanently stored and
 * accessible via IPFS gateways.
 * 
 * Authentication Methods:
 * 1. JWT Token (preferred): Set PINATA_JWT environment variable
 * 2. API Key/Secret: Set PINATA_API_KEY and PINATA_API_SECRET
 * 
 * Performance: ~2-5 seconds depending on file size and network
 * 
 * @param buffer - The file content as a Buffer
 * @param fileName - Original filename (with extension)
 * @param mimeType - MIME type of the file (e.g., "video/mp4", "image/jpeg")
 * @param metadata - Optional metadata object to attach (creator, timestamp, etc.)
 * @returns Promise<IpfsResult> containing CID and gateway URL
 * 
 * @throws Error if Pinata credentials are missing or API request fails
 * 
 * @example
 * ```typescript
 * const result = await pinToIpfs(
 *   videoBuffer,
 *   "dance_video.mp4",
 *   "video/mp4",
 *   { 
 *     assetType: "video",
 *     exactHash: "a1b2c3...",
 *     creator: "alice.eth",
 *     timestamp: Date.now()
 *   }
 * );
 * 
 * console.log(`IPFS CID: ${result.cid}`);
 * console.log(`Gateway URL: ${result.gatewayUrl}`);
 * // Output:
 * // IPFS CID: QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx
 * // Gateway URL: https://gateway.pinata.cloud/ipfs/QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx
 * ```
 */
export async function pinToIpfs(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  metadata?: Record<string, any>
): Promise<IpfsResult> {
  console.log('\n[IPFS] Starting file pinning to IPFS via Pinata...');
  console.log(`[IPFS] File: ${fileName}`);
  console.log(`[IPFS] Size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`[IPFS] MIME Type: ${mimeType}`);
  
  const startTime = Date.now();

  try {
    // Check for Pinata credentials
    const pinataJWT = process.env.PINATA_JWT;
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataApiSecret = process.env.PINATA_API_SECRET;

    if (!pinataJWT && (!pinataApiKey || !pinataApiSecret)) {
      throw new Error(
        'Pinata credentials not found. ' +
        'Set PINATA_JWT or both PINATA_API_KEY and PINATA_API_SECRET in .env file'
      );
    }

    // Create FormData for multipart upload
    const formData = new FormData();

    // Convert buffer to readable stream for FormData
    const stream = Readable.from(buffer);
    formData.append('file', stream, {
      filename: fileName,
      contentType: mimeType
    });

    // Add optional metadata
    if (metadata) {
      const pinataMetadata = {
        name: fileName,
        keyvalues: {
          ...metadata,
          uploadedAt: new Date().toISOString()
        }
      };
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
    }

    // Configure pinning options (optional)
    const pinataOptions = {
      cidVersion: 1  // Use CIDv1 for better compatibility
    };
    formData.append('pinataOptions', JSON.stringify(pinataOptions));

    // Prepare authentication headers
    const headers: Record<string, string> = {
      ...formData.getHeaders()
    };

    if (pinataJWT) {
      headers['Authorization'] = `Bearer ${pinataJWT}`;
      console.log('[IPFS] Using JWT authentication');
    } else {
      headers['pinata_api_key'] = pinataApiKey!;
      headers['pinata_secret_api_key'] = pinataApiSecret!;
      console.log('[IPFS] Using API key/secret authentication');
    }

    // Make API request to Pinata
    console.log('[IPFS] Uploading to Pinata...');
    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      { headers }
    );

    const cid = response.data.IpfsHash;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    const duration = Date.now() - startTime;
    console.log(`[IPFS] ✓ File pinned successfully in ${duration}ms`);
    console.log(`[IPFS] CID: ${cid}`);
    console.log(`[IPFS] Gateway URL: ${gatewayUrl}`);
    console.log(`[IPFS] Pin Size: ${response.data.PinSize} bytes\n`);

    return {
      cid,
      gatewayUrl
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[IPFS ERROR] Pinning failed after ${duration}ms:`, error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('[IPFS ERROR] Pinata API response:', error.response.data);
        throw new Error(`Pinata API error: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('No response from Pinata API. Check network connection.');
      }
    }

    throw new Error(`IPFS pinning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve a file from IPFS by CID
 * 
 * @param cid - The IPFS Content Identifier
 * @returns Promise<Buffer> containing the file content
 */
export async function retrieveFromIpfs(cid: string): Promise<Buffer> {
  console.log(`[IPFS] Retrieving file from IPFS: ${cid}`);
  
  try {
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await axios.get(gatewayUrl, {
      responseType: 'arraybuffer'
    });

    console.log(`[IPFS] ✓ File retrieved successfully (${response.data.length} bytes)`);
    return Buffer.from(response.data);

  } catch (error) {
    console.error('[IPFS ERROR] File retrieval failed:', error);
    throw new Error(`IPFS retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a CID is pinned on Pinata
 * 
 * @param cid - The IPFS Content Identifier
 * @returns Promise<boolean> true if pinned, false otherwise
 */
export async function isPinned(cid: string): Promise<boolean> {
  try {
    const pinataJWT = process.env.PINATA_JWT;
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataApiSecret = process.env.PINATA_API_SECRET;

    if (!pinataJWT && (!pinataApiKey || !pinataApiSecret)) {
      throw new Error('Pinata credentials not found');
    }

    const headers: Record<string, string> = {};
    if (pinataJWT) {
      headers['Authorization'] = `Bearer ${pinataJWT}`;
    } else {
      headers['pinata_api_key'] = pinataApiKey!;
      headers['pinata_secret_api_key'] = pinataApiSecret!;
    }

    const response = await axios.get(
      `https://api.pinata.cloud/data/pinList?hashContains=${cid}`,
      { headers }
    );

    return response.data.count > 0;

  } catch (error) {
    console.error('[IPFS ERROR] Pin status check failed:', error);
    return false;
  }
}
