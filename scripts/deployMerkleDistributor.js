require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
const { ethers } = require('hardhat')

async function main() {
  // Get deployment parameters from environment variables
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS
  const MERKLE_ROOT = process.env.MERKLE_ROOT
  const OWNER_ADDRESS = process.env.OWNER_ADDRESS
  const FUNDER_ADDRESS = process.env.FUNDER_ADDRESS

  // Validate parameters
  if (!TOKEN_ADDRESS) {
    throw new Error('TOKEN_ADDRESS environment variable is required')
  }
  if (!MERKLE_ROOT) {
    throw new Error('MERKLE_ROOT environment variable is required')
  }
  if (!OWNER_ADDRESS) {
    throw new Error('OWNER_ADDRESS environment variable is required')
  }
  if (!FUNDER_ADDRESS) {
    throw new Error('FUNDER_ADDRESS environment variable is required')
  }

  console.log('Deploying MerkleDistributor with:')
  console.log('  Token Address:', TOKEN_ADDRESS)
  console.log('  Merkle Root:', MERKLE_ROOT)
  console.log('  Owner Address:', OWNER_ADDRESS)
  console.log('  Funder Address:', FUNDER_ADDRESS)
  console.log('')

  const [deployer] = await ethers.getSigners()
  console.log('Deploying from account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())
  console.log('')

  const MerkleDistributor = await ethers.getContractFactory('MerkleDistributor')
  const merkleDistributor = await MerkleDistributor.deploy(TOKEN_ADDRESS, MERKLE_ROOT, OWNER_ADDRESS, FUNDER_ADDRESS)

  console.log('Waiting for deployment...')
  await merkleDistributor.deployed()

  console.log('')
  console.log('='.repeat(60))
  console.log('MerkleDistributor deployed successfully!')
  console.log('Contract address:', merkleDistributor.address)
  console.log('='.repeat(60))
  console.log('')
  console.log('Next steps:')
  console.log('1. Verify the contract on BSCScan')
  console.log('2. Funder must approve the contract to spend tokens:')
  console.log('   - Funder Address:', FUNDER_ADDRESS)
  console.log('   - Contract Address:', merkleDistributor.address)
  console.log('   - Approve sufficient token amount for all claims')
  console.log('3. Distribute the claims JSON to eligible users')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
