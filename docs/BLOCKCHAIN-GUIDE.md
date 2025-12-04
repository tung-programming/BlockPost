# VideoGuard Smart Contract Documentation
## Blockchain + Smart Contracts Implementation (PERSON 4)

---

## 🎯 Overview

VideoGuard is a blockchain-based video copyright protection system deployed on **Polygon Mumbai Testnet**. It uses a 3-layer hash detection system to identify exact duplicates, visual matches, and audio matches.

### Key Features
- ✅ **3-Layer Detection**: Exact, Perceptual, and Audio fingerprinting
- ✅ **Gas Optimized**: < 100k gas per transaction
- ✅ **Dispute System**: Community-driven content dispute resolution
- ✅ **Event Emission**: Real-time updates via blockchain events
- ✅ **Dual IPFS**: Integration with Pinata and Web3.Storage

---

## 📦 Contract Architecture

### Core Data Structures

```solidity
struct VideoRecord {
    address creator;
    bytes32 exactHash;           // SHA-256 hash
    string perceptualHash;       // Visual fingerprint
    string audioFingerprint;     // Audio signature
    string ipfsHash;             // IPFS CID
    uint256 timestamp;
    bool isDisputed;
    uint256 views;
}

struct DisputeRecord {
    address accuser;
    bytes32 targetVideoHash;
    string reason;
    uint256 timestamp;
    bool resolved;
    address resolver;
}
```

### State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `videosByExactHash` | mapping(bytes32 => VideoRecord) | Primary video registry |
| `videosByPerceptualHash` | mapping(string => bytes32[]) | Visual similarity index |
| `videosByAudioHash` | mapping(string => bytes32[]) | Audio similarity index |
| `videosByCreator` | mapping(address => bytes32[]) | Creator's video list |
| `disputes` | mapping(uint256 => DisputeRecord) | Dispute registry |
| `arbitrators` | mapping(address => bool) | Authorized arbitrators |

---

## 🔧 Core Functions

### 1. registerVideo
**Purpose**: Register a new video with 3-layer hashing

```solidity
function registerVideo(
    bytes32 _exactHash,
    string memory _perceptualHash,
    string memory _audioFingerprint,
    string memory _ipfsHash
) external
```

**Gas Cost**: ~85k - 95k (depending on string lengths)

**Events Emitted**: `VideoRegistered`

**Example Usage**:
```javascript
const tx = await contract.registerVideo(
    "0xabc123...",              // Exact hash (bytes32)
    "phash_abc123",            // Perceptual hash
    "audio_xyz789",            // Audio fingerprint
    "QmVideo1CID"              // IPFS hash
);
```

---

### 2. detectRepost
**Purpose**: Detect if uploaded content is a repost

```solidity
function detectRepost(
    bytes32 _exactHash,
    string memory _perceptualHash,
    string memory _audioFingerprint
) external returns (
    bool isRepost,
    address originalCreator,
    string memory originalIpfsHash,
    string memory matchType,
    bytes32 originalHash
)
```

**Match Types**:
- `EXACT_DUPLICATE` - 100% file match
- `VISUAL_MATCH` - Similar visual content (re-encoded)
- `AUDIO_MATCH` - Same audio track
- `ORIGINAL` - Unique content

**Gas Cost**: ~45k - 65k

**Events Emitted**: `RepostDetected` (if match found)

---

### 3. raiseDispute
**Purpose**: File a dispute against a video

```solidity
function raiseDispute(
    bytes32 _videoHash,
    string memory _reason
) external returns (uint256 disputeId)
```

**Gas Cost**: ~55k - 70k

**Events Emitted**: `DisputeRaised`

---

### 4. resolveDispute
**Purpose**: Arbitrator resolves a dispute

```solidity
function resolveDispute(
    uint256 _disputeId,
    bool _upheld
) external onlyArbitrator
```

**Access Control**: Only arbitrators can call

**Events Emitted**: `DisputeResolved`

---

### 5. View Functions (Gas-Free)

```solidity
function getVideoInfo(bytes32 _exactHash) external view returns (VideoRecord)
function getVideosByCreator(address _creator) external view returns (bytes32[])
function getStats() external view returns (uint256, uint256, uint256)
function videoExists(bytes32 _exactHash) external view returns (bool)
function getDisputeInfo(uint256 _disputeId) external view returns (DisputeRecord)
```

---

## 🚀 Deployment Guide

### Prerequisites

1. **Install Dependencies**
```bash
cd contracts
npm install
```

2. **Setup Environment Variables**
Create `.env` in project root:
```bash
# Polygon Mumbai RPC (Get from Infura/Alchemy)
POLYGON_RPC=https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY

# Deployer Private Key (DO NOT COMMIT!)
PRIVATE_KEY=your_private_key_here

# PolygonScan API Key (for verification)
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

3. **Get Testnet MATIC**
- Faucet 1: https://faucet.polygon.technology/
- Faucet 2: https://mumbaifaucet.com/
- Need ~0.1 MATIC for deployment

---

### Compile Contract

```bash
cd contracts
npx hardhat compile
```

**Output**: Compiled artifacts in `artifacts/` directory

---

### Run Tests

```bash
npx hardhat test
```

**Expected Output**:
```
  VideoGuard
    Deployment
      ✓ Should set the correct admin
      ✓ Should set owner as initial arbitrator
      ✓ Should initialize counters to zero
    Video Registration
      ✓ Should register a new video successfully
      ✓ Should store video data correctly
      ... (50+ tests)
    
  50 passing (2s)
```

---

### Deploy to Mumbai Testnet

```bash
npx hardhat run scripts/deploy-Mumbai.js --network mumbai
```

**Expected Output**:
```
🚀 Deploying VideoGuard contract to Polygon Mumbai testnet...

📍 Deploying from account: 0x1234...
💰 Account balance: 0.5 MATIC

📦 Deploying VideoGuard contract...
✅ VideoGuard deployed to: 0xABCD1234...
🔗 View on PolygonScan: https://mumbai.polygonscan.com/address/0xABCD1234...

⏳ Waiting for 5 block confirmations...
✅ Confirmations complete

💾 Contract ABI saved to: docs/CONTRACT-ABI.json
💾 Frontend contract data saved to: frontend/src/VideoGuardContract.json
💾 Backend contract data saved to: backend/src/VideoGuardContract.json
💾 Environment template saved to: .env.contract

🔍 Verifying contract on PolygonScan...
✅ Contract verified successfully!

======================================================================
📋 DEPLOYMENT SUMMARY
======================================================================
Contract Address: 0xABCD1234...
Network:          Polygon Mumbai Testnet (ChainID: 80001)
Deployer:         0x1234...
Explorer:         https://mumbai.polygonscan.com/address/0xABCD1234...
======================================================================
```

---

### Verify Contract (if not auto-verified)

```bash
npx hardhat verify --network mumbai CONTRACT_ADDRESS
```

---

## 🔗 Backend Integration

### Initialize Blockchain Connection

```javascript
const { blockchain } = require('./blockchain');

// Initialize with environment variables
await blockchain.initialize(
    process.env.POLYGON_RPC,
    process.env.PRIVATE_KEY,
    process.env.CONTRACT_ADDRESS
);
```

---

### Register Video

```javascript
const result = await blockchain.registerVideo(
    exactHash,           // "0xabc123..." (bytes32)
    perceptualHash,      // "phash_abc123"
    audioFingerprint,    // "audio_xyz789"
    ipfsHash            // "QmVideo1CID"
);

console.log("Transaction Hash:", result.transactionHash);
console.log("Gas Used:", result.gasUsed);
```

---

### Detect Repost

```javascript
const detection = await blockchain.detectRepost(
    exactHash,
    perceptualHash,
    audioFingerprint
);

if (detection.isRepost) {
    console.log("⚠️ Repost detected!");
    console.log("Match Type:", detection.matchType);
    console.log("Original Creator:", detection.originalCreator);
    console.log("Original IPFS:", detection.originalIpfsHash);
} else {
    console.log("✅ Original content");
}
```

---

### Listen to Events

```javascript
// Listen for new video registrations
blockchain.onVideoRegistered((event) => {
    console.log("New video registered:", event.ipfsHash);
    console.log("Creator:", event.creator);
});

// Listen for repost detections
blockchain.onRepostDetected((event) => {
    console.log("Repost detected!");
    console.log("Original:", event.originalHash);
    console.log("Repost:", event.uploadedHash);
    console.log("Match Type:", event.matchType);
});

// Listen for disputes
blockchain.onDisputeRaised((event) => {
    console.log("Dispute raised:", event.disputeId);
    console.log("Reason:", event.reason);
});
```

---

## 🧪 Testing Examples

### Test Registration

```javascript
const { ethers } = require("hardhat");

const videoGuard = await ethers.getContractAt("VideoGuard", CONTRACT_ADDRESS);

// Register video
const tx = await videoGuard.registerVideo(
    ethers.keccak256(ethers.toUtf8Bytes("test_video")),
    "phash_test",
    "audio_test",
    "QmTestCID"
);

await tx.wait();
console.log("Video registered!");
```

---

### Test Repost Detection

```javascript
// Upload same video again
const [isRepost, creator, ipfsHash, matchType] = await videoGuard.detectRepost(
    ethers.keccak256(ethers.toUtf8Bytes("test_video")),
    "phash_test",
    "audio_test"
);

console.log("Is Repost:", isRepost);
console.log("Match Type:", matchType); // "EXACT_DUPLICATE"
```

---

## 🔐 Security Considerations

### Access Control
- **Admin**: Can add/remove arbitrators, transfer admin role
- **Arbitrators**: Can resolve disputes
- **Users**: Can register videos, detect reposts, raise disputes

### Best Practices
1. **Never commit private keys** to version control
2. **Use environment variables** for sensitive data
3. **Verify contract source** on PolygonScan after deployment
4. **Test thoroughly** on Mumbai before mainnet
5. **Monitor gas prices** before transactions

---

## 📊 Gas Costs (Mumbai Testnet)

| Function | Gas Units | Cost (8 Gwei) |
|----------|-----------|---------------|
| `registerVideo` | ~85,000 | ~0.00068 MATIC |
| `detectRepost` | ~50,000 | ~0.0004 MATIC |
| `raiseDispute` | ~60,000 | ~0.00048 MATIC |
| `resolveDispute` | ~45,000 | ~0.00036 MATIC |
| View Functions | 0 | FREE |

**Total for typical flow** (register + detect): ~0.001 MATIC (~$0.0008 USD)

---

## 🛠️ Troubleshooting

### Error: "Insufficient funds"
**Solution**: Get testnet MATIC from faucet

### Error: "Nonce too high"
**Solution**: Reset MetaMask account or wait for pending transactions

### Error: "Contract not found"
**Solution**: Ensure contract is deployed and ADDRESS is correct

### Error: "Video already registered"
**Solution**: This is expected behavior - video exists on chain

### Gas Estimation Failed
**Solution**: Check if transaction would revert (e.g., invalid hash)

---

## 📚 Additional Resources

- **Polygon Mumbai Explorer**: https://mumbai.polygonscan.com/
- **Polygon Faucet**: https://faucet.polygon.technology/
- **Hardhat Docs**: https://hardhat.org/docs
- **Ethers.js Docs**: https://docs.ethers.org/v6/
- **Solidity Docs**: https://docs.soliditylang.org/

---

## 🎯 Next Steps for Integration

1. ✅ Deploy contract to Mumbai testnet
2. ✅ Verify contract on PolygonScan
3. ✅ Save contract address to `.env`
4. ✅ Update backend to use blockchain integration
5. ✅ Connect frontend with ethers.js
6. ✅ Test end-to-end flow
7. ✅ Prepare demo for judges

---

## 📝 Contract Events Reference

### VideoRegistered
```solidity
event VideoRegistered(
    bytes32 indexed exactHash,
    address indexed creator,
    string perceptualHash,
    string audioFingerprint,
    string ipfsHash,
    uint256 timestamp
)
```

### RepostDetected
```solidity
event RepostDetected(
    bytes32 indexed uploadedHash,
    bytes32 indexed originalHash,
    address indexed uploader,
    address originalCreator,
    string matchType
)
```

### DisputeRaised
```solidity
event DisputeRaised(
    uint256 indexed disputeId,
    bytes32 indexed videoHash,
    address indexed accuser,
    string reason
)
```

### DisputeResolved
```solidity
event DisputeResolved(
    uint256 indexed disputeId,
    address indexed resolver,
    bool upheld
)
```

---

## 🏆 Demo Script for Judges

1. **Show Deployment**
   - Display contract on PolygonScan
   - Show verified source code
   
2. **Register Original Video**
   - Upload video → compute hashes → register on chain
   - Show transaction on explorer
   
3. **Detect Exact Repost**
   - Upload same file → detect "EXACT_DUPLICATE"
   - Show attribution to original creator
   
4. **Detect Visual Repost**
   - Upload re-encoded video → detect "VISUAL_MATCH"
   - Demonstrate perceptual hash matching
   
5. **Detect Audio Repost**
   - Upload video with same audio → detect "AUDIO_MATCH"
   - Show audio fingerprint matching
   
6. **Raise Dispute**
   - Flag disputed video
   - Show dispute event on chain

---

**Built with ❤️ by BlockPost Team - PERSON 4 (Blockchain)**
**Hackathon: 12-Hour Sprint**
**Network: Polygon Mumbai Testnet**
