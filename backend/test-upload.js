/**
 * Test Script for VideoGuard Blockchain Integration
 * 
 * This script tests the /upload endpoint with blockchain integration:
 * 1. Uploads a test file
 * 2. Generates hashes (SHA-256, dHash, audio fingerprint)
 * 3. Pins to IPFS via Pinata
 * 4. Detects if it's a repost using smart contract
 * 5. Registers on blockchain if new, or returns original creator if repost
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3001';

/**
 * Test uploading a file to VideoGuard
 */
async function testUpload(filePath) {
  console.log('\n=================================');
  console.log('Testing VideoGuard Upload with Blockchain');
  console.log('=================================\n');

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      console.log('\n💡 Usage: node test-upload.js <path-to-file>');
      console.log('Example: node test-upload.js test-video.mp4');
      return;
    }

    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    
    console.log(`📁 File: ${fileName}`);
    console.log(`📊 Size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log('\n⏳ Uploading...\n');

    // Create form data
    const form = new FormData();
    form.append('video', fs.createReadStream(filePath));

    // Upload to server
    const startTime = Date.now();
    const response = await axios.post(`${API_URL}/upload`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const duration = Date.now() - startTime;

    console.log('=================================');
    console.log('✅ UPLOAD SUCCESSFUL');
    console.log('=================================\n');

    const data = response.data;

    // Display results
    console.log(`📋 Status: ${data.status}`);
    console.log(`🎨 Asset Type: ${data.assetType}`);
    console.log(`⏱️  Total Time: ${duration}ms\n`);

    console.log('📦 FILE INFO:');
    console.log(`  - Name: ${data.fileInfo.originalName}`);
    console.log(`  - Size: ${data.fileInfo.sizeInMB} MB`);
    console.log(`  - MIME: ${data.fileInfo.mimeType}\n`);

    console.log('🔐 HASHES:');
    console.log(`  - Exact (SHA-256): ${data.hashes.exactHash.substring(0, 16)}...`);
    console.log(`  - Perceptual (dHash): ${data.hashes.perceptualHash.substring(0, 16)}...`);
    console.log(`  - Audio: ${data.hashes.audioHash.substring(0, 30)}...\n`);

    console.log('☁️  IPFS:');
    console.log(`  - CID: ${data.ipfs.cid}`);
    console.log(`  - Gateway: ${data.ipfs.gatewayUrl}\n`);

    // Show blockchain-specific results
    if (data.status === 'NEW_ASSET_REGISTERED') {
      console.log('⛓️  BLOCKCHAIN (NEW ASSET REGISTERED):');
      console.log(`  - Transaction Hash: ${data.onChain.txHash}`);
      console.log(`  - Block Number: ${data.onChain.blockNumber}`);
      console.log(`  - Contract: ${data.onChain.contractAddress}`);
      console.log(`  - Gas Used: ${data.onChain.gasUsed}`);
      console.log('\n✅ This is a NEW asset - you are now the registered owner on-chain!');
      console.log(`🔗 View on PolygonScan: https://amoy.polygonscan.com/tx/${data.onChain.txHash}`);
    } else if (data.status === 'REPOST_DETECTED') {
      console.log('⛓️  BLOCKCHAIN (REPOST DETECTED):');
      console.log(`  - Original Creator: ${data.repost.originalCreator}`);
      console.log(`  - Match Type: ${data.repost.matchType}`);
      console.log(`  - Confidence: ${data.repost.confidence}%`);
      console.log('\n⚠️  This asset already exists on-chain!');
      console.log(`👤 Original owner: ${data.repost.originalCreator}`);
    }

    console.log('\n=================================\n');

  } catch (error) {
    console.error('\n❌ UPLOAD FAILED\n');
    
    if (error.response) {
      console.error('Server Response:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response from server. Is the backend running on port 3001?');
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\n💡 Make sure:');
    console.log('  1. Backend server is running (npm run dev)');
    console.log('  2. Pinata credentials are set in .env');
    console.log('  3. BACKEND_PRIVATE_KEY is set in .env');
    console.log('  4. Contract is deployed at CONTRACT_ADDRESS');
    console.log('  5. Wallet has MATIC for gas fees\n');
  }
}

/**
 * Test health endpoint
 */
async function testHealth() {
  console.log('\n🏥 Testing Health Endpoint...');
  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Server is healthy:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Server is not responding');
    return false;
  }
}

// Main execution
(async () => {
  // Check if file path is provided
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('\n📖 VideoGuard Blockchain Upload Test\n');
    console.log('Usage: node test-upload.js <path-to-file>\n');
    console.log('Examples:');
    console.log('  node test-upload.js test-video.mp4');
    console.log('  node test-upload.js test-image.jpg');
    console.log('  node test-upload.js test-audio.mp3');
    console.log('  node test-upload.js document.pdf\n');
    process.exit(1);
  }

  // Test health first
  const isHealthy = await testHealth();
  if (!isHealthy) {
    console.log('\n💡 Start the backend server first: npm run dev\n');
    process.exit(1);
  }

  // Upload the file
  await testUpload(filePath);
})();
