require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

/**
 * Hardhat configuration for VideoGuard contract on Polygon Amoy Testnet
 * PERSON 4: Optimized for gas efficiency (<100k per tx)
 */

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Balanced for deployment + runtime gas costs
      },
      viaIR: false, // Disable for faster compilation
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    amoy: {
      url: process.env.RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: "auto",
      gas: 6000000, // Gas limit
    },
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || process.env.POLYGON_RPC || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
      gasPrice: 8000000000, // 8 Gwei - typical Mumbai gas price
      gas: 6000000, // Gas limit
    },
    polygon: {
      url: process.env.POLYGON_MAINNET_RPC || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Balanced for deployment + runtime gas costs
      },
      viaIR: false, // Disable for faster compilation
    },
  },
};
