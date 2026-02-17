#!/usr/bin/env node

/**
 * Random Letter Generation for SpellBlock Round 3+
 * 
 * Generates 8 unique letters with no duplicates and avoids obvious words
 * Uses proper randomness and weighted letter selection
 */

const crypto = require('crypto');

// Letter frequencies in English (approximate)
const LETTER_WEIGHTS = {
    'A': 12, 'B': 3, 'C': 6, 'D': 8, 'E': 18, 'F': 4, 'G': 4, 'H': 10, 'I': 12, 'J': 1,
    'K': 1, 'L': 7, 'M': 5, 'N': 11, 'O': 13, 'P': 4, 'Q': 1, 'R': 10, 'S': 11, 'T': 15,
    'U': 5, 'V': 2, 'W': 4, 'X': 1, 'Y': 3, 'Z': 1
};

// Common words to avoid (partial list)
const AVOID_WORDS = [
    'OUTLINED', 'PROBLEMS', 'STRAIGHT', 'TRIANGLE', 'STANDARD', 'NORTHERN',
    'TERMINAL', 'INTEGRAL', 'ORIENTAL', 'REGIONAL', 'ARTICLES', 'QUARTETS',
    'QUARTILE', 'QUARTIER', 'SETTLERS', 'RESTLESS', 'SETTLERS'
];

// Letter combinations that are too difficult (all vowels, all consonants, etc.)
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const CONSONANTS = new Set(['B','C','D','F','G','H','J','K','L','M','N','P','Q','R','S','T','V','W','X','Y','Z']);

/**
 * Generate weighted random letters ensuring diversity and at least 2 vowels
 */
function generateRandomLetters() {
    const letters = Object.keys(LETTER_WEIGHTS);
    const weights = Object.values(LETTER_WEIGHTS);
    
    // Create weighted array for selection
    const weightedArray = [];
    letters.forEach((letter, i) => {
        for (let j = 0; j < weights[i]; j++) {
            weightedArray.push(letter);
        }
    });
    
    const selected = new Set();
    let attempts = 0;
    const MAX_ATTEMPTS = 1000;
    
    // First, ensure we get at least 2 vowels
    const vowelArray = ['A', 'E', 'I', 'O', 'U'];
    const guaranteedVowels = new Set();
    
    while (guaranteedVowels.size < 2) {
        const randomVowel = vowelArray[crypto.randomInt(0, vowelArray.length)];
        guaranteedVowels.add(randomVowel);
    }
    
    // Add the guaranteed vowels to selected
    guaranteedVowels.forEach(vowel => selected.add(vowel));
    
    // Now fill remaining slots with weighted random selection
    while (selected.size < 8 && attempts < MAX_ATTEMPTS) {
        attempts++;
        
        // Pick random letter from weighted array
        const randomIndex = crypto.randomInt(0, weightedArray.length);
        const letter = weightedArray[randomIndex];
        
        selected.add(letter);
    }
    
    if (selected.size < 8) {
        throw new Error('Failed to generate 8 unique letters');
    }
    
    return Array.from(selected);
}

/**
 * Validate letter pool doesn't form obvious words
 */
function validateNoObviousWords(letters) {
    const letterSet = new Set(letters.map(l => l.toUpperCase()));
    
    for (const word of AVOID_WORDS) {
        const wordLetters = [...word];
        const canForm = wordLetters.every(letter => letterSet.has(letter));
        
        if (canForm) {
            console.log(`⚠️  Can form obvious word: ${word}`);
            return false;
        }
    }
    
    return true;
}

/**
 * Validate reasonable letter distribution
 */
function validateReasonableDistribution(letters) {
    const letterSet = new Set(letters);
    
    // Count vowels and consonants
    const vowelCount = letters.filter(l => VOWELS.has(l)).length;
    const consonantCount = letters.filter(l => CONSONANTS.has(l)).length;
    
    // Need at least 2 vowels and 2 consonants for playability
    if (vowelCount < 2) {
        console.log(`⚠️  Too few vowels: ${vowelCount}`);
        return false;
    }
    
    if (consonantCount < 2) {
        console.log(`⚠️  Too few consonants: ${consonantCount}`);
        return false;
    }
    
    // Warn if extreme distributions
    if (vowelCount > 6) {
        console.log(`⚠️  Too many vowels: ${vowelCount}`);
        return false;
    }
    
    if (consonantCount > 6) {
        console.log(`⚠️  Too many consonants: ${consonantCount}`);
        return false;
    }
    
    return true;
}

/**
 * Convert letters to bytes8 hex format for contract
 */
function lettersToHex(letters) {
    if (letters.length !== 8) {
        throw new Error('Must have exactly 8 letters');
    }
    
    let hex = '0x';
    for (const letter of letters) {
        hex += letter.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase();
    }
    
    return hex;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Generate and validate a random letter pool
 */
function generateValidatedLetterPool(maxAttempts = 100) {
    console.log('🎲 Generating random letter pool for SpellBlock...\n');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Attempt ${attempt}:`);
        
        try {
            // Generate 8 unique random letters
            let letters = generateRandomLetters();
            
            // Shuffle to avoid alphabetical ordering
            letters = shuffleArray(letters);
            
            console.log(`  Letters: ${letters.join('')}`);
            
            // Check for duplicates (should never happen with Set, but double-check)
            const uniqueCheck = new Set(letters);
            if (uniqueCheck.size !== 8) {
                console.log(`  ❌ Has duplicates: ${uniqueCheck.size}/8 unique`);
                continue;
            }
            
            // Validate distribution
            if (!validateReasonableDistribution(letters)) {
                console.log(`  ❌ Poor distribution`);
                continue;
            }
            
            // Validate no obvious words
            if (!validateNoObviousWords(letters)) {
                console.log(`  ❌ Forms obvious words`);
                continue;
            }
            
            // Success!
            const hexValue = lettersToHex(letters);
            const vowelCount = letters.filter(l => VOWELS.has(l)).length;
            const consonantCount = 8 - vowelCount;
            
            console.log(`  ✅ Valid letter pool!`);
            console.log(`  📊 Distribution: ${vowelCount} vowels, ${consonantCount} consonants`);
            console.log(`  🎯 Final: ${letters.join('')}`);
            console.log(`  🔗 Hex: ${hexValue}`);
            
            return {
                letters: letters.join(''),
                letterArray: letters,
                hex: hexValue,
                vowels: vowelCount,
                consonants: consonantCount,
                attempt: attempt
            };
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            continue;
        }
        
        console.log('');
    }
    
    throw new Error(`Failed to generate valid letter pool after ${maxAttempts} attempts`);
}

/**
 * Test the letter pool by checking if sample words can be formed
 */
function testWordFormation(letters) {
    console.log('\n🧪 Testing word formation capabilities:');
    
    const letterCounts = {};
    for (const letter of letters) {
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }
    
    // Test some common word patterns
    const testWords = [
        'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HAD',
        'THEN', 'LIKE', 'TIME', 'VERY', 'WHEN', 'COME', 'HERE', 'JUST', 'LONG',
        'ABOUT', 'AFTER', 'FIRST', 'NEVER', 'OTHER', 'THOSE', 'WHERE', 'RIGHT'
    ];
    
    const formableWords = [];
    
    for (const word of testWords) {
        const canForm = [...word].every(letter => letters.includes(letter));
        if (canForm) {
            formableWords.push(word);
        }
    }
    
    console.log(`  ✅ Can form ${formableWords.length}/28 test words: ${formableWords.slice(0, 8).join(', ')}${formableWords.length > 8 ? '...' : ''}`);
    
    if (formableWords.length < 5) {
        console.log(`  ⚠️  Low word formation potential - consider regenerating`);
        return false;
    }
    
    return true;
}

// Main execution
if (require.main === module) {
    try {
        const result = generateValidatedLetterPool();
        testWordFormation(result.letterArray);
        
        console.log('\n📋 Summary for Round 3 deployment:');
        console.log(`Letters: ${result.letters}`);
        console.log(`Hex: ${result.hex}`);
        console.log(`Ready for openRound() call!`);
        
    } catch (error) {
        console.error('❌ Failed to generate letter pool:', error.message);
        process.exit(1);
    }
}

module.exports = {
    generateValidatedLetterPool,
    lettersToHex,
    validateNoObviousWords,
    validateReasonableDistribution
};