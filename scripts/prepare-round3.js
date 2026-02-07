#!/usr/bin/env node

/**
 * Prepare Round 3 for SpellBlock
 * 
 * Generates all necessary values for opening Round 3 with proper random letters
 */

const crypto = require('crypto');
const { generateValidatedLetterPool } = require('./generate-random-letters.js');

/**
 * Generate random seed and its hash
 */
function generateSeedAndHash() {
    // Generate 32-byte random seed
    const seed = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Calculate keccak256 hash of the seed
    const { keccak256 } = require('@ethersproject/keccak256');
    const { arrayify } = require('@ethersproject/bytes');
    
    try {
        const seedHash = keccak256(arrayify(seed));
        return { seed, seedHash };
    } catch (error) {
        // Fallback if ethers not available - use node crypto
        const hash = crypto.createHash('sha256').update(Buffer.from(seed.slice(2), 'hex')).digest();
        const seedHash = '0x' + hash.toString('hex');
        return { seed, seedHash };
    }
}

/**
 * Generate ruler salt and suggested valid lengths
 */
function generateRulerData() {
    // Generate random salt
    const rulerSalt = '0x' + crypto.randomBytes(32).toString('hex');
    
    // Suggest valid lengths (this would normally be committed separately)
    // Based on v3 spec, lengths should be challenging but fair
    const lengthOptions = [
        [4, 6, 8],  // Similar to Round 2
        [5, 6, 7],  // Similar to Round 1
        [4, 5, 8],  // Mixed range
        [5, 7, 8],  // Higher difficulty
        [4, 6, 7],  // Mixed medium
    ];
    
    const randomIndex = crypto.randomInt(0, lengthOptions.length);
    const validLengths = lengthOptions[randomIndex];
    
    return { rulerSalt, validLengths };
}

/**
 * Generate complete Round 3 configuration
 */
function prepareRound3() {
    console.log('🎲 Preparing SpellBlock Round 3...\n');
    
    // Generate random letters
    console.log('1. Generating random letters:');
    const letterPool = generateValidatedLetterPool();
    console.log('');
    
    // Generate seed and hash
    console.log('2. Generating seed and hash:');
    const { seed, seedHash } = generateSeedAndHash();
    console.log(`   Seed: ${seed}`);
    console.log(`   Hash: ${seedHash}`);
    console.log('');
    
    // Generate ruler data
    console.log('3. Generating ruler configuration:');
    const { rulerSalt, validLengths } = generateRulerData();
    console.log(`   Salt: ${rulerSalt}`);
    console.log(`   Valid Lengths: [${validLengths.join(', ')}]`);
    console.log('');
    
    // Note: rulerCommitHash must be calculated by SpellRegistry
    console.log('⚠️  Note: rulerCommitHash must be calculated using SpellRegistry.generateRulerCommitment()');
    console.log('');
    
    const round3Config = {
        roundId: 3,
        seed,
        seedHash,
        rulerSalt,
        validLengths,
        letterPool: letterPool.hex,
        letters: letterPool.letters
    };
    
    console.log('📋 Round 3 Configuration:');
    console.log('=====================================');
    console.log(`Round ID: ${round3Config.roundId}`);
    console.log(`Letters: ${round3Config.letters}`);
    console.log(`Letter Pool (hex): ${round3Config.letterPool}`);
    console.log(`Seed Hash: ${round3Config.seedHash}`);
    console.log(`Valid Lengths: [${round3Config.validLengths.join(', ')}]`);
    console.log('=====================================');
    console.log('');
    
    console.log('📝 Next Steps:');
    console.log('1. Calculate rulerCommitHash using SpellRegistry contract');
    console.log('2. Call openRound(seedHash, rulerCommitHash, letterPool)');
    console.log('3. Save secrets to round3-secrets.json');
    console.log('4. Wait for commit phase, then call revealSeedAndRuler()');
    
    return round3Config;
}

/**
 * Save configuration to JSON file
 */
function saveConfiguration(config, filename = 'round3-secrets.json') {
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, '..', filename);
    
    // Add note about rulerCommitHash
    const configWithNote = {
        ...config,
        _note: "rulerCommitHash must be calculated using SpellRegistry.generateRulerCommitment(roundId, validLengths, rulerSalt)"
    };
    
    fs.writeFileSync(filePath, JSON.stringify(configWithNote, null, 2));
    console.log(`\n💾 Configuration saved to: ${filePath}`);
}

// Main execution
if (require.main === module) {
    try {
        const config = prepareRound3();
        
        // Ask if user wants to save
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('\n💾 Save configuration to round3-secrets.json? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                saveConfiguration(config);
            } else {
                console.log('Configuration not saved.');
            }
            rl.close();
        });
        
    } catch (error) {
        console.error('❌ Failed to prepare Round 3:', error.message);
        process.exit(1);
    }
}

module.exports = { prepareRound3, generateSeedAndHash, generateRulerData };