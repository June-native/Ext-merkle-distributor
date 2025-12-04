require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
const { ethers } = require('hardhat')

async function main() {
  // Get deployment parameters from environment variables
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS
  const MERKLE_ROOT = process.env.MERKLE_ROOT
  const OWNER_ADDRESS = process.env.OWNER_ADDRESS
  const END_TIME = process.env.END_TIME

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
  if (!END_TIME) {
    throw new Error('END_TIME environment variable is required (Unix timestamp)')
  }

  const endTimeNumber = parseInt(END_TIME)
  const endTimeDate = new Date(endTimeNumber * 1000)

  console.log('Deploying MerkleDistributorWithDeadline with:')
  console.log('  Token Address:', TOKEN_ADDRESS)
  console.log('  Merkle Root:', MERKLE_ROOT)
  console.log('  Owner Address:', OWNER_ADDRESS)
  console.log('  End Time:', endTimeNumber, `(${endTimeDate.toISOString()})`)
  console.log('')

  const [deployer] = await ethers.getSigners()
  console.log('Deploying from account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())
  console.log('')

  const MerkleDistributorWithDeadline = await ethers.getContractFactory('MerkleDistributorWithDeadline')
  const merkleDistributorWithDeadline = await MerkleDistributorWithDeadline.deploy(
    TOKEN_ADDRESS,
    MERKLE_ROOT,
    endTimeNumber,
    OWNER_ADDRESS
  )

  console.log('Waiting for deployment...')
  await merkleDistributorWithDeadline.deployed()

  console.log('')
  console.log('='.repeat(60))
  console.log('MerkleDistributorWithDeadline deployed successfully!')
  console.log('Contract address:', merkleDistributorWithDeadline.address)
  console.log('='.repeat(60))
  console.log('')
  console.log('Next steps:')
  console.log('1. Verify the contract on BSCScan')
  console.log('2. Transfer tokens to the contract:', merkleDistributorWithDeadline.address)
  console.log('3. Distribute the claims JSON to eligible users')
  console.log('4. After', endTimeDate.toISOString(), 'owner can withdraw unclaimed tokens')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
