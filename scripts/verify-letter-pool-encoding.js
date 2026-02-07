#!/usr/bin/env node

/**
 * Verify Letter Pool Encoding - SpellBlock Diagnostic Tool
 * 
 * This script verifies that letter pools are correctly encoded to bytes8
 * and checks both onchain and configuration data for correctness.
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const CONTRACT_ADDRESS = '0x4b8bf9004Ba309EB0169a97821D0eD993AF37961';
const RPC_URL = 'https://mainnet.base.org';

/**
 * Convert 8-letter string to bytes8 hex format
 */
function stringToBytes8(letters) {
    if (typeof letters !== 'string' || letters.length !== 8) {
        throw new Error(`Must be exactly 8 letters, got: ${letters} (length ${letters?.length})`);
    }
    
    // Verify all uppercase A-Z
    if (!/^[A-Z]{8}$/.test(letters)) {
        throw new Error(`Letters must be A-Z uppercase only, got: ${letters}`);
    }
    
    let hex = '0x';
    for (let i = 0; i < 8; i++) {
        const charCode = letters.charCodeAt(i);
        hex += charCode.toString(16).toUpperCase();
    }
    
    return hex;
}

/**
 * Convert bytes8 hex to string
 */
function bytes8ToString(hex) {
    if (!hex || hex === '0x0000000000000000') {
        return '[EMPTY]';
    }
    
    // Remove 0x prefix
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    if (clean.length !== 16) {
        throw new Error(`Invalid bytes8 length: ${hex}`);
    }
    
    let letters = '';
    for (let i = 0; i < 16; i += 2) {
        const byte = clean.slice(i, i + 2);
        const charCode = parseInt(byte, 16);
        
        // Check if valid ASCII letter
        if (charCode < 0x41 || charCode > 0x5A) {
            letters += `[0x${byte}]`;
        } else {
            letters += String.fromCharCode(charCode);
        }
    }
    
    return letters;
}

/**
 * Query round data from contract
 */
async function queryRound(roundId) {
    try {
        const cmd = `cast call ${CONTRACT_ADDRESS} "rounds(uint256)(uint256,uint256,uint256,uint256,bytes8,uint8,bytes32)" ${roundId} --rpc-url ${RPC_URL}`;
        const { stdout } = await execAsync(cmd);
        
        const lines = stdout.trim().split('\n');
        return {
            roundId: lines[0],
            startTime: lines[1],
            commitDeadline: lines[2],
            revealDeadline: lines[3],
            letterPool: lines[4],
            spellId: lines[5],
            spellParam: lines[6]
        };
    } catch (error) {
        console.error(`Failed to query round ${roundId}:`, error.message);
        return null;
    }
}

/**
 * Validate letter pool
 */
function validateLetterPool(letters) {
    const issues = [];
    
    // Check length
    if (letters.length !== 8) {
        issues.push(`Wrong length: ${letters.length} (expected 8)`);
    }
    
    // Check for duplicates
    const unique = new Set(letters.split(''));
    if (unique.size !== 8) {
        issues.push(`Has duplicates: ${unique.size} unique letters`);
        const counts = {};
        for (const letter of letters) {
            counts[letter] = (counts[letter] || 0) + 1;
        }
        const dupes = Object.entries(counts).filter(([, count]) => count > 1);
        issues.push(`  Duplicates: ${dupes.map(([l, c]) => `${l}×${c}`).join(', ')}`);
    }
    
    // Check for valid characters
    if (!/^[A-Z]+$/.test(letters)) {
        issues.push(`Invalid characters (must be A-Z uppercase)`);
    }
    
    // Check vowel/consonant balance
    const vowels = (letters.match(/[AEIOU]/g) || []).length;
    const consonants = 8 - vowels;
    if (vowels < 2 || vowels > 6) {
        issues.push(`Poor vowel balance: ${vowels} vowels, ${consonants} consonants`);
    }
    
    return issues;
}

/**
 * Test round-trip encoding
 */
function testEncoding(letters) {
    console.log(`\n🧪 Testing encoding for: "${letters}"`);
    
    try {
        // Test issues first
        const issues = validateLetterPool(letters);
        if (issues.length > 0) {
            console.log('⚠️  Validation issues:');
            issues.forEach(issue => console.log(`   - ${issue}`));
        }
        
        // Encode to bytes8
        const hex = stringToBytes8(letters);
        console.log(`   → Encoded: ${hex}`);
        
        // Decode back
        const decoded = bytes8ToString(hex);
        console.log(`   → Decoded: "${decoded}"`);
        
        // Verify round-trip
        if (decoded === letters) {
            console.log('   ✅ Round-trip successful!');
            return true;
        } else {
            console.log(`   ❌ Round-trip failed: "${letters}" → "${decoded}"`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    }
}

/**
 * Main diagnostic function
 */
async function diagnoseLetterPools() {
    console.log('🔍 SpellBlock Letter Pool Encoding Diagnostic\n');
    console.log('='.repeat(60));
    
    // Test basic encoding
    console.log('\n📝 Testing Encoding/Decoding:\n');
    
    const testCases = [
        'HRMEIBSD',  // Round 3 announced
        'AEISOTLN',  // Round 1
        'RIDENTER',  // Round 2 (known issue - duplicates)
        'ABCDEFGH',  // Test case
        'AAAAAAAA',  // All duplicates (should fail validation)
    ];
    
    for (const testCase of testCases) {
        testEncoding(testCase);
    }
    
    // Query onchain data
    console.log('\n\n📡 Checking Onchain Data:\n');
    
    for (let roundId = 1; roundId <= 3; roundId++) {
        console.log(`Round ${roundId}:`);
        const round = await queryRound(roundId);
        
        if (!round) {
            console.log('  ❌ Failed to query\n');
            continue;
        }
        
        console.log(`  Letter Pool (hex): ${round.letterPool}`);
        const letters = bytes8ToString(round.letterPool);
        console.log(`  Letter Pool (str): "${letters}"`);
        
        if (round.letterPool === '0x0000000000000000') {
            console.log('  ⚠️  WARNING: EMPTY LETTER POOL!');
        } else {
            const issues = validateLetterPool(letters.replace(/\[0x..\]/g, ''));
            if (issues.length > 0) {
                console.log('  ⚠️  Issues found:');
                issues.forEach(issue => console.log(`     - ${issue}`));
            } else {
                console.log('  ✅ Valid letter pool');
            }
        }
        
        console.log(`  Spell ID: ${round.spellId}`);
        console.log(`  Spell Param: ${round.spellParam}`);
        console.log('');
    }
    
    // Summary
    console.log('='.repeat(60));
    console.log('\n📋 Summary:\n');
    console.log('Correct encoding format:');
    console.log('  • 8 unique uppercase letters (A-Z)');
    console.log('  • Each letter → ASCII hex (A=0x41, B=0x42, ...)');
    console.log('  • Concatenate all 8 bytes → 0x4142434445464748');
    console.log('  • Result is bytes8 (16 hex chars)');
    console.log('\nExample: "ABCDEFGH" → 0x4142434445464748');
    console.log('         "HRMEIBSD" → 0x48524D4549425344');
}

// CLI
if (require.main === module) {
    diagnoseLetterPools()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    stringToBytes8,
    bytes8ToString,
    validateLetterPool,
    testEncoding
};
