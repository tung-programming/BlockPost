# VideoGuard Blockchain Integration - Testing Guide

## Prerequisites ✅

1. **Backend server running** - Already done! (running on port 3001)
2. **BACKEND_PRIVATE_KEY set** - Already done! ✅
3. **Wallet has MATIC** - Get free testnet MATIC from: https://faucet.polygon.technology/

## How to Test

### Method 1: Using the Test Script (Recommended)

```bash
# In the backend directory
node test-upload.js <path-to-your-file>

# Examples:
node test-upload.js test-video.mp4
node test-upload.js test-image.jpg
node test-upload.js "C:\Users\YourName\Downloads\video.mp4"
```

### Method 2: Using Postman or Thunder Client

1. **Open Postman/Thunder Client**
2. **Create a POST request** to: `http://localhost:3001/upload`
3. **Set body type** to `form-data`
4. **Add a field**:
   - Key: `video` (type: File)
   - Value: Select any file (video, image, audio, or document)
5. **Click Send**

### Method 3: Using curl

```bash
curl -X POST http://localhost:3001/upload \
  -F "video=@path/to/your/file.mp4"
```

## Expected Response

### For a NEW asset (first upload):
```json
{
  "success": true,
  "status": "NEW_ASSET_REGISTERED",
  "assetType": "video",
  "fileInfo": { ... },
  "hashes": {
    "exactHash": "a1b2c3d4...",
    "perceptualHash": "1011010...",
    "audioHash": "placeholder..."
  },
  "ipfs": {
    "cid": "QmXxXxXx...",
    "gatewayUrl": "https://gateway.pinata.cloud/ipfs/..."
  },
  "onChain": {
    "txHash": "0xabc123...",
    "blockNumber": 12345,
    "contractAddress": "0xdEff8efC99eA0685A9E2aA8c51DE70d4bc72EB8E",
    "gasUsed": "150000"
  }
}
```

### For a REPOST (same file uploaded again):
```json
{
  "success": true,
  "status": "REPOST_DETECTED",
  "assetType": "video",
  "fileInfo": { ... },
  "hashes": { ... },
  "ipfs": { ... },
  "repost": {
    "originalCreator": "0x1234...abcd",
    "matchType": "EXACT_DUPLICATE",
    "confidence": 100
  }
}
```

## What Happens When You Upload:

1. 🔐 **Hashing** (~2-4 seconds)
   - SHA-256 for exact matching
   - dHash for perceptual matching
   - Audio fingerprint placeholder

2. ☁️ **IPFS Pinning** (~3-5 seconds)
   - File uploaded to Pinata
   - CID and gateway URL generated

3. ⛓️ **Blockchain Detection** (~2-3 seconds)
   - Calls smart contract `detectRepost()` function
   - Checks if hashes exist on-chain

4. 📝 **Blockchain Registration** (if new, ~10-15 seconds)
   - Calls smart contract `registerVideo()` function
   - Waits for 1 block confirmation
   - Returns transaction hash and block number

## Troubleshooting

### Error: "Blockchain interaction failed"
- **Check wallet has MATIC**: Get from https://faucet.polygon.technology/
- **Check BACKEND_PRIVATE_KEY**: Make sure it's set correctly in .env
- **Check RPC**: Make sure POLYGON_RPC is working

### Error: "No response from Pinata"
- **Check Pinata credentials**: PINATA_JWT should be set in .env

### Error: "File too large"
- **Max size is 100MB**: Try a smaller file

## Quick Test Files

You can test with:
- **Video**: Any .mp4, .avi, .mov file
- **Image**: Any .jpg, .png, .gif file  
- **Audio**: Any .mp3, .wav file
- **Document**: Any .pdf, .txt file

## Viewing Results

After a successful upload, you can:
1. **View on IPFS**: Copy the `gatewayUrl` and paste in browser
2. **View on PolygonScan**: `https://amoy.polygonscan.com/tx/{txHash}`
3. **View in MetaMask**: Check your wallet activity

## Next Steps

1. Upload the SAME file twice to test repost detection
2. Upload a slightly modified version (different encoding) to test perceptual hashing
3. Check the blockchain transaction on PolygonScan
