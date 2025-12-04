# 🚀 PERSON 4 Quick Start Guide
## Blockchain Developer - 12-Hour Sprint

---

## ⏱️ Your Timeline (HOUR 0-12)

### ✅ HOUR 0-2: Smart Contract Development [COMPLETE]
- ✅ VideoGuard.sol (370 LOC) - **DONE**
- ✅ 3-layer detection logic - **DONE**
- ✅ Events + mappings optimization - **DONE**
- ✅ Gas optimization (<100k per tx) - **DONE**
- ✅ Unit tests (50+ tests) - **DONE**

### 🎯 HOUR 2-3: Polygon Mumbai Deployment [NEXT]
```bash
# 1. Install dependencies
cd contracts
npm install

# 2. Create .env file (in project root)
cat > ../.env << 'EOF'
POLYGON_RPC=https://polygon-mumbai.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_key
EOF

# 3. Get testnet MATIC
# Visit: https://faucet.polygon.technology/
# Or: https://mumbaifaucet.com/

# 4. Test compilation
npx hardhat compile

# 5. Run tests
npx hardhat test

# 6. Deploy to Mumbai
npx hardhat run scripts/deploy-Mumbai.js --network mumbai

# 7. Save contract address from output to .env
echo "CONTRACT_ADDRESS=0xYourContractAddress" >> ../.env
```

### 🎯 HOUR 3-5: Backend Blockchain Integration
The backend integration file is ready at `backend/src/blockchain.js`

**Integration Example**:
```javascript
// In backend/src/api.js
const { blockchain } = require('./blockchain');

// Initialize once at startup
await blockchain.initialize(
    process.env.POLYGON_RPC,
    process.env.PRIVATE_KEY,
    process.env.CONTRACT_ADDRESS
);

// In your upload endpoint
app.post('/api/upload', async (req, res) => {
    // ... existing hash computation code ...
    
    // Register on blockchain
    try {
        const result = await blockchain.registerVideo(
            exactHash,
            perceptualHash,
            audioFingerprint,
            ipfsHash
        );
        
        res.json({
            success: true,
            transactionHash: result.transactionHash,
            ipfsHash: ipfsHash
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// In your detect endpoint
app.post('/api/detect-repost', async (req, res) => {
    // ... existing hash computation code ...
    
    const detection = await blockchain.detectRepost(
        exactHash,
        perceptualHash,
        audioFingerprint
    );
    
    res.json(detection);
});
```

### 🎯 HOUR 5-7: Dispute System + Admin

**Add Admin Routes**:
```javascript
// backend/src/api.js

// Add arbitrator
app.post('/api/admin/add-arbitrator', async (req, res) => {
    const { address } = req.body;
    // Note: Requires admin private key in signer
    const tx = await blockchain.contract.addArbitrator(address);
    await tx.wait();
    res.json({ success: true });
});

// Raise dispute
app.post('/api/dispute/raise', async (req, res) => {
    const { videoHash, reason } = req.body;
    const result = await blockchain.raiseDispute(videoHash, reason);
    res.json(result);
});

// Resolve dispute (arbitrator only)
app.post('/api/dispute/resolve', async (req, res) => {
    const { disputeId, upheld } = req.body;
    const tx = await blockchain.contract.resolveDispute(disputeId, upheld);
    await tx.wait();
    res.json({ success: true });
});
```

### 🎯 HOUR 7-12: Documentation + Demo Support

**Event Monitoring Script** (for demo):
```javascript
// scripts/monitor-events.js
const { blockchain } = require('../backend/src/blockchain');

async function monitorEvents() {
    await blockchain.initialize(
        process.env.POLYGON_RPC,
        null, // No private key needed for monitoring
        process.env.CONTRACT_ADDRESS
    );
    
    console.log("📡 Monitoring blockchain events...\n");
    
    blockchain.onVideoRegistered((event) => {
        console.log("🎬 NEW VIDEO REGISTERED");
        console.log("   Creator:", event.creator);
        console.log("   IPFS:", event.ipfsHash);
        console.log("   Block:", event.blockNumber);
        console.log("   Tx:", event.transactionHash);
        console.log();
    });
    
    blockchain.onRepostDetected((event) => {
        console.log("⚠️  REPOST DETECTED!");
        console.log("   Match Type:", event.matchType);
        console.log("   Original Creator:", event.originalCreator);
        console.log("   Uploader:", event.uploader);
        console.log("   Block:", event.blockNumber);
        console.log();
    });
    
    blockchain.onDisputeRaised((event) => {
        console.log("🚨 DISPUTE RAISED");
        console.log("   Dispute ID:", event.disputeId);
        console.log("   Accuser:", event.accuser);
        console.log("   Reason:", event.reason);
        console.log();
    });
}

monitorEvents().catch(console.error);
```

---

## 🔧 Quick Commands Cheat Sheet

```bash
# COMPILATION
npx hardhat compile

# TESTING
npx hardhat test                           # Run all tests
npx hardhat test --grep "Registration"    # Run specific test suite
REPORT_GAS=true npx hardhat test          # Show gas usage

# DEPLOYMENT
npx hardhat run scripts/deploy-Mumbai.js --network mumbai

# VERIFICATION
npx hardhat verify --network mumbai CONTRACT_ADDRESS

# LOCAL HARDHAT NODE (for testing)
npx hardhat node                          # Terminal 1
npx hardhat run scripts/deploy-Mumbai.js --network localhost  # Terminal 2

# CONSOLE (interact with deployed contract)
npx hardhat console --network mumbai
> const VideoGuard = await ethers.getContractFactory("VideoGuard");
> const vg = await VideoGuard.attach("0xYourContractAddress");
> await vg.getStats();
```

---

## 🐛 Common Issues & Solutions

### Issue: "Error: insufficient funds"
```bash
# Get testnet MATIC
# Visit: https://faucet.polygon.technology/
# Enter your wallet address
# Wait 1-2 minutes
```

### Issue: "Error: network does not support ENS"
```bash
# Update hardhat.config.js - already done ✅
```

### Issue: "Error: cannot estimate gas"
```bash
# Transaction will likely revert
# Check if:
# - Video already registered
# - Invalid hash format
# - Missing parameters
```

### Issue: Contract verification fails
```bash
# Verify manually:
npx hardhat verify --network mumbai CONTRACT_ADDRESS

# Or on PolygonScan UI:
# 1. Go to contract page
# 2. Click "Contract" tab
# 3. Click "Verify and Publish"
# 4. Select Solidity 0.8.20
# 5. Paste contract code
```

---

## 📊 Testing Checklist

Before moving to next phase, verify:

- [ ] Contract compiles without errors
- [ ] All 50+ tests pass
- [ ] Gas usage under 100k for main functions
- [ ] Contract deployed to Mumbai
- [ ] Contract verified on PolygonScan
- [ ] ABI files generated in docs/ and backend/src/
- [ ] Environment variables set correctly
- [ ] Can call registerVideo successfully
- [ ] Can call detectRepost successfully
- [ ] Events are emitted correctly

**Run full check**:
```bash
cd contracts
npx hardhat compile && npx hardhat test
```

Expected output: All tests passing ✅

---

## 🎯 Integration Points with Team

### 🔗 For PERSON 1 (Backend - Hash Engine)
**What you provide**:
- `backend/src/blockchain.js` - Ready to use
- `backend/src/VideoGuardContract.json` - Auto-generated on deploy

**What they do**:
```javascript
const { blockchain } = require('./blockchain');

// In their upload handler:
await blockchain.registerVideo(exactHash, perceptualHash, audioFingerprint, ipfsHash);

// In their detect handler:
const detection = await blockchain.detectRepost(exactHash, perceptualHash, audioFingerprint);
```

### 🔗 For PERSON 2 (Frontend)
**What you provide**:
- `frontend/src/VideoGuardContract.json` - Auto-generated on deploy
- Contract address in `.env`

**What they do**:
```javascript
import contractData from './VideoGuardContract.json';
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
const contract = new ethers.Contract(
    contractData.address,
    contractData.abi,
    provider
);

// Read-only calls
const stats = await contract.getStats();
const isRepost = await contract.videoExists(hash);
```

### 🔗 For PERSON 3 (IPFS Storage)
**What you provide**:
- The IPFS hash storage in contract
- `getVideoInfo()` returns IPFS CID

**What they do**:
- Upload to IPFS first, get CID
- Pass CID to your `registerVideo()` function
- Retrieve CID from blockchain for video playback

---

## 🎬 Demo Preparation

### Test Data to Prepare

```javascript
// Create sample videos for demo
const testVideos = [
    {
        name: "Original Video",
        exactHash: "0xabc123...",
        perceptualHash: "phash_001",
        audioFingerprint: "audio_001",
        ipfsHash: "QmOriginal123"
    },
    {
        name: "Exact Duplicate",
        exactHash: "0xabc123...",  // Same!
        perceptualHash: "phash_999",
        audioFingerprint: "audio_999",
        ipfsHash: "QmRepost456"
    },
    {
        name: "Re-encoded (Visual Match)",
        exactHash: "0xdef456...",  // Different
        perceptualHash: "phash_001", // Same!
        audioFingerprint: "audio_999",
        ipfsHash: "QmVisual789"
    },
    {
        name: "Audio Reuse",
        exactHash: "0xghi789...",  // Different
        perceptualHash: "phash_999",
        audioFingerprint: "audio_001", // Same!
        ipfsHash: "QmAudio012"
    }
];
```

### Demo Script

1. **Show Contract on PolygonScan**
   - Open: `https://mumbai.polygonscan.com/address/CONTRACT_ADDRESS`
   - Show verified source code
   - Show contract state (stats)

2. **Register Original Video**
   ```bash
   # Show the transaction
   curl -X POST http://localhost:3000/api/upload \
     -H "Content-Type: application/json" \
     -d '{"video": "original.mp4"}'
   ```
   - Show transaction hash
   - View on PolygonScan
   - Show VideoRegistered event

3. **Detect Exact Repost**
   ```bash
   # Upload same file
   curl -X POST http://localhost:3000/api/detect-repost \
     -H "Content-Type: application/json" \
     -d '{"video": "original.mp4"}'
   ```
   - Show "EXACT_DUPLICATE" result
   - Show original creator address
   - Show RepostDetected event

4. **Show Statistics**
   ```bash
   # Get platform stats
   curl http://localhost:3000/api/stats
   ```
   - Total videos: 1
   - Total reposts: 1
   - Total disputes: 0

---

## 📝 Documentation Deliverables

All documentation is complete:
- ✅ `docs/BLOCKCHAIN-GUIDE.md` - Full technical guide
- ✅ `docs/CONTRACT-ABI.json` - Auto-generated on deploy
- ✅ `contracts/VideoGuard.sol` - Well-commented source
- ✅ `contracts/test/VideoGuard.test.js` - 50+ test cases
- ✅ `backend/src/blockchain.js` - Integration wrapper

---

## 🏆 Success Criteria

By end of Hour 12, you should have:
- ✅ Working smart contract on Mumbai
- ✅ Verified source on PolygonScan
- ✅ Backend integrated with blockchain
- ✅ Event monitoring working
- ✅ Dispute system functional
- ✅ All documentation complete
- ✅ Demo ready for judges

---

## 🆘 Need Help?

### Contract Questions
```bash
# Check contract state
npx hardhat console --network mumbai
> const vg = await ethers.getContractAt("VideoGuard", "CONTRACT_ADDRESS");
> await vg.getStats();
> await vg.admin();
```

### Transaction Issues
- Check on PolygonScan: `https://mumbai.polygonscan.com/tx/TX_HASH`
- Check gas price: Should be ~8-10 Gwei for Mumbai
- Check balance: Need at least 0.1 MATIC for testing

### Integration Issues
- Verify contract address is correct in .env
- Verify ABI files were generated
- Check blockchain.js initialization
- Ensure RPC endpoint is working

---

## 🎯 Your Current Status

### ✅ COMPLETED
1. Smart contract development (VideoGuard.sol)
2. Comprehensive test suite (50+ tests)
3. Hardhat configuration
4. Deployment script
5. Backend integration module
6. Full documentation

### 🎯 NEXT STEPS (DO THIS NOW)
1. Setup .env file with Mumbai RPC
2. Get testnet MATIC from faucet
3. Deploy contract: `npx hardhat run scripts/deploy-Mumbai.js --network mumbai`
4. Save contract address
5. Test with backend integration
6. Coordinate with other team members

---

## 📞 Quick Commands for Team Communication

```bash
# Share contract address
echo "CONTRACT_ADDRESS=$(cat .env.contract | grep CONTRACT_ADDRESS | cut -d'=' -f2)"

# Share contract ABI location
echo "Backend ABI: backend/src/VideoGuardContract.json"
echo "Frontend ABI: frontend/src/VideoGuardContract.json"
echo "Full docs: docs/BLOCKCHAIN-GUIDE.md"

# Share PolygonScan link
echo "View contract: https://mumbai.polygonscan.com/address/CONTRACT_ADDRESS"
```

---

**You're all set! 🚀 Everything is ready for deployment.**

**Next step**: Deploy to Mumbai testnet (takes ~5 minutes)

**Questions?** Check `docs/BLOCKCHAIN-GUIDE.md` for detailed guides.

**Good luck with your hackathon! 🏆**
