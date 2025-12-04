/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('dotenv').config()
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomicfoundation/hardhat-verify'

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 5000,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      settings: {
        debug: {
          revertStrings: 'debug',
        },
      },
    },
    tenderly: {
      chainId: 1,
      url: `https://rpc.tenderly.co/fork/${process.env.TENDERLY_FORK_ID}`,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    bscMainnet: {
      url: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
      chainId: 56,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 3000000000,
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000,
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY || '',
    customChains: [
      {
        network: 'bscMainnet',
        chainId: 56,
        urls: {
          apiURL: 'https://api.bscscan.com/api',
          browserURL: 'https://bscscan.com',
        },
      },
      {
        network: 'bscTestnet',
        chainId: 97,
        urls: {
          apiURL: 'https://api-testnet.bscscan.com/api',
          browserURL: 'https://testnet.bscscan.com',
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
}
