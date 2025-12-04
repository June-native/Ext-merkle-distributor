# Pre-Deployment Checklist for BSC Mainnet

## Environment Setup
- [ ] Node.js and Yarn installed
- [ ] Dependencies installed (`yarn install`)
- [ ] Contracts compiled successfully (`yarn compile`)
- [ ] All tests passing (`yarn test`)

## Configuration
- [ ] `.env` file created with required variables:
  - [ ] `PRIVATE_KEY` - Deployer wallet private key (secure!)
  - [ ] `TOKEN_ADDRESS` - Token contract address to distribute
  - [ ] `MERKLE_ROOT` - Generated merkle root
  - [ ] `OWNER_ADDRESS` - Contract owner address
  - [ ] `END_TIME` - (Optional) For MerkleDistributorWithDeadline
  - [ ] `BSCSCAN_API_KEY` - For contract verification
- [ ] Network configuration verified in `hardhat.config.ts`

## Merkle Tree Generation
- [ ] Distribution list prepared (addresses and amounts)
- [ ] Merkle root generated: `yarn generate-merkle-root --input distribution.json > claims.json`
- [ ] Merkle root verified with test data
- [ ] Total token amount calculated and noted
- [ ] Claims JSON saved for distribution to users

## Wallet Preparation
- [ ] Deployer wallet funded with BNB (minimum 0.1 BNB recommended)
- [ ] Deployer has access to distribute tokens
- [ ] Owner address secured (multisig/hardware wallet recommended)
- [ ] Owner address tested and accessible

## Pre-Deployment Testing
- [ ] Contracts deployed to BSC Testnet
- [ ] Test claims executed successfully on testnet
- [ ] Pause/unpause functionality tested
- [ ] Owner transfer tested (2-step process)
- [ ] Token rescue functionality tested
- [ ] Gas costs estimated and acceptable

## Deployment Parameters Ready
For MerkleDistributor:
```bash
TOKEN_ADDRESS=0x...
MERKLE_ROOT=0x...
OWNER_ADDRESS=0x...
```

For MerkleDistributorWithDeadline:
```bash
TOKEN_ADDRESS=0x...
MERKLE_ROOT=0x...
OWNER_ADDRESS=0x...
END_TIME=1735689600  # Unix timestamp
```

## Deployment Command
```bash
# MerkleDistributor
npx hardhat run scripts/deployMerkleDistributor.js --network bscMainnet

# OR MerkleDistributorWithDeadline
npx hardhat run scripts/deployMerkleDistributorWithDeadline.js --network bscMainnet
```

## Post-Deployment Checklist
- [ ] Contract address saved and documented
- [ ] Contract verified on BSCScan: 
  ```bash
  npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS> "<TOKEN>" "<MERKLE_ROOT>" "<OWNER>"
  ```
- [ ] Contract ownership verified (call `owner()`)
- [ ] Tokens transferred to contract (exact `tokenTotal` amount)
- [ ] Token balance confirmed in contract
- [ ] Claims JSON distributed to eligible users
- [ ] Frontend/dApp updated with contract address (if applicable)

## Security Verification
- [ ] Contract source code verified on BSCScan
- [ ] Owner address is secure (multisig preferred)
- [ ] No tokens remaining in deployer wallet
- [ ] Emergency pause capability confirmed
- [ ] Ownership transfer process understood by team

## User Communication
- [ ] Users notified of distribution
- [ ] Claiming instructions provided
- [ ] Support channels established
- [ ] Claiming deadline communicated (if applicable)
- [ ] Gas cost estimates provided to users

## Monitoring Plan
- [ ] BSCScan tracking set up for contract
- [ ] Claiming events monitored
- [ ] Team ready to respond to issues
- [ ] Backup plan if pause needed

## Notes
- **Network**: BSC Mainnet (Chain ID: 56)
- **Block Explorer**: https://bscscan.com
- **Typical Gas Price**: 3-5 gwei
- **Support**: Keep this checklist with deployment logs

---

## Emergency Contacts
- Owner wallet holder: _______________
- Deployer: _______________
- Technical lead: _______________
- Date of deployment: _______________
- Contract address: _______________

