// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISpellEngine {
    function validate(
        uint8 spellId,
        bytes32 spellParam,
        string calldata word,
        bytes32[] calldata categoryProof
    ) external view returns (bool passes);
}
