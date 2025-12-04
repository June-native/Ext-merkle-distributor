# MerkleDistributor - BSC Mainnet Deployment Guide

## Pre-Deployment Checklist

### 1. Prepare Your Environment

Create a `.env` file in the project root with the following variables:

```bash
# Required: Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: BSC RPC URLs (defaults are provided)
BSC_RPC_URL=https://bsc-dataseed1.binance.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# Required for deployment
TOKEN_ADDRESS=0x... # Address of the token to distribute
MERKLE_ROOT=0x... # Merkle root from generate-merkle-root.ts
OWNER_ADDRESS=0x... # Address that will own the contract

# Required for MerkleDistributorWithDeadline only
END_TIME=1735689600 # Unix timestamp when claiming ends

# Optional: For contract verification
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

### 2. Generate Merkle Root

Create a JSON file with addresses and amounts:

```json
{
  "0xAddress1...": "1000",
  "0xAddress2...": "2000",
  "0xAddress3...": "3000"
}
```

Generate the merkle root and claims:

```bash
yarn generate-merkle-root --input path/to/your/distribution.json > claims.json
```

This will output:
- `merkleRoot`: Use this for `MERKLE_ROOT` in .env
- `tokenTotal`: Total tokens needed
- `claims`: Distribution data for users

### 3. Prepare Your Wallet

Ensure your deployment wallet has:
- Sufficient BNB for gas fees (recommended: at least 0.1 BNB)
- Access to enough tokens for the total distribution

## Deployment Steps

### Option A: Deploy MerkleDistributor (No Deadline)

```bash
# Set environment variables
export TOKEN_ADDRESS=0x... # Your token address
export MERKLE_ROOT=0x... # From generate-merkle-root output
export OWNER_ADDRESS=0x... # Your owner address

# Deploy to BSC Mainnet
npx hardhat run scripts/deployMerkleDistributor.js --network bscMainnet
```

### Option B: Deploy MerkleDistributorWithDeadline

```bash
# Set environment variables
export TOKEN_ADDRESS=0x...
export MERKLE_ROOT=0x...
export OWNER_ADDRESS=0x...
export END_TIME=1735689600 # Unix timestamp

# Deploy to BSC Mainnet
npx hardhat run scripts/deployMerkleDistributorWithDeadline.js --network bscMainnet
```

### Test on BSC Testnet First (Recommended)

```bash
# Deploy to testnet first
npx hardhat run scripts/deployMerkleDistributor.js --network bscTestnet
```

## Post-Deployment Steps

### 1. Verify the Contract

Save your deployment address, then verify on BSCScan:

```bash
npx hardhat verify --network bscMainnet DEPLOYED_CONTRACT_ADDRESS \
  "TOKEN_ADDRESS" \
  "MERKLE_ROOT" \
  "OWNER_ADDRESS"
```

For MerkleDistributorWithDeadline, add the end time:

```bash
npx hardhat verify --network bscMainnet DEPLOYED_CONTRACT_ADDRESS \
  "TOKEN_ADDRESS" \
  "MERKLE_ROOT" \
  "END_TIME" \
  "OWNER_ADDRESS"
```

### 2. Fund the Contract

Transfer the exact `tokenTotal` amount (from merkle root generation) to the deployed contract address.

```javascript
// Example: Transfer tokens to the distributor
const tokenContract = await ethers.getContractAt('IERC20', TOKEN_ADDRESS)
await tokenContract.transfer(DISTRIBUTOR_ADDRESS, TOKEN_TOTAL)
```

### 3. Distribute Claims Data

Share the `claims.json` file with eligible users or integrate it into your frontend dApp.

Users will need:
- Their `index`
- Their `account` address
- Their `amount`
- Their `proof` array

## User Claiming

Users can claim their tokens by calling:

```javascript
// For regular MerkleDistributor
await distributorContract.claim(
  index,
  account,
  amount,
  proof
)

// For claiming via FixedTermYield redemption
await distributorContract.claimFromRedemption(
  index,
  account,
  amount,
  proof,
  redeemTokenAddress
)
```

## Contract Management

### Pause/Unpause (Owner Only)

```javascript
// Pause claiming
await distributorContract.pause()

// Resume claiming
await distributorContract.unpause()
```

### Transfer Ownership (2-Step Process)

```javascript
// Step 1: Current owner initiates transfer
await distributorContract.transferOwnership(newOwnerAddress)

// Step 2: New owner accepts
await distributorContract.connect(newOwner).acceptOwnership()
```

### Rescue Tokens (Owner Only)

```javascript
// Rescue stuck tokens
await distributorContract.rescueTokens(
  tokenAddress,
  recipientAddress,
  amount
)
```

### Withdraw After Deadline (MerkleDistributorWithDeadline Only)

```javascript
// After the deadline has passed, owner can withdraw unclaimed tokens
await distributorContract.withdraw()
```

## Important BSC Mainnet Information

- **Chain ID**: 56
- **Currency**: BNB
- **Block Explorer**: https://bscscan.com
- **RPC URLs**:
  - https://bsc-dataseed1.binance.org
  - https://bsc-dataseed2.binance.org
  - https://bsc-dataseed3.binance.org
  - https://bsc-dataseed4.binance.org

## Gas Optimization

The contract is already optimized with:
- Optimizer runs: 5000
- Packed bitmap for claim tracking
- Efficient merkle proof verification

Typical gas costs on BSC:
- Deployment: ~2-3M gas (~0.006-0.009 BNB at 3 gwei)
- Claim: ~70-100k gas per claim
- Pause/Unpause: ~30k gas
- Owner transfer: ~50k gas

## Security Checklist

- [ ] Compiled contracts with optimizer enabled
- [ ] Tested on BSC testnet
- [ ] Merkle root verified with test claims
- [ ] Total token amount matches merkle tree
- [ ] Owner address is a secure multisig or hardware wallet
- [ ] Contract verified on BSCScan
- [ ] Tokens funded to contract
- [ ] Emergency pause mechanism tested
- [ ] Claims data distributed to users

## Troubleshooting

### "AlreadyClaimed" Error
User has already claimed their tokens for this index.

### "InvalidProof" Error
- Check that the merkle root matches the deployed contract
- Verify the proof array is correct
- Ensure index, account, and amount match the generated data

### "Pausable: paused" Error
Contract is currently paused. Owner needs to call `unpause()`.

### Gas Price Too Low
BSC typically requires 3-5 gwei. Update `hardhat.config.ts` if needed.

## Support Resources

- BSC Documentation: https://docs.bnbchain.org
- BSCScan: https://bscscan.com
- Hardhat Docs: https://hardhat.org/docs

