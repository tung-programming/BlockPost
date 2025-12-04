// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VideoGuard
 * @dev Smart contract for storing and verifying content hashes on blockchain
 * @notice This contract will be implemented by PERSON 4 (Blockchain team member)
 * 
 * TODO: Implement the following functions:
 * - registerContent(string contentHash, string metadata)
 * - verifyContent(string contentHash)
 * - getContentInfo(string contentHash)
 */

contract VideoGuard {
    struct ContentRecord {
        address creator;
        uint256 timestamp;
        string contentHash;
        string metadata;
        bool exists;
    }

    mapping(string => ContentRecord) public contentRegistry;
    
    event ContentRegistered(
        address indexed creator,
        string contentHash,
        uint256 timestamp
    );

    // TODO: Implement contract logic
}
