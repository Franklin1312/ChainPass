// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      },
      viaIR: true
    }
  },

  networks: {
    // Local development network
    hardhat: {
      chainId: 1337
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },

    // Ethereum Sepolia Testnet
    sepolia: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
  },

  etherscan: {
    apiKey: process.env.API_KEY,
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",   // V2-compatible
          browserURL: "https://sepolia.etherscan.io"
        }
      }
    ]
  },

  sourcify: {
    enabled: false,
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts"
  },
};//https://sepolia.etherscan.io/address/0xd05604536a5Fc891DB8eEbd4CaB7aF1C302aA329#code