// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IStakerRewardDistributor} from "./interfaces/IStakerRewardDistributor.sol";

/// @title StakerRewardDistributor
/// @notice Distributes per-round staker rewards from SpellBlock
contract StakerRewardDistributor is IStakerRewardDistributor, ReentrancyGuard {

    IERC20 public immutable clawdiaToken;
    address public immutable gameContract;

    struct RoundReward {
        uint256 totalReward;
        uint256 totalStakedAtSnapshot;
        uint256 claimed;
    }

    mapping(uint256 => RoundReward) public roundRewards;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // Staking state
    mapping(address => uint256) public stakedBalance;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardNotified(uint256 indexed roundId, uint256 amount, uint256 totalStakedSnapshot);
    event RewardClaimed(uint256 indexed roundId, address indexed user, uint256 amount);

    constructor(address _token, address _game) {
        clawdiaToken = IERC20(_token);
        gameContract = _game;
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        clawdiaToken.transferFrom(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(stakedBalance[msg.sender] >= amount, "Insufficient balance");
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        clawdiaToken.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function notifyReward(uint256 roundId, uint256 amount) external override {
        require(msg.sender == gameContract, "Only game contract");
        require(roundRewards[roundId].totalReward == 0, "Already notified");

        roundRewards[roundId] = RoundReward({
            totalReward: amount,
            totalStakedAtSnapshot: totalStaked,
            claimed: 0
        });

        emit RewardNotified(roundId, amount, totalStaked);
    }

    function claimRoundReward(uint256 roundId) external nonReentrant {
        require(!hasClaimed[roundId][msg.sender], "Already claimed");
        RoundReward storage rr = roundRewards[roundId];
        require(rr.totalReward > 0, "No reward for round");
        require(rr.totalStakedAtSnapshot > 0, "No stakers");

        uint256 userShare = (rr.totalReward * stakedBalance[msg.sender]) / rr.totalStakedAtSnapshot;
        require(userShare > 0, "No reward");

        hasClaimed[roundId][msg.sender] = true;
        rr.claimed += userShare;
        clawdiaToken.transfer(msg.sender, userShare);

        emit RewardClaimed(roundId, msg.sender, userShare);
    }

    function claimMultipleRewards(uint256[] calldata roundIds) external nonReentrant {
        uint256 totalClaim = 0;

        for (uint256 i = 0; i < roundIds.length; i++) {
            uint256 roundId = roundIds[i];
            if (hasClaimed[roundId][msg.sender]) continue;

            RoundReward storage rr = roundRewards[roundId];
            if (rr.totalReward == 0 || rr.totalStakedAtSnapshot == 0) continue;

            uint256 userShare = (rr.totalReward * stakedBalance[msg.sender]) / rr.totalStakedAtSnapshot;
            if (userShare == 0) continue;

            hasClaimed[roundId][msg.sender] = true;
            rr.claimed += userShare;
            totalClaim += userShare;

            emit RewardClaimed(roundId, msg.sender, userShare);
        }

        require(totalClaim > 0, "Nothing to claim");
        clawdiaToken.transfer(msg.sender, totalClaim);
    }

    function getPendingReward(uint256 roundId, address user) external view returns (uint256) {
        if (hasClaimed[roundId][user]) return 0;
        RoundReward storage rr = roundRewards[roundId];
        if (rr.totalReward == 0 || rr.totalStakedAtSnapshot == 0) return 0;
        return (rr.totalReward * stakedBalance[user]) / rr.totalStakedAtSnapshot;
    }
}
