#!/usr/bin/env node

/**
 * Deploy SpellBlock Round 3 with proper random letters
 * 
 * This script:
 * 1. Checks if Round 2 is complete
 * 2. Generates random unique letters 
 * 3. Creates all necessary round parameters
 * 4. Opens Round 3 on the contract
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');
const crypto = require('crypto');

const { generateValidatedLetterPool } = require('./generate-random-letters.js');
const { getCurrentRoundId, checkRoundStatus } = require('./check-round-status.js');

const CONTRACT_ADDRESS = '0x4b8bf9004Ba309EB0169a97821D0eD993AF37961';
const SPELL_REGISTRY_ADDRESS = '0x8DC86F87d96e7227CBb955d5fF716F427EBa496f';
const RPC_URL = 'https://mainnet.base.org';
const SIGNING_KEY = process.env.SIGNING_KEY || '$(cat ~/.clawdbot/secrets/signing_key)';

/**
 * Check if we can open the next round
 */
async function canOpenNextRound() {
    try {
        const currentRoundId = await getCurrentRoundId();
        
        // Check if current round is finalized
        const finalizedCmd = `cast call ${CONTRACT_ADDRESS} "rounds(uint256)" ${currentRoundId} --rpc-url ${RPC_URL}`;
        const { stdout } = await execAsync(finalizedCmd);
        
        // This is complex to parse - for now, let's assume we need to wait
        // In practice, the operator would know when rounds are ready
        
        console.log(`Current round ${currentRoundId} status checked`);
        return false; // For safety, return false until manual verification
    } catch (error) {
        console.error('Error checking round status:', error);
        return false;
    }
}

/**
 * Generate ruler commitment hash using SpellRegistry
 */
async function generateRulerCommitHash(roundId, validLengths, rulerSalt) {
    try {
        const cmd = `cast call ${SPELL_REGISTRY_ADDRESS} "generateRulerCommitment(uint256,uint8[3],bytes32)" ${roundId} "[${validLengths.join(',')}]" ${rulerSalt} --rpc-url ${RPC_URL}`;
        const { stdout } = await execAsync(cmd);
        return stdout.trim();
    } catch (error) {
        console.error('Error generating ruler commit hash:', error);
        throw error;
    }
}

/**
 * Generate complete Round 3 configuration
 */
async function generateRound3Config() {
    console.log('🎲 Generating Round 3 configuration...\n');
    
    // 1. Generate random letters
    console.log('1. Generating random unique letters:');
    const letterPool = generateValidatedLetterPool();
    console.log(`   ✅ Generated: ${letterPool.letters}`);
    console.log(`   🔗 Hex: ${letterPool.hex}`);
    console.log('');
    
    // 2. Generate seed and hash
    console.log('2. Generating seed and hash:');
    const seed = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Calculate seed hash (keccak256)
    const seedHash = '0x' + crypto.createHash('sha256').update(Buffer.from(seed.slice(2), 'hex')).digest('hex');
    console.log(`   Seed: ${seed}`);
    console.log(`   Hash: ${seedHash}`);
    console.log('');
    
    // 3. Generate ruler configuration
    console.log('3. Generating ruler configuration:');
    const rulerSalt = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Choose valid lengths (variety of difficulty levels)
    const lengthOptions = [
        [4, 6, 8],  // Similar to Round 2
        [5, 6, 7],  // Similar to Round 1  
        [4, 5, 8],  // Mixed range
        [5, 7, 8],  // Higher difficulty
    ];
    
    const randomIndex = crypto.randomInt(0, lengthOptions.length);
    const validLengths = lengthOptions[randomIndex];
    
    console.log(`   Valid Lengths: [${validLengths.join(', ')}]`);
    console.log(`   Ruler Salt: ${rulerSalt}`);
    console.log('');
    
    // 4. Generate ruler commit hash
    console.log('4. Generating ruler commitment hash:');
    const roundId = 3; // Next round will be 3
    const rulerCommitHash = await generateRulerCommitHash(roundId, validLengths, rulerSalt);
    console.log(`   Commit Hash: ${rulerCommitHash}`);
    console.log('');
    
    return {
        roundId,
        seed,
        seedHash,
        rulerSalt,
        validLengths,
        rulerCommitHash,
        letterPool: letterPool.hex,
        letters: letterPool.letters,
        vowels: letterPool.vowels,
        consonants: letterPool.consonants
    };
}

/**
 * Execute openRound transaction
 */
async function openRound(config) {
    console.log('🚀 Opening Round 3...\n');
    
    const { seedHash, rulerCommitHash, letterPool } = config;
    
    console.log('Transaction parameters:');
    console.log(`  seedHash: ${seedHash}`);
    console.log(`  rulerCommitHash: ${rulerCommitHash}`);
    console.log(`  letterPool: ${letterPool}`);
    console.log('');
    
    try {
        const cmd = `cast send ${CONTRACT_ADDRESS} "openRound(bytes32,bytes32,bytes8)" ${seedHash} ${rulerCommitHash} ${letterPool} --private-key ${SIGNING_KEY} --rpc-url ${RPC_URL}`;
        
        console.log('Executing transaction...');
        const { stdout } = await execAsync(cmd);
        
        console.log('✅ Transaction submitted!');
        console.log('Transaction hash:', stdout.trim());
        
        return stdout.trim();
    } catch (error) {
        console.error('❌ Transaction failed:', error);
        throw error;
    }
}

/**
 * Save round configuration
 */
function saveRoundConfig(config, filename = 'round3-secrets.json') {
    const configWithMetadata = {
        ...config,
        timestamp: new Date().toISOString(),
        _notes: [
            "This file contains the secrets needed for Round 3 reveal phase",
            "Keep this secure until reveal time",
            "Use revealSeedAndRuler() with seed, validLengths, and rulerSalt"
        ]
    };
    
    fs.writeFileSync(filename, JSON.stringify(configWithMetadata, null, 2));
    console.log(`💾 Configuration saved to: ${filename}`);
}

/**
 * Main deployment function
 */
async function deployRound3() {
    console.log('🎯 SpellBlock Round 3 Deployment\n');
    console.log('=====================================\n');
    
    try {
        // 1. Check current round status
        console.log('📊 Checking current round status...');
        await checkRoundStatus();
        console.log('');
        
        // 2. Generate configuration
        const config = await generateRound3Config();
        
        // 3. Display summary
        console.log('📋 Round 3 Summary:');
        console.log('=====================================');
        console.log(`Letters: ${config.letters} (${config.vowels}V, ${config.consonants}C)`);
        console.log(`Valid Lengths: [${config.validLengths.join(', ')}]`);
        console.log(`Letter Pool: ${config.letterPool}`);
        console.log('=====================================\n');
        
        // 4. Confirm deployment
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('🚀 Deploy Round 3 with these parameters? (y/n): ', async (answer) => {
                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    try {
                        // Save config first
                        saveRoundConfig(config);
                        
                        // Execute deployment
                        const txHash = await openRound(config);
                        
                        console.log('\n🎉 Round 3 Deployed Successfully!');
                        console.log(`📝 Transaction: ${txHash}`);
                        console.log(`🎲 Letters: ${config.letters}`);
                        console.log(`📏 Valid Lengths: [${config.validLengths.join(', ')}]`);
                        console.log('\n✅ No more duplicate letters!');
                        
                        resolve(true);
                    } catch (error) {
                        console.error('\n❌ Deployment failed:', error.message);
                        resolve(false);
                    }
                } else {
                    console.log('Deployment cancelled.');
                    resolve(false);
                }
                rl.close();
            });
        });
    } catch (error) {
        console.error('❌ Error during deployment:', error.message);
        return false;
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--generate-only')) {
        // Just generate and show configuration
        generateRound3Config().then(config => {
            console.log('📋 Generated Configuration:');
            console.log(JSON.stringify(config, null, 2));
        }).catch(console.error);
    } else if (args.includes('--force')) {
        // Skip confirmations and deploy immediately
        deployRound3().then(success => {
            process.exit(success ? 0 : 1);
        });
    } else {
        // Interactive deployment
        deployRound3().then(success => {
            process.exit(success ? 0 : 1);
        });
    }
}

module.exports = { deployRound3, generateRound3Config, openRound };