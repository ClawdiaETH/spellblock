// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDictionaryVerifier {
    function verifyWord(bytes32[] calldata proof, string calldata word) external view returns (bool);
    function verifyCategoryMembership(bytes32[] calldata proof, bytes32 categoryHash, string calldata word) external view returns (bool);
}
