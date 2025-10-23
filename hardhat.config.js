require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // Solidity 编译器配置
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // 优化运行次数，平衡 gas 消耗和部署成本
      },
      // 启用 evmVersion 以获得更好的 gas 优化
      evmVersion: "paris",
    },
  },

  // 网络配置
  networks: {
    // 本地开发网络
    hardhat: {
      chainId: 31337,
      // 可以配置初始账户和余额用于测试
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10,
        accountsBalance: "10000000000000000000000", // 10 ETH
      },
    },

    // Sepolia 测试网
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      // Gas 配置
      gasPrice: "auto",
      gas: "auto",
      // 超时设置
      timeout: 60000,
      // 确认数
      confirmations: 2,
    },

    // 以太坊主网
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
      confirmations: 3, // 主网使用更多确认数
    },

    // 其他测试网（可选）
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 5,
    },
  },

  // Etherscan 验证配置
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
    },
  },

  // Gas 报告配置
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    // 可以配置 gas 价格 API
    gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
    // 输出文件
    outputFile: "gas-report.txt",
    // 不显示颜色（适合 CI/CD）
    noColors: true,
  },

  // 路径配置
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // Mocha 测试配置
  mocha: {
    timeout: 40000, // 40 秒超时
  },

  // 合约大小限制
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [":DIDOToken", ":TokenVesting"],
  },
};
