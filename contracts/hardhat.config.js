require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

/**
 * Hardhat configuration for VideoGuard contract
 * PERSON 4: Configure networks and deployment settings
 */

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
    },
    // Add other networks as needed
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
  },
};
