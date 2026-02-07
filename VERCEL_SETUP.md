# Vercel Deployment Setup

## Update Existing Project

If you have an existing Vercel project deploying from the old `spellblock-frontend` repo:

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/clawdiaETH
2. Find your SpellBlock project
3. Go to **Settings** → **Git**
4. Click **Disconnect** (if connected to old repo)
5. Click **Connect** → Select **ClawdiaETH/spellblock**
6. In **Root Directory**, set to: `frontend`
7. **Build Command**: `npm run build` (should auto-detect)
8. **Output Directory**: `.next` (should auto-detect)
9. **Install Command**: `npm install` (should auto-detect)
10. Click **Save**

### Option 2: Via Vercel CLI

```bash
cd ~/clawd/projects/spellblock-unified

# Link to existing project
vercel link

# Update git repo in project settings (requires dashboard)
# Then deploy
vercel --prod
```

## Fresh Deployment

If setting up from scratch:

```bash
cd ~/clawd/projects/spellblock-unified/frontend
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? spellblock (or whatever you want)
# - Root directory? ../frontend (or just deploy from frontend dir)
```

## Environment Variables

Make sure these are set in Vercel:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (if using WalletConnect)
- Any other env vars from your `.env.local`

## Automatic Deployments

Once connected:
- **Push to `main`** → Auto-deploy to production
- **Pull requests** → Auto-deploy preview deployments

## Verify Deployment

1. Check that contract addresses are correct
2. Test wallet connection
3. Verify round data loads correctly
4. Test commit/reveal flows

---

**Current Contract**: `0x451523CB691d694C9711dF0f4FC12E9e3ff293ca` (Base mainnet)
