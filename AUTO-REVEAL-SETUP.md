# SpellBlock Auto-Reveal Setup Guide

**Goal:** Eliminate manual reveals - backend automatically reveals all committed words

## ✅ What I Built

### 1. Database Schema (`database/schema.sql`)
- `commits` table: Stores encrypted words/salts
- `api_rate_limits` table: Prevents spam
- Indexes for fast lookups

### 2. Backend Infrastructure
- **Crypto utilities** (`backend/lib/crypto.ts`): AES-256-GCM encryption
- **Database client** (`backend/lib/db.ts`): PostgreSQL queries, rate limiting
- **API endpoint** (`frontend/src/app/api/commit/save/route.ts`): Saves encrypted commits

### 3. Auto-Reveal Bot
- **Script** (`backend/scripts/auto-reveal-all-words.ts`): Batch reveals all words
- **Wrapper** (`backend/scripts/auto-reveal-wrapper.sh`): Shell script for cron

### 4. Frontend Changes (TODO)
- Update CommitForm to call API after commit
- Remove manual reveal UI
- Show "Auto-reveal enabled" message

## 📋 Setup Steps

### Step 1: Database Setup (Neon)

```bash
# Create a new Neon database at https://neon.tech
# Or use existing Vercel Postgres

# Run schema
psql $DATABASE_URL < database/schema.sql
```

### Step 2: Environment Variables

Add to `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Encryption key (generate once, never change)
SPELLBLOCK_ENCRYPTION_KEY="<64 hex characters>"

# Private key (for auto-reveals)
PRIVATE_KEY="<your-private-key>"
```

Generate encryption key:
```bash
cd backend && npm install && npm run generate-key
```

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 4: Deploy Frontend + API

```bash
# Add env vars to Vercel
vercel env add DATABASE_URL
vercel env add SPELLBLOCK_ENCRYPTION_KEY

# Deploy
cd .. && vercel --prod
```

### Step 5: Test API

```bash
curl https://spellblock.app/api/commit/save
# Should return: {"status":"ok"}
```

### Step 6: Add Cron Job

```bash
# Make wrapper executable
chmod +x backend/scripts/auto-reveal-wrapper.sh

# Add to OpenClaw cron (00:10 UTC, 6:10pm CT)
# Runs 10 minutes after seed reveal
```

OpenClaw cron config:
```json
{
  "name": "spellblock-auto-reveal",
  "schedule": {"kind": "cron", "expr": "10 0 * * *", "tz": "UTC"},
  "sessionTarget": "main",
  "payload": {
    "kind": "systemEvent",
    "text": "exec ~/clawd/projects/clawdia-spellblock/backend/scripts/auto-reveal-wrapper.sh >> ~/clawd/logs/spellblock-auto-reveal.log 2>&1"
  }
}
```

### Step 7: Update Frontend (TODO)

Need to modify `CommitForm.tsx` to:

```typescript
// After successful commit transaction
const signature = await signMessage({ message: commitHash })

await fetch('/api/commit/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roundId: roundId.toString(),
    address,
    word,
    salt,
    commitHash,
    signature,
  })
})
```

## 🔒 Security

- **Encryption:** AES-256-GCM with authenticated encryption
- **Key Storage:** Server-side only, never exposed to frontend
- **Rate Limiting:** 5 commits/minute per address
- **Wallet Signatures:** Prevent spam commits
- **Unique Constraint:** One commit per round per player

## 🧪 Testing

### Test Encryption

```bash
cd backend
npx tsx -e "
import { encrypt, decrypt } from './lib/crypto.js'
const text = 'STRAINED'
const enc = encrypt(text)
console.log('Encrypted:', enc)
console.log('Decrypted:', decrypt(enc))
"
```

### Test Auto-Reveal (Dry Run)

```bash
# Set env vars
export DATABASE_URL="..."
export SPELLBLOCK_ENCRYPTION_KEY="..."
export PRIVATE_KEY="..."

# Run script
cd backend && npm run auto-reveal
```

## 🎯 User Flow (After Implementation)

### Before (Manual Reveals)
1. Player commits word during commit phase
2. Operator reveals seed
3. **Player must return** to manually reveal (many forget → forfeit)
4. Operator finalizes

### After (Auto-Reveals)
1. Player commits word during commit phase
2. ✨ **Backend saves encrypted word automatically**
3. Operator reveals seed
4. ✨ **Bot reveals all words automatically** (no player action needed)
5. Operator finalizes

**Result:** Players never need to come back. Zero friction, zero forfeits.

## 📊 Monitoring

Logs location: `~/clawd/logs/spellblock-auto-reveal.log`

Check status:
```bash
tail -f ~/clawd/logs/spellblock-auto-reveal.log
```

Database queries:
```sql
-- Check unrevealed commits
SELECT round_id, COUNT(*) FROM commits WHERE revealed = FALSE GROUP BY round_id;

-- Recent reveals
SELECT round_id, player_address, revealed_at FROM commits WHERE revealed = TRUE ORDER BY revealed_at DESC LIMIT 10;
```

## ⚠️ Important Notes

1. **Never change SPELLBLOCK_ENCRYPTION_KEY** after deploying - you won't be able to decrypt existing commits
2. **Keep database backups** - encrypted data is unrecoverable without the key
3. **Monitor auto-reveal logs** - ensure bot runs successfully after each seed reveal
4. **Gas costs:** Bot pays for all reveals (can batch optimize later)

## 🚀 Next Steps

1. ✅ Database schema created
2. ✅ Backend infrastructure built
3. ✅ API endpoint created
4. ✅ Auto-reveal script written
5. ⏳ Setup Neon database
6. ⏳ Add env vars to Vercel
7. ⏳ Deploy frontend + API
8. ⏳ Update CommitForm
9. ⏳ Add cron job
10. ⏳ Test with Round 2

---

**Ready to deploy!** All code is written, just needs database + env vars configured.
