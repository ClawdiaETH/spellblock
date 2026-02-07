#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the Python file
const blocklistPy = fs.readFileSync(
  path.join(__dirname, '../public/dictionary/blocklist.py'), 
  'utf8'
);

// Extract words from BLOCKLIST.update([...]) calls using regex
const blocklistEntries = new Set();

// Match patterns like: BLOCKLIST.update([...])
const updateMatches = blocklistPy.match(/BLOCKLIST\.update\(\[\s*([\s\S]*?)\s*\]\)/g);

if (updateMatches) {
  updateMatches.forEach(match => {
    // Extract the content between the brackets
    const content = match.match(/\[\s*([\s\S]*?)\s*\]/)[1];
    
    // Extract quoted strings, but filter out comments
    const words = content.match(/"([^"]+)"/g);
    
    if (words) {
      words.forEach(word => {
        const cleanWord = word.slice(1, -1);
        // Skip comments and non-word entries
        if (!cleanWord.includes(' ') && !cleanWord.includes("'") && cleanWord.length > 0) {
          blocklistEntries.add(cleanWord);
        }
      });
    }
  });
}

// Convert to array and sort
const blocklist = Array.from(blocklistEntries).sort();

// Write to JSON file
const outputPath = path.join(__dirname, '../public/dictionary/blocklist.json');
fs.writeFileSync(outputPath, JSON.stringify(blocklist, null, 2));

console.log(`Extracted ${blocklist.length} blocked words to ${outputPath}`);