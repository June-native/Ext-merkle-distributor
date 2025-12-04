import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, constants, Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'
import BalanceTree from '../src/balance-tree'
import { parseBalanceMap } from '../src/parse-balance-map'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999,
}
const gasUsed = {
  MerkleDistributor: {
    twoAccountTree: 84112,
    largerTreeFirstClaim: 87463,
    largerTreeSecondClaim: 70363,
    realisticTreeGas: 97468,
    realisticTreeGasDeeperNode: 97440,
    realisticTreeGasAverageRandom: 80850,
    realisticTreeGasAverageFirst25: 64584,
  },
  MerkleDistributorWithDeadline: {
    twoAccountTree: 84186,
    largerTreeFirstClaim: 87537,
    largerTreeSecondClaim: 70437,
    realisticTreeGas: 97542,
    realisticTreeGasDeeperNode: 97514,
    realisticTreeGasAverageRandom: 80924,
    realisticTreeGasAverageFirst25: 64658,
  },
}

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

const deployContract = async (factory: ContractFactory, tokenAddress: string, merkleRoot: string, contract: string, owner?: string) => {
  let distributor
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const wallets = await ethers.getSigners()
  const ownerAddress = owner || wallets[0].address
  if (contract === 'MerkleDistributorWithDeadline') {
    distributor = await factory.deploy(tokenAddress, merkleRoot, currentTimestamp + 31536000, ownerAddress, overrides)
  } else {
    distributor = await factory.deploy(tokenAddress, merkleRoot, ownerAddress, overrides)
  }
  return distributor
}

for (const contract of ['MerkleDistributor', 'MerkleDistributorWithDeadline']) {
  describe(`${contract} tests`, () => {
    let token: Contract
    let distributorFactory: ContractFactory
    let wallet0: SignerWithAddress
    let wallet1: SignerWithAddress
    let wallets: SignerWithAddress[]

    beforeEach(async () => {
      wallets = await ethers.getSigners()
      wallet0 = wallets[0]
      wallet1 = wallets[1]
      const tokenFactory = await ethers.getContractFactory('TestERC20', wallet0)
      token = await tokenFactory.deploy('Token', 'TKN', 0, overrides)
      distributorFactory = await ethers.getContractFactory(contract, wallet0)
    })

    describe('#token', () => {
      it('returns the token address', async () => {
        const distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32, contract)
        expect(await distributor.token()).to.eq(token.address)
      })
    })

    describe('#merkleRoot', () => {
      it('returns the zero merkle root', async () => {
        const distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32, contract)
        expect(await distributor.merkleRoot()).to.eq(ZERO_BYTES32)
      })
    })

    describe('#claim', () => {
      it('fails for empty proof', async () => {
        const distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32, contract)
        await expect(distributor.claim(0, wallet0.address, 10, [])).to.be.revertedWith('InvalidProof')
      })

      it('fails for invalid index', async () => {
        const distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32, contract)
        await expect(distributor.claim(0, wallet0.address, 10, [])).to.be.revertedWith('InvalidProof')
      })

      describe('two account tree', () => {
        let distributor: Contract
        let tree: BalanceTree
        beforeEach('deploy', async () => {
          tree = new BalanceTree([
            { account: wallet0.address, amount: BigNumber.from(100) },
            { account: wallet1.address, amount: BigNumber.from(101) },
          ])
          distributor = await deployContract(distributorFactory, token.address, tree.getHexRoot(), contract)
          await token.setBalance(distributor.address, 201)
        })

        it('successful claim', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
            .to.emit(distributor, 'Claimed')
            .withArgs(0, wallet0.address, 100)
          const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
          await expect(distributor.claim(1, wallet1.address, 101, proof1, overrides))
            .to.emit(distributor, 'Claimed')
            .withArgs(1, wallet1.address, 101)
        })

        it('transfers the token', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          expect(await token.balanceOf(wallet0.address)).to.eq(0)
          await distributor.claim(0, wallet0.address, 100, proof0, overrides)
          expect(await token.balanceOf(wallet0.address)).to.eq(100)
        })

        it('must have enough to transfer', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await token.setBalance(distributor.address, 99)
          await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides)).to.be.revertedWith(
            'ERC20: transfer amount exceeds balance'
          )
        })

        it('sets #isClaimed', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          expect(await distributor.isClaimed(0)).to.eq(false)
          expect(await distributor.isClaimed(1)).to.eq(false)
          await distributor.claim(0, wallet0.address, 100, proof0, overrides)
          expect(await distributor.isClaimed(0)).to.eq(true)
          expect(await distributor.isClaimed(1)).to.eq(false)
        })

        it('cannot allow two claims', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await distributor.claim(0, wallet0.address, 100, proof0, overrides)
          await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides)).to.be.revertedWith(
            'AlreadyClaimed'
          )
        })

        it('cannot claim more than once: 0 and then 1', async () => {
          await distributor.claim(
            0,
            wallet0.address,
            100,
            tree.getProof(0, wallet0.address, BigNumber.from(100)),
            overrides
          )
          await distributor.claim(
            1,
            wallet1.address,
            101,
            tree.getProof(1, wallet1.address, BigNumber.from(101)),
            overrides
          )

          await expect(
            distributor.claim(
              0,
              wallet0.address,
              100,
              tree.getProof(0, wallet0.address, BigNumber.from(100)),
              overrides
            )
          ).to.be.revertedWith('AlreadyClaimed')
        })

        it('cannot claim more than once: 1 and then 0', async () => {
          await distributor.claim(
            1,
            wallet1.address,
            101,
            tree.getProof(1, wallet1.address, BigNumber.from(101)),
            overrides
          )
          await distributor.claim(
            0,
            wallet0.address,
            100,
            tree.getProof(0, wallet0.address, BigNumber.from(100)),
            overrides
          )

          await expect(
            distributor.claim(
              1,
              wallet1.address,
              101,
              tree.getProof(1, wallet1.address, BigNumber.from(101)),
              overrides
            )
          ).to.be.revertedWith('AlreadyClaimed')
        })

        it('cannot claim for address other than proof', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.claim(1, wallet1.address, 101, proof0, overrides)).to.be.revertedWith(
            'InvalidProof'
          )
        })

        it('cannot claim more than proof', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.claim(0, wallet0.address, 101, proof0, overrides)).to.be.revertedWith(
            'InvalidProof'
          )
        })

        it('gas', async () => {
          const proof = tree.getProof(0, wallet0.address, BigNumber.from(100))
          const tx = await distributor.claim(0, wallet0.address, 100, proof, overrides)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).to.eq(gasUsed[contract as keyof typeof gasUsed].twoAccountTree)
        })
      })

      describe('larger tree', () => {
        let distributor: Contract
        let tree: BalanceTree
        beforeEach('deploy', async () => {
          tree = new BalanceTree(
            wallets.map((wallet, ix) => {
              return { account: wallet.address, amount: BigNumber.from(ix + 1) }
            })
          )
          distributor = await deployContract(distributorFactory, token.address, tree.getHexRoot(), contract)
          await token.setBalance(distributor.address, 201)
        })

        it('claim index 4', async () => {
          const proof = tree.getProof(4, wallets[4].address, BigNumber.from(5))
          await expect(distributor.claim(4, wallets[4].address, 5, proof, overrides))
            .to.emit(distributor, 'Claimed')
            .withArgs(4, wallets[4].address, 5)
        })

        it('claim index 9', async () => {
          const proof = tree.getProof(9, wallets[9].address, BigNumber.from(10))
          await expect(distributor.claim(9, wallets[9].address, 10, proof, overrides))
            .to.emit(distributor, 'Claimed')
            .withArgs(9, wallets[9].address, 10)
        })

        it('gas', async () => {
          const proof = tree.getProof(9, wallets[9].address, BigNumber.from(10))
          const tx = await distributor.claim(9, wallets[9].address, 10, proof, overrides)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).to.eq(gasUsed[contract as keyof typeof gasUsed].largerTreeFirstClaim)
        })

        it('gas second down about 15k', async () => {
          await distributor.claim(
            0,
            wallets[0].address,
            1,
            tree.getProof(0, wallets[0].address, BigNumber.from(1)),
            overrides
          )
          const tx = await distributor.claim(
            1,
            wallets[1].address,
            2,
            tree.getProof(1, wallets[1].address, BigNumber.from(2)),
            overrides
          )
          const receipt = await tx.wait()
          expect(receipt.gasUsed).to.eq(gasUsed[contract as keyof typeof gasUsed].largerTreeSecondClaim)
        })
      })

      describe('realistic size tree', () => {
        let distributor: Contract
        let tree: BalanceTree
        const NUM_LEAVES = 100_000
        const NUM_SAMPLES = 25

        beforeEach('deploy', async () => {
          const elements: { account: string; amount: BigNumber }[] = []
          for (let i = 0; i < NUM_LEAVES; i++) {
            const node = { account: wallet0.address, amount: BigNumber.from(100) }
            elements.push(node)
          }
          tree = new BalanceTree(elements)
          distributor = await deployContract(distributorFactory, token.address, tree.getHexRoot(), contract)
          await token.setBalance(distributor.address, constants.MaxUint256)
        })

        it('proof verification works', () => {
          const root = Buffer.from(tree.getHexRoot().slice(2), 'hex')
          for (let i = 0; i < NUM_LEAVES; i += NUM_LEAVES / NUM_SAMPLES) {
            const proof = tree
              .getProof(i, wallet0.address, BigNumber.from(100))
              .map((el) => Buffer.from(el.slice(2), 'hex'))
            const validProof = BalanceTree.verifyProof(i, wallet0.address, BigNumber.from(100), proof, root)
            expect(validProof).to.be.true
          }
        })

        it('gas', async () => {
          const proof = tree.getProof(50000, wallet0.address, BigNumber.from(100))
          const tx = await distributor.claim(50000, wallet0.address, 100, proof, overrides)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).to.eq(gasUsed[contract as keyof typeof gasUsed].realisticTreeGas)
        })
        it('gas deeper node', async () => {
          const proof = tree.getProof(90000, wallet0.address, BigNumber.from(100))
          const tx = await distributor.claim(90000, wallet0.address, 100, proof, overrides)
          const receipt = await tx.wait()
          expect(receipt.gasUsed).to.eq(gasUsed[contract as keyof typeof gasUsed].realisticTreeGasDeeperNode)
        })
        it('gas average random distribution', async () => {
          let total: BigNumber = BigNumber.from(0)
          let count: number = 0
          for (let i = 0; i < NUM_LEAVES; i += NUM_LEAVES / NUM_SAMPLES) {
            const proof = tree.getProof(i, wallet0.address, BigNumber.from(100))
            const tx = await distributor.claim(i, wallet0.address, 100, proof, overrides)
            const receipt = await tx.wait()
            total = total.add(receipt.gasUsed)
            count++
          }
          const average = total.div(count)
          expect(average).to.eq(gasUsed[contract as keyof typeof gasUsed].realisticTreeGasAverageRandom)
        })
        // this is what we gas golfed by packing the bitmap
        it('gas average first 25', async () => {
          let total: BigNumber = BigNumber.from(0)
          let count: number = 0
          for (let i = 0; i < 25; i++) {
            const proof = tree.getProof(i, wallet0.address, BigNumber.from(100))
            const tx = await distributor.claim(i, wallet0.address, 100, proof, overrides)
            const receipt = await tx.wait()
            total = total.add(receipt.gasUsed)
            count++
          }
          const average = total.div(count)
          expect(average).to.eq(gasUsed[contract as keyof typeof gasUsed].realisticTreeGasAverageFirst25)
        })

        it('no double claims in random distribution', async () => {
          for (let i = 0; i < 25; i += Math.floor(Math.random() * (NUM_LEAVES / NUM_SAMPLES))) {
            const proof = tree.getProof(i, wallet0.address, BigNumber.from(100))
            await distributor.claim(i, wallet0.address, 100, proof, overrides)
            await expect(distributor.claim(i, wallet0.address, 100, proof, overrides)).to.be.revertedWith(
              'AlreadyClaimed'
            )
          }
        })
      })

      describe('parseBalanceMap', () => {
        let distributor: Contract
        let claims: {
          [account: string]: {
            index: number
            amount: string
            proof: string[]
          }
        }
        beforeEach('deploy', async () => {
          const { claims: innerClaims, merkleRoot, tokenTotal } = parseBalanceMap({
            [wallet0.address]: 200,
            [wallet1.address]: 300,
            [wallets[2].address]: 250,
          })
          expect(tokenTotal).to.eq('0x02ee') // 750
          claims = innerClaims
          distributor = await deployContract(distributorFactory, token.address, merkleRoot, contract)
          await token.setBalance(distributor.address, tokenTotal)
        })

        it('check the proofs is as expected', () => {
          expect(claims).to.deep.eq({
            [wallet0.address]: {
              index: 2,
              amount: '0xc8',
              proof: [
                '0x0782528e118c4350a2465fbeabec5e72fff06991a29f21c08d37a0d275e38ddd',
                '0xf3c5acb53398e1d11dcaa74e37acc33d228f5da944fbdea9a918684074a21cdb',
              ],
            },
            [wallet1.address]: {
              index: 1,
              amount: '0x012c',
              proof: [
                '0xc86fd316fa3e7b83c2665b5ccb63771e78abcc0429e0105c91dde37cb9b857a4',
                '0xf3c5acb53398e1d11dcaa74e37acc33d228f5da944fbdea9a918684074a21cdb',
              ],
            },
            [wallets[2].address]: {
              index: 0,
              amount: '0xfa',
              proof: ['0x0c9bcaca2a1013557ef7f348b514ab8a8cd6c7051b69e46b1681a2aff22f4a88'],
            },
          })
        })

        it('all claims work exactly once', async () => {
          for (let account in claims) {
            const claim = claims[account]
            await expect(distributor.claim(claim.index, account, claim.amount, claim.proof, overrides))
              .to.emit(distributor, 'Claimed')
              .withArgs(claim.index, account, claim.amount)
            await expect(
              distributor.claim(claim.index, account, claim.amount, claim.proof, overrides)
            ).to.be.revertedWith('AlreadyClaimed')
          }
          expect(await token.balanceOf(distributor.address)).to.eq(0)
        })
      })
    })
  })
}

describe('#MerkleDistributorWithDeadline', () => {
  let token: Contract
  let wallet0: SignerWithAddress
  let wallet1: SignerWithAddress
  let wallets: SignerWithAddress[]
  let distributor: Contract
  let tree: BalanceTree
  let currentTimestamp = Math.floor(Date.now() / 1000)

  beforeEach('deploy', async () => {
    wallets = await ethers.getSigners()
    wallet0 = wallets[0]
    wallet1 = wallets[1]
    const tokenFactory = await ethers.getContractFactory('TestERC20', wallet0)
    token = await tokenFactory.deploy('Token', 'TKN', 0, overrides)
    tree = new BalanceTree([
      { account: wallet0.address, amount: BigNumber.from(100) },
      { account: wallet1.address, amount: BigNumber.from(101) },
    ])
    const merkleDistributorWithDeadlineFactory = await ethers.getContractFactory(
      'MerkleDistributorWithDeadline',
      wallet0
    )
    // Set the endTime to be 1 year after currentTimestamp
    distributor = await merkleDistributorWithDeadlineFactory.deploy(
      token.address,
      tree.getHexRoot(),
      currentTimestamp + 31536000,
      wallet0.address,
      overrides
    )
    await token.setBalance(distributor.address, 201)
  })

  it('successful claim', async () => {
    const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
    await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
      .to.emit(distributor, 'Claimed')
      .withArgs(0, wallet0.address, 100)
  })

  it('only owner can withdraw', async () => {
    distributor = distributor.connect(wallet1)
    await expect(distributor.withdraw(overrides)).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('cannot withdraw during claim window', async () => {
    await expect(distributor.withdraw(overrides)).to.be.revertedWith('NoWithdrawDuringClaim')
  })

  it('cannot claim after end time', async () => {
    const oneSecondAfterEndTime = currentTimestamp + 31536001
    await ethers.provider.send('evm_mine', [oneSecondAfterEndTime])
    currentTimestamp = oneSecondAfterEndTime
    const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
    await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides)).to.be.revertedWith(
      'ClaimWindowFinished'
    )
  })

  it('can withdraw after end time', async () => {
    const oneSecondAfterEndTime = currentTimestamp + 31536001
    await ethers.provider.send('evm_mine', [oneSecondAfterEndTime])
    currentTimestamp = oneSecondAfterEndTime
    expect(await token.balanceOf(wallet0.address)).to.eq(0)
    await distributor.withdraw(overrides)
    expect(await token.balanceOf(wallet0.address)).to.eq(201)
  })

  it('only owner can withdraw even after end time', async () => {
    const oneSecondAfterEndTime = currentTimestamp + 31536001
    await ethers.provider.send('evm_mine', [oneSecondAfterEndTime])
    distributor = distributor.connect(wallet1)
    await expect(distributor.withdraw(overrides)).to.be.revertedWith('Ownable: caller is not the owner')
  })
})

describe('MerkleDistributor - New Features', () => {
  let token: Contract
  let redeemToken: Contract
  let distributor: Contract
  let wallet0: SignerWithAddress
  let wallet1: SignerWithAddress
  let wallet2: SignerWithAddress
  let tree: BalanceTree

  beforeEach('deploy', async () => {
    const wallets = await ethers.getSigners()
    wallet0 = wallets[0]
    wallet1 = wallets[1]
    wallet2 = wallets[2]

    const tokenFactory = await ethers.getContractFactory('TestERC20', wallet0)
    token = await tokenFactory.deploy('Token', 'TKN', 0, overrides)
    redeemToken = await tokenFactory.deploy('Redeem Token', 'RTKN', 0, overrides)

    tree = new BalanceTree([
      { account: wallet0.address, amount: BigNumber.from(100) },
      { account: wallet1.address, amount: BigNumber.from(101) },
    ])

    const distributorFactory = await ethers.getContractFactory('MerkleDistributor', wallet0)
    distributor = await distributorFactory.deploy(token.address, tree.getHexRoot(), wallet0.address, overrides)
    await token.setBalance(distributor.address, 201)
  })

  describe('Pausable functionality', () => {
    it('should allow claiming when not paused', async () => {
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
        .to.emit(distributor, 'Claimed')
        .withArgs(0, wallet0.address, 100)
    })

    it('should not allow non-owner to pause', async () => {
      await expect(distributor.connect(wallet1).pause(overrides)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('should allow owner to pause', async () => {
      await expect(distributor.pause(overrides)).to.emit(distributor, 'Paused').withArgs(wallet0.address)
    })

    it('should not allow claiming when paused', async () => {
      await distributor.pause(overrides)
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides)).to.be.revertedWith(
        'Pausable: paused'
      )
    })

    it('should allow owner to unpause', async () => {
      await distributor.pause(overrides)
      await expect(distributor.unpause(overrides)).to.emit(distributor, 'Unpaused').withArgs(wallet0.address)
    })

    it('should not allow non-owner to unpause', async () => {
      await distributor.pause(overrides)
      await expect(distributor.connect(wallet1).unpause(overrides)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('should allow claiming after unpause', async () => {
      await distributor.pause(overrides)
      await distributor.unpause(overrides)
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
        .to.emit(distributor, 'Claimed')
        .withArgs(0, wallet0.address, 100)
    })

    it('should not allow claimFromRedemption when paused', async () => {
      await distributor.pause(overrides)
      await redeemToken.setBalance(distributor.address, 100)
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await expect(
        distributor.claimFromRedemption(0, wallet0.address, 100, proof0, redeemToken.address, overrides)
      ).to.be.revertedWith('Pausable: paused')
    })
  })

  describe('Ownership transfer (2-step)', () => {
    it('should have wallet0 as initial owner', async () => {
      expect(await distributor.owner()).to.eq(wallet0.address)
    })

    it('should not allow non-owner to transfer ownership', async () => {
      await expect(distributor.connect(wallet1).transferOwnership(wallet2.address, overrides)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('should allow owner to initiate ownership transfer', async () => {
      await expect(distributor.transferOwnership(wallet1.address, overrides))
        .to.emit(distributor, 'OwnershipTransferStarted')
        .withArgs(wallet0.address, wallet1.address)
      expect(await distributor.owner()).to.eq(wallet0.address)
      expect(await distributor.pendingOwner()).to.eq(wallet1.address)
    })

    it('should not transfer ownership until new owner accepts', async () => {
      await distributor.transferOwnership(wallet1.address, overrides)
      expect(await distributor.owner()).to.eq(wallet0.address)
      await expect(distributor.pause(overrides)).to.emit(distributor, 'Paused')
    })

    it('should not allow non-pending-owner to accept ownership', async () => {
      await distributor.transferOwnership(wallet1.address, overrides)
      await expect(distributor.connect(wallet2).acceptOwnership(overrides)).to.be.revertedWith(
        'Ownable2Step: caller is not the new owner'
      )
    })

    it('should complete ownership transfer when pending owner accepts', async () => {
      await distributor.transferOwnership(wallet1.address, overrides)
      await expect(distributor.connect(wallet1).acceptOwnership(overrides))
        .to.emit(distributor, 'OwnershipTransferred')
        .withArgs(wallet0.address, wallet1.address)
      expect(await distributor.owner()).to.eq(wallet1.address)
      expect(await distributor.pendingOwner()).to.eq(constants.AddressZero)
    })

    it('should allow new owner to use owner functions after transfer', async () => {
      await distributor.transferOwnership(wallet1.address, overrides)
      await distributor.connect(wallet1).acceptOwnership(overrides)
      await expect(distributor.connect(wallet1).pause(overrides)).to.emit(distributor, 'Paused')
    })

    it('should not allow old owner to use owner functions after transfer', async () => {
      await distributor.transferOwnership(wallet1.address, overrides)
      await distributor.connect(wallet1).acceptOwnership(overrides)
      await expect(distributor.pause(overrides)).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('Token rescue', () => {
    let rescueToken: Contract

    beforeEach('setup rescue token', async () => {
      const tokenFactory = await ethers.getContractFactory('TestERC20', wallet0)
      rescueToken = await tokenFactory.deploy('Rescue Token', 'RSC', 0, overrides)
      await rescueToken.setBalance(distributor.address, 1000)
    })

    it('should not allow non-owner to rescue tokens', async () => {
      await expect(
        distributor.connect(wallet1).rescueTokens(rescueToken.address, wallet1.address, 500, overrides)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should allow owner to rescue tokens', async () => {
      expect(await rescueToken.balanceOf(wallet1.address)).to.eq(0)
      await distributor.rescueTokens(rescueToken.address, wallet1.address, 500, overrides)
      expect(await rescueToken.balanceOf(wallet1.address)).to.eq(500)
      expect(await rescueToken.balanceOf(distributor.address)).to.eq(500)
    })

    it('should allow owner to rescue all tokens', async () => {
      await distributor.rescueTokens(rescueToken.address, wallet1.address, 1000, overrides)
      expect(await rescueToken.balanceOf(wallet1.address)).to.eq(1000)
      expect(await rescueToken.balanceOf(distributor.address)).to.eq(0)
    })

    it('should allow owner to rescue distribution token', async () => {
      expect(await token.balanceOf(wallet2.address)).to.eq(0)
      await distributor.rescueTokens(token.address, wallet2.address, 100, overrides)
      expect(await token.balanceOf(wallet2.address)).to.eq(100)
      expect(await token.balanceOf(distributor.address)).to.eq(101)
    })

    it('should revert if trying to rescue more tokens than available', async () => {
      await expect(
        distributor.rescueTokens(rescueToken.address, wallet1.address, 1001, overrides)
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
    })

    it('should allow rescue even when contract is paused', async () => {
      await distributor.pause(overrides)
      await distributor.rescueTokens(rescueToken.address, wallet1.address, 500, overrides)
      expect(await rescueToken.balanceOf(wallet1.address)).to.eq(500)
    })
  })

  describe('claimFromRedemption', () => {
    beforeEach('setup redeem token', async () => {
      await redeemToken.setBalance(distributor.address, 500)
    })

    it('should successfully claim from redemption', async () => {
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      expect(await redeemToken.balanceOf(wallet0.address)).to.eq(0)
      await expect(
        distributor.claimFromRedemption(0, wallet0.address, 100, proof0, redeemToken.address, overrides)
      )
        .to.emit(distributor, 'Claimed')
        .withArgs(0, wallet0.address, 500)
      expect(await redeemToken.balanceOf(wallet0.address)).to.eq(500)
      expect(await redeemToken.balanceOf(distributor.address)).to.eq(0)
    })

    it('should transfer entire balance of redeem token', async () => {
      await redeemToken.setBalance(distributor.address, 1234)
      const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
      await distributor.claimFromRedemption(1, wallet1.address, 101, proof1, redeemToken.address, overrides)
      expect(await redeemToken.balanceOf(wallet1.address)).to.eq(1234)
      expect(await redeemToken.balanceOf(distributor.address)).to.eq(0)
    })

    it('should fail if already claimed', async () => {
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await distributor.claimFromRedemption(0, wallet0.address, 100, proof0, redeemToken.address, overrides)
      await expect(
        distributor.claimFromRedemption(0, wallet0.address, 100, proof0, redeemToken.address, overrides)
      ).to.be.revertedWith('AlreadyClaimed')
    })

    it('should fail with invalid proof', async () => {
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await expect(
        distributor.claimFromRedemption(1, wallet1.address, 101, proof0, redeemToken.address, overrides)
      ).to.be.revertedWith('InvalidProof')
    })

    it('should not allow claimFromRedemption with regular claim proof for different amount', async () => {
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await expect(
        distributor.claimFromRedemption(0, wallet0.address, 101, proof0, redeemToken.address, overrides)
      ).to.be.revertedWith('InvalidProof')
    })

    it('should mark index as claimed for both claim types', async () => {
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await distributor.claimFromRedemption(0, wallet0.address, 100, proof0, redeemToken.address, overrides)
      expect(await distributor.isClaimed(0)).to.eq(true)
      await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides)).to.be.revertedWith(
        'AlreadyClaimed'
      )
    })

    it('should not allow claimFromRedemption if already claimed via regular claim', async () => {
      const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
      await distributor.claim(1, wallet1.address, 101, proof1, overrides)
      await expect(
        distributor.claimFromRedemption(1, wallet1.address, 101, proof1, redeemToken.address, overrides)
      ).to.be.revertedWith('AlreadyClaimed')
    })
  })
})
