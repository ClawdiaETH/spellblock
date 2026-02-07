// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SpellBlockGame} from "../src/SpellBlockGame.sol";
import {SpellEngine} from "../src/SpellEngine.sol";
import {SpellRegistry} from "../src/SpellRegistry.sol";
import {DictionaryVerifier} from "../src/DictionaryVerifier.sol";
import {StakerRewardDistributor} from "../src/StakerRewardDistributor.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Simple mock CLAWDIA token for testnet
contract MockCLAWDIA is ERC20 {
    constructor() ERC20("CLAWDIA Test", "tCLAWDIA") {
        _mint(msg.sender, 1_000_000_000 * 10**18); // 1 billion tokens
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DeployWithMockTokenScript is Script {
    function run() external {
        // Get deployer's address from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance);

        address operator = vm.envOr("OPERATOR", deployer);
        address owner = vm.envOr("OWNER", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock CLAWDIA Token
        MockCLAWDIA token = new MockCLAWDIA();
        console2.log("MockCLAWDIA deployed at:", address(token));

        // 2. Deploy DictionaryVerifier
        DictionaryVerifier dictVerifier = new DictionaryVerifier();
        console2.log("DictionaryVerifier deployed at:", address(dictVerifier));

        // 3. Deploy SpellEngine
        SpellEngine spellEngine = new SpellEngine();
        console2.log("SpellEngine deployed at:", address(spellEngine));

        // 4. Deploy SpellRegistry
        SpellRegistry spellRegistry = new SpellRegistry();
        console2.log("SpellRegistry deployed at:", address(spellRegistry));

        // 5. Deploy SpellBlockGame
        SpellBlockGame game = new SpellBlockGame(
            address(token),
            operator,
            owner,
            address(spellEngine),
            address(dictVerifier),
            address(0), // Placeholder for staker distributor
            address(spellRegistry)
        );
        console2.log("SpellBlockGame deployed at:", address(game));
        
        // 6. Deploy StakerRewardDistributor
        StakerRewardDistributor stakerDistributor = new StakerRewardDistributor(
            address(token),
            address(game)
        );
        console2.log("SpellBlockGame deployed at:", address(game));

        // 6. Configure relationships
        game.setSpellEngine(address(spellEngine));
        game.setDictionaryVerifier(address(dictVerifier));
        game.setStakerDistributor(address(stakerDistributor));

        console2.log("");
        console2.log("=== Deployment Summary (Testnet) ===");
        console2.log("MockCLAWDIA:", address(token));
        console2.log("DictionaryVerifier:", address(dictVerifier));
        console2.log("SpellEngine:", address(spellEngine));
        console2.log("SpellBlockGame:", address(game));
        console2.log("StakerRewardDistributor:", address(stakerDistributor));
        console2.log("====================================");
        console2.log("");
        console2.log("Operator:", operator);
        console2.log("Owner:", owner);
        console2.log("Token balance of deployer:", token.balanceOf(deployer));

        vm.stopBroadcast();
    }
}
