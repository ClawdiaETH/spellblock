#!/usr/bin/env node

/**
 * Validate letter pools for duplicates and other issues
 * Useful for checking existing rounds or manually chosen letters
 */

/**
 * Validate a letter string for duplicates and other issues
 */
function validateLetters(letters) {
    console.log(`🔍 Validating letters: "${letters}"`);
    console.log('=====================================');
    
    const results = {
        valid: true,
        issues: [],
        stats: {}
    };
    
    // Check length
    if (letters.length !== 8) {
        results.valid = false;
        results.issues.push(`❌ Wrong length: ${letters.length} (should be 8)`);
    } else {
        results.issues.push(`✅ Correct length: 8`);
    }
    
    // Check for duplicates
    const letterArray = [...letters.toUpperCase()];
    const uniqueLetters = new Set(letterArray);
    const uniqueCount = uniqueLetters.size;
    
    if (uniqueCount !== 8) {
        results.valid = false;
        results.issues.push(`❌ Has duplicates: ${uniqueCount}/8 unique letters`);
        
        // Find duplicates
        const letterCounts = {};
        for (const letter of letterArray) {
            letterCounts[letter] = (letterCounts[letter] || 0) + 1;
        }
        
        const duplicates = Object.entries(letterCounts)
            .filter(([letter, count]) => count > 1)
            .map(([letter, count]) => `${letter}(${count})`);
        
        results.issues.push(`   Duplicates: ${duplicates.join(', ')}`);
    } else {
        results.issues.push(`✅ No duplicates: all 8 letters unique`);
    }
    
    // Check character validity
    const invalidChars = letterArray.filter(char => 
        char < 'A' || char > 'Z'
    );
    
    if (invalidChars.length > 0) {
        results.valid = false;
        results.issues.push(`❌ Invalid characters: ${invalidChars.join(', ')}`);
    } else {
        results.issues.push(`✅ All valid letters A-Z`);
    }
    
    // Analyze distribution
    const vowels = letterArray.filter(letter => 'AEIOU'.includes(letter));
    const consonants = letterArray.filter(letter => !'AEIOU'.includes(letter));
    
    results.stats = {
        vowels: vowels.length,
        consonants: consonants.length,
        vowelList: vowels,
        consonantList: consonants
    };
    
    results.issues.push(`📊 Distribution: ${vowels.length} vowels (${vowels.join('')}), ${consonants.length} consonants (${consonants.join('')})`);
    
    // Check for reasonable distribution
    if (vowels.length < 2) {
        results.issues.push(`⚠️  Very few vowels (${vowels.length}) - may be difficult`);
    } else if (vowels.length > 5) {
        results.issues.push(`⚠️  Very many vowels (${vowels.length}) - may be too easy`);
    } else {
        results.issues.push(`✅ Good vowel distribution (${vowels.length})`);
    }
    
    // Convert to hex
    let hex = '0x';
    for (const letter of letters.toUpperCase()) {
        hex += letter.charCodeAt(0).toString(16).padStart(2, '0');
    }
    results.hex = hex;
    results.issues.push(`🔗 Hex representation: ${hex}`);
    
    // Print results
    console.log(results.issues.join('\n'));
    console.log('=====================================');
    console.log(`Overall: ${results.valid ? '✅ VALID' : '❌ INVALID'}`);
    
    return results;
}

/**
 * Compare multiple letter pools
 */
function compareRounds(rounds) {
    console.log('🔍 Comparing SpellBlock Rounds');
    console.log('=====================================\n');
    
    for (const [roundName, letters] of Object.entries(rounds)) {
        console.log(`Round ${roundName}: "${letters}"`);
        const result = validateLetters(letters);
        console.log('');
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // Validate provided letters
        const letters = args[0].toUpperCase();
        validateLetters(letters);
    } else {
        // Compare existing rounds
        const rounds = {
            1: 'AEISOTLN',   // Round 1 (no duplicates)
            2: 'RIDENTER',   // Round 2 (has duplicates!)
        };
        
        compareRounds(rounds);
        
        console.log('💡 Usage:');
        console.log('  node validate-letters.js ABCDEFGH');
        console.log('  node validate-letters.js "RIDENTER"');
    }
}

module.exports = { validateLetters, compareRounds };