#!/usr/bin/env node

/**
 * Safe Round Deployment Script with Comprehensive Validation
 * 
 * This script adds multiple layers of validation to prevent empty or invalid
 * letter pools from being deployed to the contract.
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');
const crypto = require('crypto');

const { generateValidatedLetterPool } = require('./generate-random-letters.js');
const { stringToBytes8, bytes8ToString, validateLetterPool } = require('./verify-letter-pool-encoding.js');
const { getCurrentRoundId } = require('./check-round-status.js');

const CONTRACT_ADDRESS = '0x4b8bf9004Ba309EB0169a97821D0eD993AF37961';
const SPELL_REGISTRY_ADDRESS = '0x8DC86F87d96e7227CBb955d5fF716F427EBa496f';
const RPC_URL = 'https://mainnet.base.org';

/**
 * Validate letter pool - comprehensive checks
 */
function validateLetterPoolComprehensive(letters, hex) {
    console.log('🔍 Validating letter pool...\n');
    
    const errors = [];
    const warnings = [];
    
    // 1. Check string format
    if (typeof letters !== 'string') {
        errors.push(`Letters must be a string, got: ${typeof letters}`);
        return { valid: false, errors, warnings };
    }
    
    if (letters.length !== 8) {
        errors.push(`Must have exactly 8 letters, got: ${letters.length}`);
    }
    
    if (!/^[A-Z]{8}$/.test(letters)) {
        errors.push(`Letters must be uppercase A-Z only, got: "${letters}"`);
    }
    
    // 2. Check for duplicates
    const unique = new Set(letters.split(''));
    if (unique.size !== 8) {
        errors.push(`Has duplicate letters: ${unique.size}/8 unique`);
        const counts = {};
        for (const letter of letters) {
            counts[letter] = (counts[letter] || 0) + 1;
        }
        const dupes = Object.entries(counts).filter(([, count]) => count > 1);
        errors.push(`  Duplicates: ${dupes.map(([l, c]) => `${l} appears ${c} times`).join(', ')}`);
    }
    
    // 3. Check hex format
    if (!hex || hex === '0x0000000000000000') {
        errors.push('Letter pool hex is EMPTY (0x0000000000000000) - THIS WILL CAUSE BUGS!');
    }
    
    if (!/^0x[0-9A-Fa-f]{16}$/.test(hex)) {
        errors.push(`Invalid hex format: ${hex} (must be 0x + 16 hex chars)`);
    }
    
    // 4. Verify encoding matches
    try {
        const expectedHex = stringToBytes8(letters);
        if (expectedHex.toUpperCase() !== hex.toUpperCase()) {
            errors.push(`Hex encoding mismatch!`);
            errors.push(`  Expected: ${expectedHex}`);
            errors.push(`  Got:      ${hex}`);
        }
    } catch (error) {
        errors.push(`Failed to verify encoding: ${error.message}`);
    }
    
    // 5. Verify decoding matches
    try {
        const decoded = bytes8ToString(hex);
        if (decoded !== letters) {
            errors.push(`Decoding mismatch!`);
            errors.push(`  Original: "${letters}"`);
            errors.push(`  Decoded:  "${decoded}"`);
        }
    } catch (error) {
        errors.push(`Failed to decode hex: ${error.message}`);
    }
    
    // 6. Check vowel/consonant balance
    const vowels = (letters.match(/[AEIOU]/g) || []).length;
    const consonants = 8 - vowels;
    
    if (vowels < 2) {
        warnings.push(`Very few vowels: ${vowels} (may be too difficult)`);
    } else if (vowels > 6) {
        warnings.push(`Too many vowels: ${vowels} (may be too easy)`);
    }
    
    if (consonants < 2) {
        warnings.push(`Very few consonants: ${consonants} (may be too difficult)`);
    }
    
    // Print results
    if (errors.length > 0) {
        console.log('❌ VALIDATION FAILED:\n');
        errors.forEach(err => console.log(`   ${err}`));
        console.log('');
    }
    
    if (warnings.length > 0) {
        console.log('⚠️  Warnings:\n');
        warnings.forEach(warn => console.log(`   ${warn}`));
        console.log('');
    }
    
    if (errors.length === 0) {
        console.log('✅ Letter pool validation passed!\n');
        console.log(`   Letters: "${letters}"`);
        console.log(`   Hex:     ${hex}`);
        console.log(`   Balance: ${vowels} vowels, ${consonants} consonants\n`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        stats: { vowels, consonants, unique: unique.size }
    };
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
 * Generate complete round configuration with validation
 */
async function generateRoundConfig(roundNumber) {
    console.log(`🎲 Generating Round ${roundNumber} configuration...\n`);
    console.log('='.repeat(60));
    console.log('');
    
    // 1. Generate random letters with built-in validation
    console.log('Step 1: Generating random letter pool\n');
    const letterPool = generateValidatedLetterPool();
    console.log('');
    
    // 2. Additional validation layer
    console.log('Step 2: Running comprehensive validation\n');
    const validation = validateLetterPoolComprehensive(letterPool.letters, letterPool.hex);
    
    if (!validation.valid) {
        throw new Error('Letter pool failed validation! Cannot proceed.');
    }
    
    // 3. Generate cryptographic commitments
    console.log('Step 3: Generating cryptographic commitments\n');
    const seed = '0x' + crypto.randomBytes(32).toString('hex');
    const seedHash = '0x' + crypto.createHash('sha256')
        .update(Buffer.from(seed.slice(2), 'hex'))
        .digest('hex');
    
    console.log(`   Seed:     ${seed}`);
    console.log(`   SeedHash: ${seedHash}\n`);
    
    // 4. Generate ruler configuration
    console.log('Step 4: Generating ruler configuration\n');
    const rulerSalt = '0x' + crypto.randomBytes(32).toString('hex');
    
    const lengthOptions = [
        [4, 6, 8],
        [5, 6, 7],
        [4, 5, 8],
        [5, 7, 8],
    ];
    
    const randomIndex = crypto.randomInt(0, lengthOptions.length);
    const validLengths = lengthOptions[randomIndex];
    
    console.log(`   Valid Lengths: [${validLengths.join(', ')}]`);
    console.log(`   Ruler Salt:    ${rulerSalt}\n`);
    
    const rulerCommitHash = await generateRulerCommitHash(roundNumber, validLengths, rulerSalt);
    console.log(`   Commit Hash:   ${rulerCommitHash}\n`);
    
    return {
        roundId: roundNumber,
        seed,
        seedHash,
        rulerSalt,
        validLengths,
        rulerCommitHash,
        letterPool: letterPool.hex,
        letters: letterPool.letters,
        vowels: letterPool.vowels,
        consonants: letterPool.consonants,
        validation
    };
}

/**
 * Dry run - show what would be deployed without executing
 */
function dryRun(config) {
    console.log('='.repeat(60));
    console.log('🔍 DRY RUN - Transaction Preview\n');
    console.log('This is what WOULD be sent to the contract:\n');
    console.log(`Contract:  ${CONTRACT_ADDRESS}`);
    console.log(`Function:  openRound(bytes32,bytes32,bytes8)`);
    console.log(`RPC:       ${RPC_URL}\n`);
    console.log('Parameters:');
    console.log(`  seedHash:        ${config.seedHash}`);
    console.log(`  rulerCommitHash: ${config.rulerCommitHash}`);
    console.log(`  letterPool:      ${config.letterPool}\n`);
    console.log('Letter Pool Breakdown:');
    console.log(`  String: "${config.letters}"`);
    console.log(`  Hex:    ${config.letterPool}`);
    console.log(`  Bytes:  ${config.letterPool.slice(2).match(/.{2}/g).map(b => `0x${b}`).join(' ')}`);
    console.log(`  ASCII:  ${config.letterPool.slice(2).match(/.{2}/g).map(b => {
        const char = String.fromCharCode(parseInt(b, 16));
        return `'${char}'`;
    }).join(' ')}\n`);
    console.log('Round Details:');
    console.log(`  Letters:       ${config.letters}`);
    console.log(`  Valid Lengths: [${config.validLengths.join(', ')}]`);
    console.log(`  Vowels:        ${config.vowels}`);
    console.log(`  Consonants:    ${config.consonants}\n`);
    console.log('⚠️  NO TRANSACTION WILL BE SENT - This is a preview only\n');
    console.log('='.repeat(60));
}

/**
 * Execute openRound transaction with final validation
 */
async function openRound(config) {
    console.log('\n='.repeat(60));
    console.log('🚀 Opening Round...\n');
    
    // Final validation before sending transaction
    console.log('Final pre-flight check:\n');
    const validation = validateLetterPoolComprehensive(config.letters, config.letterPool);
    
    if (!validation.valid) {
        throw new Error('FATAL: Letter pool validation failed at deployment time!');
    }
    
    const signingKey = process.env.SIGNING_KEY || '$(cat ~/.clawdbot/secrets/signing_key)';
    
    try {
        const cmd = `cast send ${CONTRACT_ADDRESS} "openRound(bytes32,bytes32,bytes8)" ${config.seedHash} ${config.rulerCommitHash} ${config.letterPool} --private-key ${signingKey} --rpc-url ${RPC_URL}`;
        
        console.log('📤 Submitting transaction...\n');
        const { stdout } = await execAsync(cmd);
        
        console.log('✅ Transaction successful!\n');
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
function saveRoundConfig(config, filename) {
    const configWithMetadata = {
        ...config,
        timestamp: new Date().toISOString(),
        _notes: [
            "This file contains the secrets needed for the reveal phase",
            "Keep this secure until reveal time",
            "Use revealSeedAndRuler() with seed, validLengths, and rulerSalt",
            "",
            "Letter pool encoding:",
            `  String: "${config.letters}"`,
            `  Hex:    ${config.letterPool}`,
            `  Each letter is encoded as its ASCII hex value`,
            `  Example: 'H' = 0x48, 'R' = 0x52, etc.`
        ]
    };
    
    delete configWithMetadata.validation; // Don't save validation details
    
    fs.writeFileSync(filename, JSON.stringify(configWithMetadata, null, 2));
    console.log(`\n💾 Configuration saved to: ${filename}`);
}

/**
 * Main deployment function
 */
async function deployRound() {
    const args = process.argv.slice(2);
    const dryRunMode = args.includes('--dry-run');
    const roundNumber = parseInt(args.find(arg => arg.startsWith('--round='))?.split('=')[1]) || await getCurrentRoundId() + 1;
    
    console.log('🎯 SpellBlock Safe Round Deployment\n');
    console.log('='.repeat(60));
    console.log(`Round Number: ${roundNumber}`);
    console.log(`Mode: ${dryRunMode ? 'DRY RUN' : 'LIVE DEPLOYMENT'}`);
    console.log('='.repeat(60));
    console.log('');
    
    try {
        // Generate configuration with validation
        const config = await generateRoundConfig(roundNumber);
        
        // Show what will be deployed
        dryRun(config);
        
        if (dryRunMode) {
            console.log('\n✅ Dry run complete - no transaction sent\n');
            console.log('To deploy for real, run without --dry-run flag\n');
            return true;
        }
        
        // Confirm deployment
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('\n🚀 Deploy this round configuration? (yes/no): ', async (answer) => {
                if (answer.toLowerCase() === 'yes') {
                    try {
                        // Save config first
                        const filename = `round${roundNumber}-secrets.json`;
                        saveRoundConfig(config, filename);
                        
                        // Execute deployment
                        const txHash = await openRound(config);
                        
                        console.log('\n' + '='.repeat(60));
                        console.log('🎉 Round Deployed Successfully!\n');
                        console.log(`Transaction: ${txHash}`);
                        console.log(`Letters:     ${config.letters}`);
                        console.log(`Hex:         ${config.letterPool}`);
                        console.log(`Lengths:     [${config.validLengths.join(', ')}]`);
                        console.log(`Config:      ${filename}`);
                        console.log('='.repeat(60));
                        
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
    deployRound().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = {
    deployRound,
    generateRoundConfig,
    validateLetterPoolComprehensive,
    dryRun
};
