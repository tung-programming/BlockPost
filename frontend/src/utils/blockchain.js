/**
 * Frontend Blockchain Utilities
 * Handles MetaMask interaction and smart contract calls
 */

import { ethers } from 'ethers';
import contractABI from '../VideoGuardContract.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const POLYGON_RPC = import.meta.env.VITE_POLYGON_RPC;
const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || '80002');

/**
 * Connect to MetaMask and get signer
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed. Please install MetaMask browser extension.');
  }

  try {
    console.log('[BLOCKCHAIN] Connecting to MetaMask...');
    
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('[BLOCKCHAIN] Connected accounts:', accounts);
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    console.log('[BLOCKCHAIN] Provider created');
    
    const signer = await provider.getSigner();
    console.log('[BLOCKCHAIN] Signer obtained');
    
    const address = await signer.getAddress();
    console.log('[BLOCKCHAIN] Wallet address:', address);
    
    // Check if on correct network
    const network = await provider.getNetwork();
    console.log('[BLOCKCHAIN] Current network:', network.chainId.toString(), network.name);
    
    if (Number(network.chainId) !== CHAIN_ID) {
      console.log('[BLOCKCHAIN] Wrong network, switching to Polygon Amoy...');
      await switchToPolygonAmoy();
      // Reconnect after network switch
      return await connectWallet();
    }
    
    console.log('[BLOCKCHAIN] ✓ Wallet connected successfully');
    return { provider, signer, address };
  } catch (error) {
    console.error('[BLOCKCHAIN ERROR] Failed to connect wallet:', error);
    throw new Error(error.message || 'Failed to connect MetaMask');
  }
}

/**
 * Switch to Polygon Amoy network
 */
export async function switchToPolygonAmoy() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError) {
    // Chain doesn't exist, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${CHAIN_ID.toString(16)}`,
          chainName: 'Polygon Amoy Testnet',
          nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
          },
          rpcUrls: [POLYGON_RPC],
          blockExplorerUrls: ['https://amoy.polygonscan.com/']
        }]
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Get contract instance with proper signer
 */
export function getContract(signerOrProvider) {
  if (!signerOrProvider) {
    throw new Error('Signer or provider is required for contract');
  }
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signerOrProvider);
  console.log('[BLOCKCHAIN] Contract instance created with runner:', signerOrProvider.constructor.name);
  
  return contract;
}

/**
 * Register asset on blockchain via MetaMask
 */
export async function registerAssetOnChain(exactHash, perceptualHash, audioHash, ipfsCid) {
  try {
    const { signer, address } = await connectWallet();
    console.log('[BLOCKCHAIN] Connected wallet:', address);
    
    const contract = getContract(signer);
    
    // Normalize exact hash to 0x format
    const normalizedHash = exactHash.startsWith('0x') ? exactHash : `0x${exactHash}`;
    
    console.log('[BLOCKCHAIN] Preparing transaction...');
    console.log('[BLOCKCHAIN] Contract:', CONTRACT_ADDRESS);
    console.log('[BLOCKCHAIN] Parameters:', {
      exactHash: normalizedHash.substring(0, 10) + '...',
      perceptualHash: perceptualHash.substring(0, 16) + '...',
      audioHash: audioHash.substring(0, 16) + '...',
      ipfsCid
    });
    
    console.log('[BLOCKCHAIN] Sending transaction via MetaMask...');
    
    // Call contract function - MetaMask will popup
    const tx = await contract.registerVideo(
      normalizedHash,
      perceptualHash,
      audioHash,
      ipfsCid
    );
    
    console.log('[BLOCKCHAIN] Transaction sent:', tx.hash);
    console.log('[BLOCKCHAIN] Waiting for confirmation...');
    
    // Wait for confirmation
    const receipt = await tx.wait(1);
    
    console.log('[BLOCKCHAIN] ✓ Transaction confirmed!');
    console.log('[BLOCKCHAIN] Block:', receipt.blockNumber);
    console.log('[BLOCKCHAIN] Gas used:', receipt.gasUsed.toString());
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      contractAddress: CONTRACT_ADDRESS
    };
    
  } catch (error) {
    console.error('[BLOCKCHAIN ERROR] Full error:', error);
    
    if (error.code === 4001) {
      throw new Error('Transaction rejected by user');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient MATIC for gas fees');
    } else if (error.code === 'UNSUPPORTED_OPERATION') {
      throw new Error('Wallet not connected properly. Please reconnect MetaMask.');
    } else if (error.message?.includes('user rejected')) {
      throw new Error('Transaction rejected by user');
    } else {
      throw new Error(error.shortMessage || error.message || 'Blockchain transaction failed');
    }
  }
}

/**
 * Detect if asset is a repost
 */
export async function detectRepost(exactHash, perceptualHash, audioHash) {
  try {
    // Get wallet signer for contract call
    const { signer } = await connectWallet();
    const contract = getContract(signer);
    
    // Normalize exact hash
    const normalizedHash = exactHash.startsWith('0x') ? exactHash : `0x${exactHash}`;
    
    console.log('[BLOCKCHAIN] Checking for duplicates...');
    
    // Call contract view function (even view functions need signer with ethers v6)
    const result = await contract.detectRepost(
      normalizedHash,
      perceptualHash,
      audioHash
    );
    
    console.log('[BLOCKCHAIN] Detection result:', result);
    
    return {
      isDuplicate: result.isRepost || result[0] || false,
      originalCreator: result.originalCreator || result[1] || ethers.ZeroAddress,
      matchType: result.matchType || result[3] || 'NEW_ASSET',
      originalIpfsHash: result.originalIpfsHash || result[2] || ''
    };
    
  } catch (error) {
    console.error('[BLOCKCHAIN ERROR] Detection failed:', error);
    // If detection fails, assume it's a new asset
    return {
      isDuplicate: false,
      originalCreator: ethers.ZeroAddress,
      matchType: 'NEW_ASSET',
      originalIpfsHash: ''
    };
  }
}

/**
 * Get current wallet address
 */
export async function getCurrentWalletAddress() {
  if (!window.ethereum) return null;
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return await signer.getAddress();
  } catch {
    return null;
  }
}
