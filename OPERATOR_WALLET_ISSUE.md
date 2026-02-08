# Operator Wallet Issue - Round 2 Reveal Blocked

## Problem

SpellBlock Round 2 cannot be revealed because the operator wallet changed after deployment.

- **Contract operator**: `0x84d5e34Ad1a91cF2ECAD071a65948fa48F1B4216`
- **Current signing_key**: `0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9`

The `revealSeedAndRuler()` function requires operator privileges, but the signing_key file was rotated after deployment (Feb 8, 01:23).

## Impact

- Round 2 spell & ruler are not visible
- Players can't see Veto letter or valid lengths
- Frontend shows incorrect spell data (all zeros)
- HOOF commit can't be properly validated

## Solutions

### Option A: Use Original Deployment Wallet

If you have the original private key for `0x84d5e34Ad1a91cF2ECAD071a65948fa48F1B4216`:

```bash
# Temporarily restore old key
cp ~/.clawdbot/secrets/signing_key ~/.clawdbot/secrets/signing_key.backup
echo "OLD_PRIVATE_KEY_HERE" > ~/.clawdbot/secrets/signing_key

# Reveal
~/clawd/projects/spellblock-unified/scripts/reveal-seed-and-ruler.sh

# Restore new key
mv ~/.clawdbot/secrets/signing_key.backup ~/.clawdbot/secrets/signing_key
```

### Option B: Update Operator Address

Use the owner wallet (also `0x84d5e...`) to set the new operator:

```bash
# If you have the original deployment wallet
cast send 0xcc6033675b338005c6f1322feb7e43c5ed612257 \
  "setOperator(address)" \
  0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9 \
  --private-key OLD_PRIVATE_KEY \
  --rpc-url https://mainnet.base.org

# Then reveal with new wallet
~/clawd/projects/spellblock-unified/scripts/reveal-seed-and-ruler.sh
```

### Option C: Manual Reveal (Fallback)

If neither wallet is available, manually call the contract:

```bash
cast send 0xcc6033675b338005c6f1322feb7e43c5ed612257 \
  "revealSeedAndRuler(bytes32,uint8[3],bytes32)" \
  0x60767f06f84779d359d21bea4e04e2063455250e72833fbb270edc791537a492 \
  "[4,5,8]" \
  0x32d866fa0b9e51be2a3a97868c9fdfa9b290835b0099f6e940076d6104206baa \
  --private-key OPERATOR_PRIVATE_KEY \
  --rpc-url https://mainnet.base.org
```

## Secrets File

Round 1 secrets (used for Round 2):
```
Seed: 60767f06f84779d359d21bea4e04e2063455250e72833fbb270edc791537a492
Ruler Salt: 32d866fa0b9e51be2a3a97868c9fdfa9b290835b0099f6e940076d6104206baa
Valid Lengths: 4 5 8
Letter Pool: WIYQOFHB
```

## Frontend Fixes Applied

✅ Fixed consolation vs burned display
✅ Added three-state logic (winner/consolation/burned)
✅ Proper styling for all three outcomes

Once the seed is revealed, the frontend will correctly show:
- **HOOF**: Passes Veto (no "A"), Fails Ruler (4 letters ≠ [4,5,8]) → **Consolation** (recover 3M CLAWDIA)

## Prevention

For future rounds:
1. Always deploy + reveal with the same wallet
2. Or immediately call `setOperator()` after deployment if changing keys
3. Document operator wallet in deployments/base-mainnet.json
