/**
 * Deployment script for VideoGuard contract to Polygon Amoy testnet
 * PERSON 4: Deploy smart contract with verification
 * 
 * Usage: npx hardhat run scripts/deploy-Amoy.js --network amoy
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying VideoGuard contract to Polygon Amoy testnet...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MATIC\n");
  
  if (balance === 0n) {
    console.log("⚠️  Warning: Account has no MATIC!");
    console.log("   Get testnet MATIC from: https://faucet.polygon.technology/");
    console.log("   Select 'Polygon Amoy' network\n");
  }

  // Deploy contract
  console.log("📦 Deploying VideoGuard contract...");
  const VideoGuard = await hre.ethers.getContractFactory("VideoGuard");
  const videoGuard = await VideoGuard.deploy();
  
  await videoGuard.waitForDeployment();
  const contractAddress = await videoGuard.getAddress();
  
  console.log("✅ VideoGuard deployed to:", contractAddress);
  console.log("🔗 View on PolygonScan:", `https://amoy.polygonscan.com/address/${contractAddress}\n`);

  // Wait for a few block confirmations
  console.log("⏳ Waiting for 5 block confirmations...");
  await videoGuard.deploymentTransaction().wait(5);
  console.log("✅ Confirmations complete\n");

  // Get contract ABI and metadata
  const artifact = await hre.artifacts.readArtifact("VideoGuard");
  
  // Prepare contract data
  const contractData = {
    contractName: "VideoGuard",
    contractAddress: contractAddress,
    network: "amoy",
    chainId: 80002,
    deployer: deployer.address,
    deploymentTimestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    explorerUrl: `https://amoy.polygonscan.com/address/${contractAddress}`,
    rpcUrl: "https://rpc-amoy.polygon.technology/",
  };

  // Save to docs/CONTRACT-ABI.json
  const docsDir = path.join(__dirname, "../../docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  const abiPath = path.join(docsDir, "CONTRACT-ABI.json");
  fs.writeFileSync(abiPath, JSON.stringify(contractData, null, 2));
  console.log("💾 Contract ABI saved to:", abiPath);

  // Save simplified version for frontend
  const frontendData = {
    address: contractAddress,
    abi: artifact.abi,
    network: "amoy",
    chainId: 80002,
  };
  
  const frontendDir = path.join(__dirname, "../../frontend/src");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  
  const frontendAbiPath = path.join(frontendDir, "VideoGuardContract.json");
  fs.writeFileSync(frontendAbiPath, JSON.stringify(frontendData, null, 2));
  console.log("💾 Frontend contract data saved to:", frontendAbiPath);

  // Save for backend
  const backendDir = path.join(__dirname, "../../backend/src");
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }
  
  const backendAbiPath = path.join(backendDir, "VideoGuardContract.json");
  fs.writeFileSync(backendAbiPath, JSON.stringify(frontendData, null, 2));
  console.log("💾 Backend contract data saved to:", backendAbiPath);

  // Create .env template
  const envTemplate = `
# VideoGuard Smart Contract Configuration (Polygon Amoy)
CONTRACT_ADDRESS=${contractAddress}
POLYGON_RPC=https://rpc-amoy.polygon.technology/
CHAIN_ID=80002
NETWORK=amoy
`;

  const envTemplatePath = path.join(__dirname, "../../.env.contract");
  fs.writeFileSync(envTemplatePath, envTemplate.trim());
  console.log("💾 Environment template saved to: .env.contract\n");

  // Verify contract on PolygonScan (if API key is set)
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("🔍 Verifying contract on PolygonScan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!\n");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️  Contract already verified\n");
      } else {
        console.log("⚠️  Verification failed:", error.message);
        console.log("   You can verify manually later:\n");
        console.log(`   npx hardhat verify --network amoy ${contractAddress}\n`);
      }
    }
  } else {
    console.log("ℹ️  Skipping verification (POLYGONSCAN_API_KEY not set)");
    console.log("   To verify later, run:");
    console.log(`   npx hardhat verify --network amoy ${contractAddress}\n`);
  }

  // Display summary
  console.log("=" .repeat(70));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log("Contract Address:", contractAddress);
  console.log("Network:         ", "Polygon Amoy Testnet (ChainID: 80002)");
  console.log("Deployer:        ", deployer.address);
  console.log("Explorer:        ", `https://amoy.polygonscan.com/address/${contractAddress}`);
  console.log("RPC URL:         ", "https://rpc-amoy.polygon.technology/");
  console.log("=".repeat(70));
  console.log("\n🎉 Deployment complete! Next steps:");
  console.log("   1. Update .env files with CONTRACT_ADDRESS");
  console.log("   2. Test contract functions with: npm test");
  console.log("   3. Integrate with backend using saved ABI");
  console.log("   4. Connect frontend to deployed contract\n");
  console.log("💡 Add to .env:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
