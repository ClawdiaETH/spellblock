#!/usr/bin/env node

/**
 * Automated Round 3 Deployment Monitor
 * 
 * Monitors Round 2 completion and automatically deploys Round 3 with proper random letters
 */

const { deployRound3, generateRound3Config } = require('./deploy-round3.js');
const { getCurrentRoundId } = require('./check-round-status.js');
const { validateLetters } = require('./validate-letters.js');

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const CONTRACT_ADDRESS = '0x4b8bf9004Ba309EB0169a97821D0eD993AF37961';
const RPC_URL = 'https://mainnet.base.org';

/**
 * Check if a round is finalized
 */
async function isRoundFinalized(roundId) {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
        // This is a simplified check - in production you'd parse the full round struct
        const cmd = `cast call ${CONTRACT_ADDRESS} "rounds(uint256)" ${roundId} --rpc-url ${RPC_URL}`;
        const { stdout } = await execAsync(cmd);
        
        // For now, return false to prevent accidental deployment
        // In production, you'd check the finalized flag in the struct
        return false;
    } catch (error) {
        console.error('Error checking finalization:', error);
        return false;
    }
}

/**
 * Monitor and auto-deploy
 */
async function monitorAndDeploy() {
    console.log('🔄 Starting Round 3 Auto-Deployment Monitor');
    console.log('============================================');
    console.log(`Checking every ${CHECK_INTERVAL / 1000 / 60} minutes for Round 2 completion`);
    console.log('Press Ctrl+C to stop\n');
    
    let deploymentAttempted = false;
    
    const monitor = setInterval(async () => {
        try {
            console.log(`[${new Date().toISOString()}] Checking round status...`);
            
            const currentRoundId = await getCurrentRoundId();
            console.log(`Current Round: ${currentRoundId}`);
            
            if (currentRoundId === 2) {
                const isFinalized = await isRoundFinalized(2);
                console.log(`Round 2 finalized: ${isFinalized}`);
                
                if (isFinalized && !deploymentAttempted) {
                    console.log('\n🚀 Round 2 is complete! Deploying Round 3...');
                    deploymentAttempted = true;
                    
                    try {
                        const success = await deployRound3();
                        if (success) {
                            console.log('✅ Round 3 deployed successfully!');
                            clearInterval(monitor);
                        } else {
                            console.log('❌ Round 3 deployment failed - will retry next check');
                            deploymentAttempted = false; // Allow retry
                        }
                    } catch (error) {
                        console.error('❌ Deployment error:', error);
                        deploymentAttempted = false; // Allow retry
                    }
                } else if (!isFinalized) {
                    console.log('⏳ Round 2 still in progress...');
                }
            } else if (currentRoundId === 3) {
                console.log('✅ Round 3 is already active!');
                clearInterval(monitor);
            } else {
                console.log(`⚠️  Unexpected round ID: ${currentRoundId}`);
            }
            
        } catch (error) {
            console.error('Monitor error:', error);
        }
        
        console.log('');
    }, CHECK_INTERVAL);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping monitor...');
        clearInterval(monitor);
        process.exit(0);
    });
}

/**
 * Pre-generate Round 3 configuration for review
 */
async function pregenerateRound3() {
    console.log('🎲 Pre-generating Round 3 configuration...\n');
    
    try {
        const config = await generateRound3Config();
        
        console.log('✅ Configuration ready for Round 3:');
        console.log('=====================================');
        console.log(`Letters: ${config.letters}`);
        console.log(`Distribution: ${config.vowels} vowels, ${config.consonants} consonants`);
        console.log(`Hex: ${config.letterPool}`);
        console.log(`Valid Lengths: [${config.validLengths.join(', ')}]`);
        
        // Validate the letters
        console.log('\n🔍 Validation:');
        const validation = validateLetters(config.letters);
        
        if (validation.valid) {
            console.log('\n✅ Ready for deployment when Round 2 completes!');
            
            // Save for manual review
            const fs = require('fs');
            fs.writeFileSync('round3-preview.json', JSON.stringify(config, null, 2));
            console.log('💾 Preview saved to round3-preview.json');
        } else {
            console.log('\n❌ Configuration invalid - regenerate needed');
        }
        
        return config;
    } catch (error) {
        console.error('❌ Pre-generation failed:', error);
        return null;
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--monitor')) {
        // Start monitoring mode
        monitorAndDeploy();
    } else if (args.includes('--pregenerate')) {
        // Pre-generate configuration
        pregenerateRound3();
    } else if (args.includes('--manual-deploy')) {
        // Manual deployment (for testing)
        console.log('🚀 Manual Round 3 deployment...\n');
        deployRound3().then(success => {
            process.exit(success ? 0 : 1);
        });
    } else {
        // Show usage
        console.log('SpellBlock Round 3 Auto-Deployer');
        console.log('================================');
        console.log('');
        console.log('Commands:');
        console.log('  --monitor         Monitor Round 2 and auto-deploy Round 3');
        console.log('  --pregenerate     Generate and preview Round 3 configuration');
        console.log('  --manual-deploy   Deploy Round 3 immediately (testing only)');
        console.log('');
        console.log('Examples:');
        console.log('  node auto-deploy-round3.js --monitor');
        console.log('  node auto-deploy-round3.js --pregenerate');
    }
}

module.exports = { monitorAndDeploy, pregenerateRound3, isRoundFinalized };