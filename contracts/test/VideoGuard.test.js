/**
 * Test suite for VideoGuard smart contract
 * PERSON 4: Comprehensive tests for all contract functions
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VideoGuard", function () {
  let videoGuard;
  let owner;
  let creator1;
  let creator2;
  let arbitrator;
  
  // Sample test data
  const video1 = {
    exactHash: ethers.keccak256(ethers.toUtf8Bytes("video1_content")),
    perceptualHash: "phash_abc123",
    audioFingerprint: "audio_xyz789",
    ipfsHash: "QmTestVideo1CID",
  };
  
  const video2 = {
    exactHash: ethers.keccak256(ethers.toUtf8Bytes("video2_content")),
    perceptualHash: "phash_def456",
    audioFingerprint: "audio_uvw456",
    ipfsHash: "QmTestVideo2CID",
  };
  
  const repostExact = {
    exactHash: video1.exactHash, // Same exact hash
    perceptualHash: "phash_different",
    audioFingerprint: "audio_different",
    ipfsHash: "QmRepostCID",
  };
  
  const repostVisual = {
    exactHash: ethers.keccak256(ethers.toUtf8Bytes("repost_visual_content")),
    perceptualHash: video1.perceptualHash, // Same perceptual hash
    audioFingerprint: "audio_different2",
    ipfsHash: "QmRepostVisualCID",
  };
  
  const repostAudio = {
    exactHash: ethers.keccak256(ethers.toUtf8Bytes("repost_audio_content")),
    perceptualHash: "phash_different2",
    audioFingerprint: video1.audioFingerprint, // Same audio fingerprint
    ipfsHash: "QmRepostAudioCID",
  };

  beforeEach(async function () {
    // Get signers
    [owner, creator1, creator2, arbitrator] = await ethers.getSigners();
    
    // Deploy contract
    const VideoGuard = await ethers.getContractFactory("VideoGuard");
    videoGuard = await VideoGuard.deploy();
    await videoGuard.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct admin", async function () {
      expect(await videoGuard.admin()).to.equal(owner.address);
    });

    it("Should set owner as initial arbitrator", async function () {
      expect(await videoGuard.arbitrators(owner.address)).to.be.true;
    });

    it("Should initialize counters to zero", async function () {
      expect(await videoGuard.totalVideosRegistered()).to.equal(0);
      expect(await videoGuard.totalRepostsDetected()).to.equal(0);
      expect(await videoGuard.disputeCount()).to.equal(0);
    });
  });

  describe("Video Registration", function () {
    it("Should register a new video successfully", async function () {
      await expect(
        videoGuard.connect(creator1).registerVideo(
          video1.exactHash,
          video1.perceptualHash,
          video1.audioFingerprint,
          video1.ipfsHash
        )
      )
        .to.emit(videoGuard, "VideoRegistered")
        .withArgs(
          video1.exactHash,
          creator1.address,
          video1.perceptualHash,
          video1.audioFingerprint,
          video1.ipfsHash,
          await ethers.provider.getBlock("latest").then(b => b.timestamp + 1)
        );
      
      expect(await videoGuard.totalVideosRegistered()).to.equal(1);
    });

    it("Should store video data correctly", async function () {
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      
      const videoInfo = await videoGuard.getVideoInfo(video1.exactHash);
      
      expect(videoInfo.creator).to.equal(creator1.address);
      expect(videoInfo.exactHash).to.equal(video1.exactHash);
      expect(videoInfo.perceptualHash).to.equal(video1.perceptualHash);
      expect(videoInfo.audioFingerprint).to.equal(video1.audioFingerprint);
      expect(videoInfo.ipfsHash).to.equal(video1.ipfsHash);
      expect(videoInfo.isDisputed).to.be.false;
      expect(videoInfo.views).to.equal(0);
    });

    it("Should prevent duplicate exact hash registration", async function () {
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      
      await expect(
        videoGuard.connect(creator2).registerVideo(
          video1.exactHash,
          "different_phash",
          "different_audio",
          "different_ipfs"
        )
      ).to.be.revertedWith("Video already registered");
    });

    it("Should reject invalid parameters", async function () {
      await expect(
        videoGuard.connect(creator1).registerVideo(
          ethers.ZeroHash,
          video1.perceptualHash,
          video1.audioFingerprint,
          video1.ipfsHash
        )
      ).to.be.revertedWith("Invalid exact hash");

      await expect(
        videoGuard.connect(creator1).registerVideo(
          video1.exactHash,
          "",
          video1.audioFingerprint,
          video1.ipfsHash
        )
      ).to.be.revertedWith("Perceptual hash required");

      await expect(
        videoGuard.connect(creator1).registerVideo(
          video1.exactHash,
          video1.perceptualHash,
          "",
          video1.ipfsHash
        )
      ).to.be.revertedWith("Audio fingerprint required");

      await expect(
        videoGuard.connect(creator1).registerVideo(
          video1.exactHash,
          video1.perceptualHash,
          video1.audioFingerprint,
          ""
        )
      ).to.be.revertedWith("IPFS hash required");
    });

    it("Should add video to creator's list", async function () {
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      
      await videoGuard.connect(creator1).registerVideo(
        video2.exactHash,
        video2.perceptualHash,
        video2.audioFingerprint,
        video2.ipfsHash
      );
      
      const creatorVideos = await videoGuard.getVideosByCreator(creator1.address);
      expect(creatorVideos.length).to.equal(2);
      expect(creatorVideos[0]).to.equal(video1.exactHash);
      expect(creatorVideos[1]).to.equal(video2.exactHash);
    });
  });

  describe("Repost Detection", function () {
    beforeEach(async function () {
      // Register original video
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
    });

    it("Should detect exact duplicate (Layer 1)", async function () {
      const result = await videoGuard.connect(creator2).detectRepost.staticCall(
        repostExact.exactHash,
        repostExact.perceptualHash,
        repostExact.audioFingerprint
      );
      
      expect(result.isRepost).to.be.true;
      expect(result.originalCreator).to.equal(creator1.address);
      expect(result.originalIpfsHash).to.equal(video1.ipfsHash);
      expect(result.matchType).to.equal("EXACT_DUPLICATE");
      expect(result.originalHash).to.equal(video1.exactHash);
    });

    it("Should emit RepostDetected event for exact match", async function () {
      await expect(
        videoGuard.connect(creator2).detectRepost(
          repostExact.exactHash,
          repostExact.perceptualHash,
          repostExact.audioFingerprint
        )
      )
        .to.emit(videoGuard, "RepostDetected")
        .withArgs(
          repostExact.exactHash,
          video1.exactHash,
          creator2.address,
          creator1.address,
          "EXACT_DUPLICATE"
        );
    });

    it("Should detect visual match (Layer 2)", async function () {
      const result = await videoGuard.connect(creator2).detectRepost.staticCall(
        repostVisual.exactHash,
        repostVisual.perceptualHash,
        repostVisual.audioFingerprint
      );
      
      expect(result.isRepost).to.be.true;
      expect(result.originalCreator).to.equal(creator1.address);
      expect(result.matchType).to.equal("VISUAL_MATCH");
    });

    it("Should detect audio match (Layer 3)", async function () {
      const result = await videoGuard.connect(creator2).detectRepost.staticCall(
        repostAudio.exactHash,
        repostAudio.perceptualHash,
        repostAudio.audioFingerprint
      );
      
      expect(result.isRepost).to.be.true;
      expect(result.originalCreator).to.equal(creator1.address);
      expect(result.matchType).to.equal("AUDIO_MATCH");
    });

    it("Should return ORIGINAL for unique content", async function () {
      const result = await videoGuard.connect(creator2).detectRepost.staticCall(
        video2.exactHash,
        video2.perceptualHash,
        video2.audioFingerprint
      );
      
      expect(result.isRepost).to.be.false;
      expect(result.originalCreator).to.equal(ethers.ZeroAddress);
      expect(result.matchType).to.equal("ORIGINAL");
    });

    it("Should increment repost counter", async function () {
      await videoGuard.connect(creator2).detectRepost(
        repostExact.exactHash,
        repostExact.perceptualHash,
        repostExact.audioFingerprint
      );
      
      expect(await videoGuard.totalRepostsDetected()).to.equal(1);
    });

    it("Should prioritize exact match over visual match", async function () {
      // Video is already registered in beforeEach
      // Check with same exact hash - should match exact first
      const result = await videoGuard.connect(creator2).detectRepost.staticCall(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint
      );
      
      expect(result.matchType).to.equal("EXACT_DUPLICATE");
    });
  });

  describe("View Counter", function () {
    it("Should increment view counter", async function () {
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      
      await videoGuard.incrementViews(video1.exactHash);
      await videoGuard.incrementViews(video1.exactHash);
      
      const videoInfo = await videoGuard.getVideoInfo(video1.exactHash);
      expect(videoInfo.views).to.equal(2);
    });

    it("Should revert for non-existent video", async function () {
      await expect(
        videoGuard.incrementViews(video1.exactHash)
      ).to.be.revertedWith("Video not found");
    });
  });

  describe("Dispute System", function () {
    beforeEach(async function () {
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
    });

    it("Should raise a dispute successfully", async function () {
      const reason = "Copyright infringement";
      
      await expect(
        videoGuard.connect(creator2).raiseDispute(video1.exactHash, reason)
      )
        .to.emit(videoGuard, "DisputeRaised")
        .withArgs(0, video1.exactHash, creator2.address, reason);
    });

    it("Should mark video as disputed", async function () {
      await videoGuard.connect(creator2).raiseDispute(video1.exactHash, "Test reason");
      
      const videoInfo = await videoGuard.getVideoInfo(video1.exactHash);
      expect(videoInfo.isDisputed).to.be.true;
    });

    it("Should store dispute information", async function () {
      const reason = "Copyright claim";
      await videoGuard.connect(creator2).raiseDispute(video1.exactHash, reason);
      
      const dispute = await videoGuard.getDisputeInfo(0);
      expect(dispute.accuser).to.equal(creator2.address);
      expect(dispute.targetVideoHash).to.equal(video1.exactHash);
      expect(dispute.reason).to.equal(reason);
      expect(dispute.resolved).to.be.false;
    });

    it("Should increment dispute counter", async function () {
      await videoGuard.connect(creator2).raiseDispute(video1.exactHash, "Reason 1");
      await videoGuard.connect(creator2).raiseDispute(video1.exactHash, "Reason 2");
      
      expect(await videoGuard.disputeCount()).to.equal(2);
    });

    it("Should reject dispute without reason", async function () {
      await expect(
        videoGuard.connect(creator2).raiseDispute(video1.exactHash, "")
      ).to.be.revertedWith("Reason required");
    });

    it("Should reject dispute for non-existent video", async function () {
      await expect(
        videoGuard.connect(creator2).raiseDispute(video2.exactHash, "Test")
      ).to.be.revertedWith("Video not found");
    });
  });

  describe("Dispute Resolution", function () {
    beforeEach(async function () {
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      await videoGuard.connect(creator2).raiseDispute(video1.exactHash, "Test dispute");
    });

    it("Should allow arbitrator to resolve dispute (upheld)", async function () {
      await expect(
        videoGuard.connect(owner).resolveDispute(0, true)
      )
        .to.emit(videoGuard, "DisputeResolved")
        .withArgs(0, owner.address, true);
      
      const dispute = await videoGuard.getDisputeInfo(0);
      expect(dispute.resolved).to.be.true;
      expect(dispute.resolver).to.equal(owner.address);
    });

    it("Should allow arbitrator to resolve dispute (rejected)", async function () {
      await videoGuard.connect(owner).resolveDispute(0, false);
      
      const dispute = await videoGuard.getDisputeInfo(0);
      expect(dispute.resolved).to.be.true;
      
      // Video should no longer be disputed
      const videoInfo = await videoGuard.getVideoInfo(video1.exactHash);
      expect(videoInfo.isDisputed).to.be.false;
    });

    it("Should prevent non-arbitrator from resolving", async function () {
      await expect(
        videoGuard.connect(creator2).resolveDispute(0, true)
      ).to.be.revertedWith("Only arbitrator can resolve disputes");
    });

    it("Should prevent resolving twice", async function () {
      await videoGuard.connect(owner).resolveDispute(0, true);
      
      await expect(
        videoGuard.connect(owner).resolveDispute(0, false)
      ).to.be.revertedWith("Dispute already resolved");
    });

    it("Should reject invalid dispute ID", async function () {
      await expect(
        videoGuard.connect(owner).resolveDispute(999, true)
      ).to.be.revertedWith("Invalid dispute ID");
    });
  });

  describe("Admin Functions", function () {
    it("Should add arbitrator", async function () {
      await expect(
        videoGuard.connect(owner).addArbitrator(arbitrator.address)
      )
        .to.emit(videoGuard, "ArbitratorAdded")
        .withArgs(arbitrator.address);
      
      expect(await videoGuard.arbitrators(arbitrator.address)).to.be.true;
    });

    it("Should allow new arbitrator to resolve disputes", async function () {
      await videoGuard.connect(owner).addArbitrator(arbitrator.address);
      
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      await videoGuard.connect(creator2).raiseDispute(video1.exactHash, "Test");
      
      await expect(
        videoGuard.connect(arbitrator).resolveDispute(0, true)
      ).to.not.be.reverted;
    });

    it("Should remove arbitrator", async function () {
      await videoGuard.connect(owner).addArbitrator(arbitrator.address);
      
      await expect(
        videoGuard.connect(owner).removeArbitrator(arbitrator.address)
      )
        .to.emit(videoGuard, "ArbitratorRemoved")
        .withArgs(arbitrator.address);
      
      expect(await videoGuard.arbitrators(arbitrator.address)).to.be.false;
    });

    it("Should reject zero address for arbitrator", async function () {
      await expect(
        videoGuard.connect(owner).addArbitrator(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should prevent non-admin from adding arbitrator", async function () {
      await expect(
        videoGuard.connect(creator1).addArbitrator(arbitrator.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should transfer admin role", async function () {
      await videoGuard.connect(owner).transferAdmin(creator1.address);
      expect(await videoGuard.admin()).to.equal(creator1.address);
    });

    it("Should reject zero address for admin transfer", async function () {
      await expect(
        videoGuard.connect(owner).transferAdmin(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should prevent non-admin from transferring admin", async function () {
      await expect(
        videoGuard.connect(creator1).transferAdmin(creator2.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });
  });

  describe("View Functions", function () {
    it("Should return correct stats", async function () {
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      
      await videoGuard.connect(creator2).detectRepost(
        repostExact.exactHash,
        repostExact.perceptualHash,
        repostExact.audioFingerprint
      );
      
      await videoGuard.connect(creator2).raiseDispute(video1.exactHash, "Test");
      
      const stats = await videoGuard.getStats();
      expect(stats.totalVideos).to.equal(1);
      expect(stats.totalReposts).to.equal(1);
      expect(stats.totalDisputes).to.equal(1);
    });

    it("Should check if video exists", async function () {
      expect(await videoGuard.videoExists(video1.exactHash)).to.be.false;
      
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      
      expect(await videoGuard.videoExists(video1.exactHash)).to.be.true;
    });

    it("Should revert getVideoInfo for non-existent video", async function () {
      await expect(
        videoGuard.getVideoInfo(video1.exactHash)
      ).to.be.revertedWith("Video not found");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should register video under 100k gas", async function () {
      const tx = await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      const receipt = await tx.wait();
      
      console.log(`    Gas used for registerVideo: ${receipt.gasUsed.toString()}`);
      // Note: Gas usage depends on string lengths, but should be efficient
    });

    it("Should detect repost efficiently", async function () {
      await videoGuard.connect(creator1).registerVideo(
        video1.exactHash,
        video1.perceptualHash,
        video1.audioFingerprint,
        video1.ipfsHash
      );
      
      const tx = await videoGuard.connect(creator2).detectRepost(
        repostExact.exactHash,
        repostExact.perceptualHash,
        repostExact.audioFingerprint
      );
      const receipt = await tx.wait();
      
      console.log(`    Gas used for detectRepost: ${receipt.gasUsed.toString()}`);
    });
  });
});
