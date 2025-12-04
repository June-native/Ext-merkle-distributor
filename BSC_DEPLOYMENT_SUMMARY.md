# BSC Mainnet Deployment - Ready to Deploy

## Summary

Your MerkleDistributor contracts are now fully prepared for BSC Mainnet deployment with all necessary features:

### Contract Features
- ✅ Merkle tree-based token distribution
- ✅ Pausable claiming (owner can pause/unpause)
- ✅ 2-step ownership transfer (Ownable2Step)
- ✅ Token rescue functionality
- ✅ Integration with FixedTermYield via `claimFromRedemption`
- ✅ Optional deadline-based distribution
- ✅ Gas optimized (5000 optimizer runs)

### Network Configuration
- ✅ BSC Mainnet (Chain ID: 56)
- ✅ BSC Testnet (Chain ID: 97)
- ✅ Default RPC endpoints configured
- ✅ BSCScan verification support enabled

### Deployment Scripts
- ✅ `deployMerkleDistributor.js` - Standard distributor
- ✅ `deployMerkleDistributorWithDeadline.js` - With claiming deadline
- ✅ Environment variable validation
- ✅ Detailed deployment logging
- ✅ Post-deployment instructions

### Testing
- ✅ 87 comprehensive tests passing
- ✅ Pause/unpause functionality tested
- ✅ Ownership transfer tested
- ✅ Token rescue tested
- ✅ Claim from redemption tested
- ✅ Gas costs measured

## Quick Start

### 1. Set Environment Variables

Create `.env` file:
```bash
PRIVATE_KEY=your_private_key_without_0x
TOKEN_ADDRESS=0x...  # Your token on BSC
MERKLE_ROOT=0x...    # From generate-merkle-root
OWNER_ADDRESS=0x...  # Owner wallet address
BSCSCAN_API_KEY=...  # For verification
```

### 2. Generate Merkle Root

```bash
# Create distribution.json with addresses and amounts
yarn generate-merkle-root --input distribution.json > claims.json
```

### 3. Deploy to BSC Mainnet

```bash
# Standard distributor
npx hardhat run scripts/deployMerkleDistributor.js --network bscMainnet

# Or with deadline
npx hardhat run scripts/deployMerkleDistributorWithDeadline.js --network bscMainnet
```

### 4. Verify Contract

```bash
npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS> \
  "<TOKEN_ADDRESS>" "<MERKLE_ROOT>" "<OWNER_ADDRESS>"
```

### 5. Fund Contract

Transfer the total token amount to the deployed contract address.

## Documentation

- 📖 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- ✅ **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- 📝 **[README.md](./README.md)** - Project overview and usage

## Contract Addresses (After Deployment)

**BSC Mainnet**
- MerkleDistributor: `<to be deployed>`
- Token being distributed: `<your token>`

**BSC Testnet** (for testing)
- MerkleDistributor: `<test deployment>`

## Key Commands

```bash
# Install dependencies
yarn install

# Compile contracts
yarn compile

# Run tests
yarn test

# Generate merkle root
yarn generate-merkle-root --input <file.json>

# Deploy to testnet (recommended first)
npx hardhat run scripts/deployMerkleDistributor.js --network bscTestnet

# Deploy to mainnet
npx hardhat run scripts/deployMerkleDistributor.js --network bscMainnet

# Verify on BSCScan
npx hardhat verify --network bscMainnet <address> <args...>
```

## Gas Estimates on BSC

| Operation | Gas Used | Cost (3 gwei) |
|-----------|----------|---------------|
| Deploy Contract | ~2-3M | ~0.006-0.009 BNB |
| Claim | ~70-100k | ~0.0002-0.0003 BNB |
| Pause/Unpause | ~30k | ~0.00009 BNB |
| Transfer Ownership | ~50k | ~0.00015 BNB |
| Rescue Tokens | ~50k | ~0.00015 BNB |

## Security Features

1. **Pausable**: Owner can pause claiming in emergencies
2. **2-Step Ownership**: Prevents accidental ownership transfers
3. **Token Rescue**: Recover accidentally sent tokens
4. **Merkle Proofs**: Cryptographically secure distribution
5. **Optimized**: Gas-efficient with packed bitmaps

## Support

- BSC Docs: https://docs.bnbchain.org
- BSCScan: https://bscscan.com
- Contract verified source will be on BSCScan after deployment

## Next Steps

1. ✅ Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
2. ✅ Test on BSC Testnet first
3. ✅ Prepare distribution list
4. ✅ Generate merkle root and claims
5. ✅ Deploy to BSC Mainnet
6. ✅ Verify contract
7. ✅ Fund with tokens
8. ✅ Distribute claims to users

---

**Ready to Deploy!** 🚀

All contracts have been tested, optimized, and configured for BSC Mainnet deployment.

