/**
 * Blockchain Integration Module - VideoGuard Smart Contract
 * 
 * This module provides TypeScript interfaces for interacting with the
 * VideoGuard smart contract deployed on Polygon Amoy testnet.
 * 
 * Features:
 * - Repost detection using on-chain hash comparison
 * - Asset registration with ownership tracking
 * - Type-safe contract interactions using ethers.js v6
 * 
 * @module blockchain
 */

import { ethers } from 'ethers';
import contractData from './VideoGuardContract.json';

/**
 * Result of detecting whether an asset is a repost
 */
export interface DetectResult {
  isDuplicate: boolean;
  originalCreator: string;
  matchType: string;    // e.g. "EXACT_DUPLICATE", "VISUAL_MATCH", "AUDIO_MATCH", "NEW_ASSET"
  confidence: number;   // e.g. 100, 95, 92, 0
}

/**
 * Contract interaction response structure from smart contract
 * Matches the actual detectRepost return values from VideoGuard.sol
 */
interface ContractDetectResponse {
  isRepost: boolean;
  originalCreator: string;
  originalIpfsHash: string;
  matchType: string;
  originalHash: string;
}

/**
 * Get initialized contract instance with signer
 * 
 * @returns ethers.Contract instance connected to VideoGuard contract
 * @throws Error if environment variables are missing or invalid
 */
export function getContract(): ethers.Contract {
  const rpcUrl = process.env.POLYGON_RPC;
  const privateKey = process.env.BACKEND_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS || contractData.address;

  if (!rpcUrl) {
    throw new Error('POLYGON_RPC not found in environment variables');
  }

  if (!privateKey) {
    throw new Error('BACKEND_PRIVATE_KEY or PRIVATE_KEY not found in environment variables');
  }

  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS not found in environment variables or contract data');
  }

  console.log('[BLOCKCHAIN] Initializing contract connection...');
  console.log(`[BLOCKCHAIN] RPC: ${rpcUrl}`);
  console.log(`[BLOCKCHAIN] Contract: ${contractAddress}`);

  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Normalize private key (add 0x prefix if missing)
  const normalizedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

  // Create signer
  const signer = new ethers.Wallet(normalizedPrivateKey, provider);

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, contractData.abi, signer);

  console.log(`[BLOCKCHAIN] ✓ Contract initialized with signer: ${signer.address}`);

  return contract;
}

/**
 * Normalize hash to 0x-prefixed format
 * 
 * @param hash - Hash string (with or without 0x prefix)
 * @returns Hash with 0x prefix
 */
function normalizeHash(hash: string): string {
  if (hash.startsWith('0x')) {
    return hash;
  }
  return `0x${hash}`;
}

/**
 * Detect if an asset is a repost by checking on-chain records
 * 
 * Calls the smart contract's detectRepost function which compares:
 * - Exact hash (SHA-256) - 100% confidence match
 * - Perceptual hash (dHash) - 95% confidence for visual similarity
 * - Audio hash (fingerprint) - 92% confidence for audio similarity
 * 
 * @param exactHash - SHA-256 hash of the asset
 * @param perceptualHash - dHash perceptual hash (or "no_video" for non-visual assets)
 * @param audioHash - Audio fingerprint (or "no_audio" for silent assets)
 * @returns DetectResult with duplicate status and original creator info
 * 
 * @example
 * ```typescript
 * const result = await detectRepostOnChain(
 *   "a1b2c3d4...",
 *   "1010110011...",
 *   "audio_fp_..."
 * );
 * 
 * if (result.isDuplicate) {
 *   console.log(`Repost detected! Original: ${result.originalCreator}`);
 *   console.log(`Match type: ${result.matchType}, Confidence: ${result.confidence}%`);
 * }
 * ```
 */
export async function detectRepostOnChain(
  exactHash: string,
  perceptualHash: string,
  audioHash: string
): Promise<DetectResult> {
  console.log('\n[BLOCKCHAIN] Calling detectRepost on smart contract...');
  console.log(`[BLOCKCHAIN] Exact Hash: ${exactHash.substring(0, 16)}...`);
  console.log(`[BLOCKCHAIN] Perceptual Hash: ${perceptualHash.substring(0, 16)}...`);
  console.log(`[BLOCKCHAIN] Audio Hash: ${audioHash.substring(0, 16)}...`);

  const startTime = Date.now();

  try {
    const contract = getContract();

    // Normalize exact hash to 0x format (contract expects bytes32)
    const normalizedExactHash = normalizeHash(exactHash);

    // Call contract view function (no gas cost)
    const result: any = await contract.detectRepost(
      normalizedExactHash,
      perceptualHash,
      audioHash
    );

    const duration = Date.now() - startTime;

    // Handle contract response - check multiple possible field names
    const isRepost = result.isRepost ?? result.isDuplicate ?? result[0] ?? false;
    const originalCreator = result.originalCreator ?? result.creator ?? result[1] ?? '0x0000000000000000000000000000000000000000';
    const matchType = result.matchType ?? result[3] ?? 'NONE';

    console.log('[BLOCKCHAIN] Raw contract response:', JSON.stringify(result, null, 2));

    const detectResult: DetectResult = {
      isDuplicate: Boolean(isRepost),
      originalCreator: originalCreator,
      matchType: matchType,
      confidence: matchType === 'EXACT_MATCH' ? 100 : matchType === 'PERCEPTUAL_MATCH' ? 95 : matchType === 'AUDIO_MATCH' ? 92 : 0
    };

    console.log(`[BLOCKCHAIN] ✓ Detection completed in ${duration}ms`);
    console.log(`[BLOCKCHAIN] Is Duplicate: ${detectResult.isDuplicate}`);
    if (detectResult.isDuplicate) {
      console.log(`[BLOCKCHAIN] Original Creator: ${detectResult.originalCreator}`);
      console.log(`[BLOCKCHAIN] Match Type: ${detectResult.matchType}`);
      console.log(`[BLOCKCHAIN] Confidence: ${detectResult.confidence}%`);
    }
    console.log('');

    return detectResult;

  } catch (error) {
    console.error('[BLOCKCHAIN ERROR] detectRepost failed:', error);
    throw new Error(`Repost detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Register a new asset on the blockchain
 * 
 * Creates an on-chain ownership record for a new asset.
 * This function costs gas and requires the backend wallet to have MATIC.
 * 
 * @param params - Asset registration parameters
 * @param params.exactHash - SHA-256 hash
 * @param params.perceptualHash - dHash or "no_video"
 * @param params.audioHash - Audio fingerprint or "no_audio"
 * @param params.ipfsCid - IPFS Content Identifier
 * @param params.assetType - "video", "image", "audio", or "other"
 * @returns Transaction receipt with confirmation details
 * 
 * @example
 * ```typescript
 * const receipt = await registerAssetOnChain({
 *   exactHash: "a1b2c3d4...",
 *   perceptualHash: "1010110011...",
 *   audioHash: "audio_fp_...",
 *   ipfsCid: "QmXxXxXx...",
 *   assetType: "video"
 * });
 * 
 * console.log(`Registered! TX: ${receipt.hash}`);
 * console.log(`Block: ${receipt.blockNumber}`);
 * console.log(`Gas used: ${receipt.gasUsed.toString()}`);
 * ```
 */
export async function registerAssetOnChain(params: {
  exactHash: string;
  perceptualHash: string;
  audioHash: string;
  ipfsCid: string;
  assetType: string;
}): Promise<ethers.TransactionReceipt> {
  console.log('\n[BLOCKCHAIN] Registering new asset on smart contract...');
  console.log(`[BLOCKCHAIN] Asset Type: ${params.assetType}`);
  console.log(`[BLOCKCHAIN] IPFS CID: ${params.ipfsCid}`);
  console.log(`[BLOCKCHAIN] Exact Hash: ${params.exactHash.substring(0, 16)}...`);

  const startTime = Date.now();

  try {
    const contract = getContract();

    // Normalize exact hash to 0x format
    const normalizedExactHash = normalizeHash(params.exactHash);

    // Call contract function (costs gas)
    // Note: Contract registerVideo takes 4 params: exactHash, perceptualHash, audioFingerprint, ipfsHash
    console.log('[BLOCKCHAIN] Sending transaction...');
    const tx = await contract.registerVideo(
      normalizedExactHash,
      params.perceptualHash,
      params.audioHash,
      params.ipfsCid
    );

    console.log(`[BLOCKCHAIN] Transaction sent: ${tx.hash}`);
    console.log('[BLOCKCHAIN] Waiting for confirmation (1 block)...');

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);

    const duration = Date.now() - startTime;

    console.log(`[BLOCKCHAIN] ✓ Asset registered in ${duration}ms`);
    console.log(`[BLOCKCHAIN] Transaction Hash: ${receipt.hash}`);
    console.log(`[BLOCKCHAIN] Block Number: ${receipt.blockNumber}`);
    console.log(`[BLOCKCHAIN] Gas Used: ${receipt.gasUsed.toString()}`);
    console.log('');

    return receipt;

  } catch (error) {
    console.error('[BLOCKCHAIN ERROR] registerAsset failed:', error);
    throw new Error(`Asset registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
