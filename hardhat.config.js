require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const POLYGON_MUMBAI_RPC = process.env.POLYGON_MUMBAI_RPC || "https://rpc-mumbai.maticvigil.com";
const POLYGON_MAINNET_RPC = process.env.POLYGON_MAINNET_RPC || "https://polygon-rpc.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  
  networks: {
    hardhat: {
      chainId: 1337
    },
    
    polygonMumbai: {
      url: POLYGON_MUMBAI_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80001,
      gasPrice: 2000000000, // 2 gwei
      gas: 6000000
    },
    
    polygon: {
      url: POLYGON_MAINNET_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: 40000000000, // 40 gwei
      gas: 6000000
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY
    }
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  
  mocha: {
    timeout: 40000
  }
};