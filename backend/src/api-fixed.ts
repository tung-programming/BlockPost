// Replace lines after fileInfo with this:

    // PHASE 5: Blockchain Integration (Frontend Mode)
    const blockchainMode = process.env.BLOCKCHAIN_MODE || 'frontend';
    
    if (blockchainMode === 'frontend') {
      // Frontend mode: Return hashes and IPFS data, let frontend handle blockchain
      const totalDuration = hashDuration + ipfsDuration + metadataDuration;
      
      console.log(`[UPLOAD] ✓ Asset processed (frontend blockchain mode)`);
      console.log(`[UPLOAD] Hashes generated, IPFS uploaded, metadata created`);
      console.log(`[UPLOAD] Frontend will handle blockchain transaction\n`);
      
      // Check for duplicate content in memory
      let status: 'ORIGINAL' | 'EXACT_DUPLICATE' | 'VISUAL_MATCH' | 'AUDIO_MATCH' = 'ORIGINAL';
      
      for (const existingPost of posts) {
        if (existingPost.exactHash === hashResult.exactHash) {
          status = 'EXACT_DUPLICATE';
          break;
        }
        if (hashResult.perceptualHash && existingPost.perceptualHash === hashResult.perceptualHash) {
          status = 'VISUAL_MATCH';
          break;
        }
        if (hashResult.audioHash && existingPost.audioHash === hashResult.audioHash) {
          status = 'AUDIO_MATCH';
          break;
        }
      }

      // Store post in memory
      const newPost: Post = {
        id: Date.now().toString(),
        ipfsCid: ipfsResult.cid,
        metadataCid: metadataResult.cid,
        gatewayUrl: ipfsResult.gatewayUrl,
        metadataUrl: metadataResult.gatewayUrl,
        walletAddress: req.body.walletAddress || 'anonymous',
        title: req.body.title || req.file.originalname,
        description: req.body.description || req.body.caption || '',
        exactHash: hashResult.exactHash,
        perceptualHash: hashResult.perceptualHash,
        audioHash: hashResult.audioHash,
        assetType: hashResult.assetType,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        status: status,
        timestamp: createdAt
      };

      posts.push(newPost);
      console.log(`[UPLOAD] ✓ Post stored with status: ${status}`);
      console.log(`[UPLOAD] Total posts in memory: ${posts.length}\n`);
      
      res.json({
        success: true,
        status: 'READY_FOR_BLOCKCHAIN',
        post: newPost,
        metadata: metadata,
        assetType: hashResult.assetType,
        fileInfo: fileInfo,
        hashes: {
          exactHash: hashResult.exactHash,
          perceptualHash: hashResult.perceptualHash,
          audioHash: hashResult.audioHash
        },
        ipfs: {
          cid: ipfsResult.cid,
          gatewayUrl: ipfsResult.gatewayUrl,
          metadataCid: metadataResult.cid,
          metadataUrl: metadataResult.gatewayUrl
        },
        duplicateStatus: status,
        processingTime: {
          hashing: `${hashDuration}ms`,
          ipfs: `${ipfsDuration}ms`,
          metadata: `${metadataDuration}ms`,
          total: `${totalDuration}ms`
        }
      });
      return;
    }

  } catch (error) {
    // Log error details
    console.error('[UPLOAD ERROR]', error instanceof Error ? error.message : 'Unknown error');
    
    // Return error response
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while processing the upload'
    });
  }
});
