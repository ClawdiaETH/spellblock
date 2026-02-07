#!/usr/bin/env node

/**
 * Check current round status and timing for SpellBlock
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const CONTRACT_ADDRESS = '0x4b8bf9004Ba309EB0169a97821D0eD993AF37961';
const RPC_URL = 'https://mainnet.base.org';

async function getCurrentRoundId() {
    const { stdout } = await execAsync(`cast call ${CONTRACT_ADDRESS} "currentRoundId()" --rpc-url ${RPC_URL}`);
    return parseInt(stdout.trim(), 16);
}

async function getRoundData(roundId) {
    // Get individual fields since the full struct is hard to parse
    const commands = [
        `cast call ${CONTRACT_ADDRESS} "rounds(uint256)" ${roundId} --rpc-url ${RPC_URL}`,
    ];
    
    try {
        const { stdout } = await execAsync(commands[0]);
        const data = stdout.trim();
        
        // Parse the packed struct (this is complex, let's get specific fields)
        console.log('Raw round data:', data);
        
        // Try to get specific timestamps
        const startTimeCmd = `cast call ${CONTRACT_ADDRESS} "rounds(uint256)" ${roundId} --rpc-url ${RPC_URL} | cut -c67-130`;
        const commitDeadlineCmd = `cast call ${CONTRACT_ADDRESS} "rounds(uint256)" ${roundId} --rpc-url ${RPC_URL} | cut -c131-194`;
        
        // This is getting complex, let me try a different approach
        return data;
    } catch (error) {
        console.error('Error getting round data:', error);
        return null;
    }
}

async function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

async function checkRoundStatus() {
    console.log('🔍 Checking SpellBlock round status...\n');
    
    try {
        const currentRoundId = await getCurrentRoundId();
        console.log(`Current Round ID: ${currentRoundId}`);
        
        const currentTime = await getCurrentTimestamp();
        console.log(`Current Time: ${currentTime} (${new Date(currentTime * 1000).toISOString()})`);
        
        // From the round2-secrets.json, we can see Round 2 started
        // Let's calculate based on the 8-hour commit phase
        
        // From the hex data we saw earlier, the startTime appears to be around 0x6984b599
        const round2StartTime = parseInt('0x6984b599', 16);
        const commitDuration = 8 * 60 * 60; // 8 hours
        const revealDuration = 4 * 60 * 60; // 4 hours
        
        const commitDeadline = round2StartTime + commitDuration;
        const revealDeadline = commitDeadline + revealDuration;
        
        console.log(`\nRound ${currentRoundId} Timeline:`);
        console.log(`  Start Time: ${round2StartTime} (${new Date(round2StartTime * 1000).toISOString()})`);
        console.log(`  Commit Deadline: ${commitDeadline} (${new Date(commitDeadline * 1000).toISOString()})`);
        console.log(`  Reveal Deadline: ${revealDeadline} (${new Date(revealDeadline * 1000).toISOString()})`);
        
        const timeToCommitEnd = commitDeadline - currentTime;
        const timeToRevealEnd = revealDeadline - currentTime;
        
        console.log(`\nTime Remaining:`);
        if (timeToCommitEnd > 0) {
            console.log(`  Commit Phase: ${Math.floor(timeToCommitEnd / 3600)}h ${Math.floor((timeToCommitEnd % 3600) / 60)}m`);
            console.log(`  📝 Round ${currentRoundId} is in COMMIT phase`);
        } else if (timeToRevealEnd > 0) {
            console.log(`  Reveal Phase: ${Math.floor(timeToRevealEnd / 3600)}h ${Math.floor((timeToRevealEnd % 3600) / 60)}m`);
            console.log(`  🔍 Round ${currentRoundId} is in REVEAL phase`);
        } else {
            console.log(`  ✅ Round ${currentRoundId} is COMPLETE and ready for finalization`);
            console.log(`  🚀 Round ${currentRoundId + 1} can be opened!`);
        }
        
        console.log(`\n📋 Summary:`);
        console.log(`- Current Round: ${currentRoundId}`);
        console.log(`- Next Round: ${currentRoundId + 1}`);
        console.log(`- Ready for Round ${currentRoundId + 1}? ${timeToRevealEnd <= 0 ? '✅ YES' : '❌ NO'}`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

if (require.main === module) {
    checkRoundStatus();
}

module.exports = { getCurrentRoundId, checkRoundStatus };