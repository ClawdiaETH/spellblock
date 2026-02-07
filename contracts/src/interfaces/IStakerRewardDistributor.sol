// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStakerRewardDistributor {
    function notifyReward(uint256 roundId, uint256 amount) external;
}
