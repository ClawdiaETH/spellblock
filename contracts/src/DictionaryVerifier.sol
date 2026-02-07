// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IDictionaryVerifier} from "./interfaces/IDictionaryVerifier.sol";

/// @title DictionaryVerifier
/// @notice Verifies dictionary and category membership via Merkle proofs
contract DictionaryVerifier is IDictionaryVerifier {

    bytes32 public dictionaryRoot;
    mapping(bytes32 => bytes32) public categoryRoots;
    address public owner;

    event DictionaryRootUpdated(bytes32 newRoot);
    event CategoryRootUpdated(bytes32 indexed categoryHash, bytes32 newRoot);

    constructor() {
        owner = msg.sender;
    }

    function verifyWord(
        bytes32[] calldata proof,
        string calldata word
    ) external view override returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_normalize(word)));
        return MerkleProof.verify(proof, dictionaryRoot, leaf);
    }

    function verifyCategoryMembership(
        bytes32[] calldata proof,
        bytes32 categoryHash,
        string calldata word
    ) external view override returns (bool) {
        bytes32 root = categoryRoots[categoryHash];
        require(root != bytes32(0), "Category not registered");
        bytes32 leaf = keccak256(abi.encodePacked(_normalize(word)));
        return MerkleProof.verify(proof, root, leaf);
    }

    function setDictionaryRoot(bytes32 _root) external {
        require(msg.sender == owner, "Only owner");
        dictionaryRoot = _root;
        emit DictionaryRootUpdated(_root);
    }

    function setCategoryRoot(bytes32 categoryHash, bytes32 _root) external {
        require(msg.sender == owner, "Only owner");
        categoryRoots[categoryHash] = _root;
        emit CategoryRootUpdated(categoryHash, _root);
    }

    function _normalize(string calldata word) internal pure returns (string memory) {
        bytes memory w = bytes(word);
        bytes memory result = new bytes(w.length);
        for (uint i = 0; i < w.length; i++) {
            if (w[i] >= 0x41 && w[i] <= 0x5A) {
                result[i] = bytes1(uint8(w[i]) + 32);
            } else {
                result[i] = w[i];
            }
        }
        return string(result);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        owner = newOwner;
    }
}
