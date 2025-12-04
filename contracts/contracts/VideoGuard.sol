// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VideoGuard
 * @dev Advanced video copyright protection with 3-layer detection on Polygon Mumbai
 * @notice Detects exact duplicates, visual matches, and audio matches
 * @author BlockPost Team - PERSON 4 (Blockchain)
 */

contract VideoGuard {
    // ============ STRUCTS ============
    
    struct VideoRecord {
        address creator;
        bytes32 exactHash;           // SHA-256 hash of original file
        string perceptualHash;       // Visual fingerprint from key frames
        string audioFingerprint;     // Audio signature (Chromaprint)
        string ipfsHash;             // IPFS CID for video retrieval
        uint256 timestamp;           // Block timestamp of registration
        bool isDisputed;             // Dispute flag
        uint256 views;               // View counter
    }

    struct DisputeRecord {
        address accuser;
        bytes32 targetVideoHash;
        string reason;
        uint256 timestamp;
        bool resolved;
        address resolver;
    }

    // ============ STATE VARIABLES ============
    
    // Primary mapping: exactHash => VideoRecord
    mapping(bytes32 => VideoRecord) public videosByExactHash;
    
    // Secondary indexes for detection
    mapping(string => bytes32[]) public videosByPerceptualHash;
    mapping(string => bytes32[]) public videosByAudioHash;
    mapping(address => bytes32[]) public videosByCreator;
    
    // Dispute system
    mapping(uint256 => DisputeRecord) public disputes;
    uint256 public disputeCount;
    
    // Admin & governance
    address public admin;
    mapping(address => bool) public arbitrators;
    
    // Statistics
    uint256 public totalVideosRegistered;
    uint256 public totalRepostsDetected;
    
    // ============ EVENTS ============
    
    event VideoRegistered(
        bytes32 indexed exactHash,
        address indexed creator,
        string perceptualHash,
        string audioFingerprint,
        string ipfsHash,
        uint256 timestamp
    );
    
    event RepostDetected(
        bytes32 indexed uploadedHash,
        bytes32 indexed originalHash,
        address indexed uploader,
        address originalCreator,
        string matchType
    );
    
    event DisputeRaised(
        uint256 indexed disputeId,
        bytes32 indexed videoHash,
        address indexed accuser,
        string reason
    );
    
    event DisputeResolved(
        uint256 indexed disputeId,
        address indexed resolver,
        bool upheld
    );
    
    event ArbitratorAdded(address indexed arbitrator);
    event ArbitratorRemoved(address indexed arbitrator);
    
    // ============ MODIFIERS ============
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyArbitrator() {
        require(arbitrators[msg.sender] || msg.sender == admin, "Only arbitrator can resolve disputes");
        _;
    }
    
    modifier onlyExistingVideo(bytes32 _exactHash) {
        require(videosByExactHash[_exactHash].creator != address(0), "Video not found");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        admin = msg.sender;
        arbitrators[msg.sender] = true;
        emit ArbitratorAdded(msg.sender);
    }
    
    // ============ CORE FUNCTIONS ============
    
    /**
     * @dev Register a new video with 3-layer hashing
     * @param _exactHash SHA-256 hash of video file
     * @param _perceptualHash Visual fingerprint from frames
     * @param _audioFingerprint Audio signature
     * @param _ipfsHash IPFS CID for retrieval
     */
    function registerVideo(
        bytes32 _exactHash,
        string memory _perceptualHash,
        string memory _audioFingerprint,
        string memory _ipfsHash
    ) external {
        require(_exactHash != bytes32(0), "Invalid exact hash");
        require(bytes(_perceptualHash).length > 0, "Perceptual hash required");
        require(bytes(_audioFingerprint).length > 0, "Audio fingerprint required");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(videosByExactHash[_exactHash].creator == address(0), "Video already registered");
        
        // Create video record
        videosByExactHash[_exactHash] = VideoRecord({
            creator: msg.sender,
            exactHash: _exactHash,
            perceptualHash: _perceptualHash,
            audioFingerprint: _audioFingerprint,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            isDisputed: false,
            views: 0
        });
        
        // Add to indexes for fast lookup
        videosByPerceptualHash[_perceptualHash].push(_exactHash);
        videosByAudioHash[_audioFingerprint].push(_exactHash);
        videosByCreator[msg.sender].push(_exactHash);
        
        totalVideosRegistered++;
        
        emit VideoRegistered(
            _exactHash,
            msg.sender,
            _perceptualHash,
            _audioFingerprint,
            _ipfsHash,
            block.timestamp
        );
    }
    
    /**
     * @dev Detect if uploaded video is a repost using 3-layer detection
     * @param _exactHash Exact hash of uploaded file
     * @param _perceptualHash Perceptual hash of uploaded file
     * @param _audioFingerprint Audio fingerprint of uploaded file
     * @return isRepost Whether a match was found
     * @return originalCreator Address of original creator (if match found)
     * @return originalIpfsHash IPFS hash of original video
     * @return matchType Type of match: EXACT_DUPLICATE, VISUAL_MATCH, AUDIO_MATCH, or ORIGINAL
     * @return originalHash Exact hash of original video
     */
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
    ) {
        // Layer 1: Exact hash match (100% duplicate)
        if (videosByExactHash[_exactHash].creator != address(0)) {
            VideoRecord memory v = videosByExactHash[_exactHash];
            totalRepostsDetected++;
            emit RepostDetected(_exactHash, _exactHash, msg.sender, v.creator, "EXACT_DUPLICATE");
            return (true, v.creator, v.ipfsHash, "EXACT_DUPLICATE", _exactHash);
        }
        
        // Layer 2: Perceptual hash match (visual similarity)
        bytes32[] memory pMatches = videosByPerceptualHash[_perceptualHash];
        if (pMatches.length > 0) {
            VideoRecord memory v = videosByExactHash[pMatches[0]];
            totalRepostsDetected++;
            emit RepostDetected(_exactHash, pMatches[0], msg.sender, v.creator, "VISUAL_MATCH");
            return (true, v.creator, v.ipfsHash, "VISUAL_MATCH", pMatches[0]);
        }
        
        // Layer 3: Audio fingerprint match (audio reuse)
        bytes32[] memory aMatches = videosByAudioHash[_audioFingerprint];
        if (aMatches.length > 0) {
            VideoRecord memory v = videosByExactHash[aMatches[0]];
            totalRepostsDetected++;
            emit RepostDetected(_exactHash, aMatches[0], msg.sender, v.creator, "AUDIO_MATCH");
            return (true, v.creator, v.ipfsHash, "AUDIO_MATCH", aMatches[0]);
        }
        
        // No match found - original content
        return (false, address(0), "", "ORIGINAL", bytes32(0));
    }
    
    /**
     * @dev Get complete video information
     * @param _exactHash Exact hash of video
     */
    function getVideoInfo(bytes32 _exactHash) 
        external 
        view 
        onlyExistingVideo(_exactHash)
        returns (VideoRecord memory) 
    {
        return videosByExactHash[_exactHash];
    }
    
    /**
     * @dev Get all videos by a creator
     * @param _creator Address of creator
     */
    function getVideosByCreator(address _creator) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return videosByCreator[_creator];
    }
    
    /**
     * @dev Increment view counter
     * @param _exactHash Exact hash of video
     */
    function incrementViews(bytes32 _exactHash) 
        external 
        onlyExistingVideo(_exactHash) 
    {
        videosByExactHash[_exactHash].views++;
    }
    
    // ============ DISPUTE SYSTEM ============
    
    /**
     * @dev Raise a dispute for a video
     * @param _videoHash Exact hash of disputed video
     * @param _reason Reason for dispute
     */
    function raiseDispute(bytes32 _videoHash, string memory _reason) 
        external 
        onlyExistingVideo(_videoHash)
        returns (uint256 disputeId)
    {
        require(bytes(_reason).length > 0, "Reason required");
        
        disputeId = disputeCount++;
        
        disputes[disputeId] = DisputeRecord({
            accuser: msg.sender,
            targetVideoHash: _videoHash,
            reason: _reason,
            timestamp: block.timestamp,
            resolved: false,
            resolver: address(0)
        });
        
        videosByExactHash[_videoHash].isDisputed = true;
        
        emit DisputeRaised(disputeId, _videoHash, msg.sender, _reason);
        
        return disputeId;
    }
    
    /**
     * @dev Resolve a dispute (arbitrator only)
     * @param _disputeId ID of dispute
     * @param _upheld Whether dispute is upheld (true) or rejected (false)
     */
    function resolveDispute(uint256 _disputeId, bool _upheld) 
        external 
        onlyArbitrator 
    {
        require(_disputeId < disputeCount, "Invalid dispute ID");
        DisputeRecord storage dispute = disputes[_disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        
        dispute.resolved = true;
        dispute.resolver = msg.sender;
        
        if (!_upheld) {
            // Dispute rejected - clear dispute flag
            videosByExactHash[dispute.targetVideoHash].isDisputed = false;
        }
        
        emit DisputeResolved(_disputeId, msg.sender, _upheld);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Add an arbitrator
     */
    function addArbitrator(address _arbitrator) external onlyAdmin {
        require(_arbitrator != address(0), "Invalid address");
        arbitrators[_arbitrator] = true;
        emit ArbitratorAdded(_arbitrator);
    }
    
    /**
     * @dev Remove an arbitrator
     */
    function removeArbitrator(address _arbitrator) external onlyAdmin {
        arbitrators[_arbitrator] = false;
        emit ArbitratorRemoved(_arbitrator);
    }
    
    /**
     * @dev Transfer admin role
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get platform statistics
     */
    function getStats() external view returns (
        uint256 totalVideos,
        uint256 totalReposts,
        uint256 totalDisputes
    ) {
        return (totalVideosRegistered, totalRepostsDetected, disputeCount);
    }
    
    /**
     * @dev Check if video exists
     */
    function videoExists(bytes32 _exactHash) external view returns (bool) {
        return videosByExactHash[_exactHash].creator != address(0);
    }
    
    /**
     * @dev Get dispute information
     */
    function getDisputeInfo(uint256 _disputeId) 
        external 
        view 
        returns (DisputeRecord memory) 
    {
        require(_disputeId < disputeCount, "Invalid dispute ID");
        return disputes[_disputeId];
    }
}
