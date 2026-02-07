// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SpellBlockGame} from "../src/SpellBlockGame.sol";
import {SpellEngine} from "../src/SpellEngine.sol";
import {SpellRegistry} from "../src/SpellRegistry.sol";
import {DictionaryVerifier} from "../src/DictionaryVerifier.sol";
import {StakerRewardDistributor} from "../src/StakerRewardDistributor.sol";

contract DeployScript is Script {
    function run() external {
        // Get deployer's address from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance);

        // Configuration - using CLAWDIA token on Base
        // For testnet, we'll deploy a mock token or use existing test token
        address clawdiaToken = vm.envOr("CLAWDIA_TOKEN", address(0));
        address operator = vm.envOr("OPERATOR", deployer);
        address owner = vm.envOr("OWNER", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy DictionaryVerifier
        DictionaryVerifier dictVerifier = new DictionaryVerifier();
        console2.log("DictionaryVerifier deployed at:", address(dictVerifier));

        // 2. Deploy SpellEngine
        SpellEngine spellEngine = new SpellEngine();
        console2.log("SpellEngine deployed at:", address(spellEngine));

        // 3. Deploy SpellRegistry
        SpellRegistry spellRegistry = new SpellRegistry();
        console2.log("SpellRegistry deployed at:", address(spellRegistry));

        // 4. Deploy SpellBlockGame
        // If no CLAWDIA token provided, we'll need to deploy a mock for testing
        require(clawdiaToken != address(0), "CLAWDIA_TOKEN env required");
        
        SpellBlockGame game = new SpellBlockGame(
            clawdiaToken,
            operator,
            owner,
            address(spellEngine),
            address(dictVerifier),
            address(0), // Placeholder for staker distributor
            address(spellRegistry)
        );
        console2.log("SpellBlockGame deployed at:", address(game));
        
        // Now deploy StakerRewardDistributor with game address
        StakerRewardDistributor stakerDistributor = new StakerRewardDistributor(
            clawdiaToken,
            address(game)
        );
        console2.log("StakerRewardDistributor deployed at:", address(stakerDistributor));
        
        // Update game to point to distributor (if there's a setter)
        // For now, we'll need to manually set this or redesign to avoid circular dependency
        console2.log("SpellBlockGame deployed at:", address(game));

        // 5. Configure relationships
        game.setSpellEngine(address(spellEngine));
        game.setDictionaryVerifier(address(dictVerifier));
        game.setStakerDistributor(address(stakerDistributor));

        console2.log("Configuration complete!");
        console2.log("");
        console2.log("=== Deployment Summary ===");
        console2.log("DictionaryVerifier:", address(dictVerifier));
        console2.log("SpellEngine:", address(spellEngine));
        console2.log("SpellBlockGame:", address(game));
        console2.log("StakerRewardDistributor:", address(stakerDistributor));
        console2.log("==========================");

        vm.stopBroadcast();
    }
}
