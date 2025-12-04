/**
 * Blockchain Integration Module for VideoGuard
 * PERSON 4: Ethers.js wrapper for contract interactions
 * 
 * Provides easy-to-use functions for:
 * - Contract initialization
 * - Video registration
 * - Repost detection
 * - Event listening
 * - Transaction management
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

class VideoGuardBlockchain {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.contractAddress = null;
    this.eventListeners = {};
  }

  /**
   * Initialize blockchain connection
   * @param {string} rpcUrl - Polygon Mumbai RPC endpoint
   * @param {string} privateKey - Private key for signing transactions (optional)
   * @param {string} contractAddress - VideoGuard contract address
   */
  async initialize(rpcUrl, privateKey = null, contractAddress = null) {
    try {
      // Setup provider
      this.provider = new ethers.JsonRpcProvider(rpcUrl || process.env.POLYGON_RPC);
      
      // Load contract ABI and address
      const contractDataPath = path.join(__dirname, "VideoGuardContract.json");
      
      if (!fs.existsSync(contractDataPath)) {
        throw new Error("Contract ABI not found. Please deploy contract first.");
      }
      
      const contractData = JSON.parse(fs.readFileSync(contractDataPath, "utf8"));
      this.contractAddress = contractAddress || contractData.address || process.env.CONTRACT_ADDRESS;
      
      if (!this.contractAddress) {
        throw new Error("Contract address not provided");
      }

      // Setup signer if private key provided
      if (privateKey) {
        this.signer = new ethers.Wallet(privateKey, this.provider);
      }

      // Initialize contract instance
      this.contract = new ethers.Contract(
        this.contractAddress,
        contractData.abi,
        this.signer || this.provider
      );

      console.log("✅ Blockchain connection initialized");
      console.log("   Contract:", this.contractAddress);
      console.log("   Network:", await this.provider.getNetwork().then(n => n.name));
      
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize blockchain:", error.message);
      throw error;
    }
  }

  /**
   * Register a new video on blockchain
   * @param {string} exactHash - SHA-256 hash (hex string with 0x prefix)
   * @param {string} perceptualHash - Visual fingerprint
   * @param {string} audioFingerprint - Audio signature
   * @param {string} ipfsHash - IPFS CID
   * @returns {Promise<Object>} Transaction receipt and video details
   */
  async registerVideo(exactHash, perceptualHash, audioFingerprint, ipfsHash) {
    try {
      if (!this.signer) {
        throw new Error("Signer required for transactions. Initialize with private key.");
      }

      // Ensure exactHash is bytes32 format
      const hashBytes32 = exactHash.startsWith("0x") ? exactHash : `0x${exactHash}`;
      
      console.log("📝 Registering video on blockchain...");
      console.log("   Exact Hash:", hashBytes32);
      console.log("   IPFS:", ipfsHash);

      // Estimate gas
      const gasEstimate = await this.contract.registerVideo.estimateGas(
        hashBytes32,
        perceptualHash,
        audioFingerprint,
        ipfsHash
      );
      console.log("   Gas Estimate:", gasEstimate.toString());

      // Send transaction
      const tx = await this.contract.registerVideo(
        hashBytes32,
        perceptualHash,
        audioFingerprint,
        ipfsHash,
        {
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        }
      );

      console.log("   Transaction Hash:", tx.hash);
      console.log("   Waiting for confirmation...");

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("✅ Video registered successfully!");
      console.log("   Block:", receipt.blockNumber);
      console.log("   Gas Used:", receipt.gasUsed.toString());

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        exactHash: hashBytes32,
        ipfsHash,
      };
    } catch (error) {
      console.error("❌ Failed to register video:", error.message);
      
      // Parse revert reason
      if (error.reason) {
        throw new Error(`Contract Error: ${error.reason}`);
      }
      throw error;
    }
  }

  /**
   * Detect if video is a repost
   * @param {string} exactHash - SHA-256 hash
   * @param {string} perceptualHash - Visual fingerprint
   * @param {string} audioFingerprint - Audio signature
   * @returns {Promise<Object>} Detection result
   */
  async detectRepost(exactHash, perceptualHash, audioFingerprint) {
    try {
      const hashBytes32 = exactHash.startsWith("0x") ? exactHash : `0x${exactHash}`;
      
      console.log("🔍 Checking for reposts...");

      // Call contract (read-only, no gas)
      const result = await this.contract.detectRepost(
        hashBytes32,
        perceptualHash,
        audioFingerprint
      );

      const [isRepost, originalCreator, originalIpfsHash, matchType, originalHash] = result;

      console.log(isRepost ? "⚠️  Repost detected!" : "✅ Original content");
      if (isRepost) {
        console.log("   Match Type:", matchType);
        console.log("   Original Creator:", originalCreator);
      }

      return {
        isRepost,
        originalCreator,
        originalIpfsHash,
        matchType,
        originalHash,
      };
    } catch (error) {
      console.error("❌ Failed to detect repost:", error.message);
      throw error;
    }
  }

  /**
   * Get video information by hash
   * @param {string} exactHash - SHA-256 hash
   * @returns {Promise<Object>} Video details
   */
  async getVideoInfo(exactHash) {
    try {
      const hashBytes32 = exactHash.startsWith("0x") ? exactHash : `0x${exactHash}`;
      
      const video = await this.contract.getVideoInfo(hashBytes32);
      
      return {
        creator: video.creator,
        exactHash: video.exactHash,
        perceptualHash: video.perceptualHash,
        audioFingerprint: video.audioFingerprint,
        ipfsHash: video.ipfsHash,
        timestamp: Number(video.timestamp),
        isDisputed: video.isDisputed,
        views: Number(video.views),
      };
    } catch (error) {
      if (error.message.includes("Video not found")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all videos by creator
   * @param {string} creatorAddress - Ethereum address
   * @returns {Promise<Array>} Array of video hashes
   */
  async getVideosByCreator(creatorAddress) {
    try {
      const videoHashes = await this.contract.getVideosByCreator(creatorAddress);
      return videoHashes;
    } catch (error) {
      console.error("❌ Failed to get creator videos:", error.message);
      throw error;
    }
  }

  /**
   * Increment view counter for a video
   * @param {string} exactHash - SHA-256 hash
   * @returns {Promise<Object>} Transaction receipt
   */
  async incrementViews(exactHash) {
    try {
      if (!this.signer) {
        throw new Error("Signer required for transactions");
      }

      const hashBytes32 = exactHash.startsWith("0x") ? exactHash : `0x${exactHash}`;
      const tx = await this.contract.incrementViews(hashBytes32);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error("❌ Failed to increment views:", error.message);
      throw error;
    }
  }

  /**
   * Raise a dispute for a video
   * @param {string} videoHash - Video exact hash
   * @param {string} reason - Dispute reason
   * @returns {Promise<Object>} Transaction receipt with dispute ID
   */
  async raiseDispute(videoHash, reason) {
    try {
      if (!this.signer) {
        throw new Error("Signer required for transactions");
      }

      const hashBytes32 = videoHash.startsWith("0x") ? videoHash : `0x${videoHash}`;
      
      console.log("🚨 Raising dispute...");
      const tx = await this.contract.raiseDispute(hashBytes32, reason);
      const receipt = await tx.wait();
      
      // Parse dispute ID from events
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === "DisputeRaised";
        } catch {
          return false;
        }
      });

      let disputeId = null;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        disputeId = Number(parsed.args.disputeId);
      }

      console.log("✅ Dispute raised successfully!");
      console.log("   Dispute ID:", disputeId);

      return {
        success: true,
        transactionHash: tx.hash,
        disputeId,
      };
    } catch (error) {
      console.error("❌ Failed to raise dispute:", error.message);
      throw error;
    }
  }

  /**
   * Get platform statistics
   * @returns {Promise<Object>} Platform stats
   */
  async getStats() {
    try {
      const stats = await this.contract.getStats();
      return {
        totalVideos: Number(stats.totalVideos),
        totalReposts: Number(stats.totalReposts),
        totalDisputes: Number(stats.totalDisputes),
      };
    } catch (error) {
      console.error("❌ Failed to get stats:", error.message);
      throw error;
    }
  }

  /**
   * Check if video exists on blockchain
   * @param {string} exactHash - SHA-256 hash
   * @returns {Promise<boolean>} True if exists
   */
  async videoExists(exactHash) {
    try {
      const hashBytes32 = exactHash.startsWith("0x") ? exactHash : `0x${exactHash}`;
      return await this.contract.videoExists(hashBytes32);
    } catch (error) {
      console.error("❌ Failed to check video existence:", error.message);
      return false;
    }
  }

  /**
   * Listen to VideoRegistered events
   * @param {Function} callback - Called when event is emitted
   */
  onVideoRegistered(callback) {
    if (this.eventListeners.videoRegistered) {
      this.contract.off("VideoRegistered", this.eventListeners.videoRegistered);
    }

    const listener = (exactHash, creator, perceptualHash, audioFingerprint, ipfsHash, timestamp, event) => {
      callback({
        exactHash,
        creator,
        perceptualHash,
        audioFingerprint,
        ipfsHash,
        timestamp: Number(timestamp),
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash,
      });
    };

    this.contract.on("VideoRegistered", listener);
    this.eventListeners.videoRegistered = listener;
    console.log("👂 Listening for VideoRegistered events...");
  }

  /**
   * Listen to RepostDetected events
   * @param {Function} callback - Called when event is emitted
   */
  onRepostDetected(callback) {
    if (this.eventListeners.repostDetected) {
      this.contract.off("RepostDetected", this.eventListeners.repostDetected);
    }

    const listener = (uploadedHash, originalHash, uploader, originalCreator, matchType, event) => {
      callback({
        uploadedHash,
        originalHash,
        uploader,
        originalCreator,
        matchType,
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash,
      });
    };

    this.contract.on("RepostDetected", listener);
    this.eventListeners.repostDetected = listener;
    console.log("👂 Listening for RepostDetected events...");
  }

  /**
   * Listen to DisputeRaised events
   * @param {Function} callback - Called when event is emitted
   */
  onDisputeRaised(callback) {
    if (this.eventListeners.disputeRaised) {
      this.contract.off("DisputeRaised", this.eventListeners.disputeRaised);
    }

    const listener = (disputeId, videoHash, accuser, reason, event) => {
      callback({
        disputeId: Number(disputeId),
        videoHash,
        accuser,
        reason,
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash,
      });
    };

    this.contract.on("DisputeRaised", listener);
    this.eventListeners.disputeRaised = listener;
    console.log("👂 Listening for DisputeRaised events...");
  }

  /**
   * Stop all event listeners
   */
  removeAllListeners() {
    this.contract.removeAllListeners();
    this.eventListeners = {};
    console.log("🔇 All event listeners removed");
  }

  /**
   * Estimate gas for registerVideo
   * @param {string} exactHash 
   * @param {string} perceptualHash 
   * @param {string} audioFingerprint 
   * @param {string} ipfsHash 
   * @returns {Promise<Object>} Gas estimate and cost
   */
  async estimateRegisterGas(exactHash, perceptualHash, audioFingerprint, ipfsHash) {
    try {
      const hashBytes32 = exactHash.startsWith("0x") ? exactHash : `0x${exactHash}`;
      
      const gasEstimate = await this.contract.registerVideo.estimateGas(
        hashBytes32,
        perceptualHash,
        audioFingerprint,
        ipfsHash
      );

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasCost = gasEstimate * feeData.gasPrice;

      return {
        gasUnits: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(feeData.gasPrice, "gwei") + " Gwei",
        totalCost: ethers.formatEther(gasCost) + " MATIC",
        totalCostUSD: null, // Could fetch MATIC price from API
      };
    } catch (error) {
      console.error("❌ Failed to estimate gas:", error.message);
      throw error;
    }
  }
}

// Export singleton instance
const blockchainInstance = new VideoGuardBlockchain();

module.exports = {
  VideoGuardBlockchain,
  blockchain: blockchainInstance,
};
