// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.17;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IMerkleDistributor} from "./interfaces/IMerkleDistributor.sol";

error AlreadyClaimed();
error InvalidProof();

contract MerkleDistributor is IMerkleDistributor, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    address public immutable override token;
    bytes32 public immutable override merkleRoot;

    // This is a packed array of booleans.
    mapping(uint256 => uint256) private claimedBitMap;

    constructor(address token_, bytes32 merkleRoot_, address owner_) {
        token = token_;
        merkleRoot = merkleRoot_;
        _transferOwnership(owner_);
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function _validateAndClaim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
        internal
    {
        if (isClaimed(index)) revert AlreadyClaimed();

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) revert InvalidProof();

        // Mark it claimed
        _setClaimed(index);
    }

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
        public
        virtual
        override
        whenNotPaused
    {
        _validateAndClaim(index, account, amount, merkleProof);

        // Send the token
        IERC20(token).safeTransfer(account, amount);

        emit Claimed(index, account, amount);
    }

    /// @notice Claim tokens that were redeemed from FixedTermYield via redeemToAndCall
    /// @dev This function is designed to be called by FixedTermYield's redeemToAndCall
    /// @dev The redeemed tokens are already in this contract when this function is called
    /// @param index Merkle tree index
    /// @param account Address that is claiming
    /// @param amount Amount being claimed (for merkle verification)
    /// @param merkleProof Merkle proof
    /// @param redeemTokenAddress Address of the token that was redeemed and sent to this contract
    function claimFromRedemption(
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof,
        address redeemTokenAddress
    ) external whenNotPaused {
        _validateAndClaim(index, account, amount, merkleProof);

        // Get the entire balance of redeemed tokens (already sent by FixedTermYield)
        uint256 balanceToTransfer = IERC20(redeemTokenAddress).balanceOf(address(this));
        
        // Transfer all redeemed tokens to the account
        IERC20(redeemTokenAddress).safeTransfer(account, balanceToTransfer);

        emit Claimed(index, account, balanceToTransfer);
    }

    /// @notice Pause all claiming functions
    /// @dev Only callable by the owner
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause all claiming functions
    /// @dev Only callable by the owner
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Rescue any ERC20 tokens stuck in the contract
    /// @dev Only callable by the owner
    /// @param tokenAddress Address of the token to rescue
    /// @param to Address to send the rescued tokens to
    /// @param amount Amount of tokens to rescue
    function rescueTokens(address tokenAddress, address to, uint256 amount) external onlyOwner {
        IERC20(tokenAddress).safeTransfer(to, amount);
    }
}
