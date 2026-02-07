# SpellBlock → Farcaster Mini App: Implementation Specification

> **For: Clawdia**
> **From: Jake**
> **Date: February 4, 2026**
> **Status: Ready for Implementation**

---

## Overview

SpellBlock is live at https://spellblock.vercel.app/ with active players. This spec covers converting SpellBlock into a **Farcaster mini app** so users can play directly inside Warpcast/Farcaster clients. Players in the mini app must participate in **the same rounds** as web users — this is a single shared game, not a separate instance.

The mini app must take full advantage of Farcaster/Neynar capabilities: native wallet integration, CLAWDIA token swaps, social sharing via casts, and push notifications for round events.

---

## ⚠️ CRITICAL: Read Before Implementing

**DO NOT** hallucinate or fabricate SDK methods, APIs, or features. If something in this spec seems unclear, refer to the official docs at https://miniapps.farcaster.xyz/ or the LLM-friendly version at https://miniapps.farcaster.xyz/llms-full.txt

**DO NOT** invent notification APIs, wallet methods, or authentication flows that don't exist in the official SDK.

**DO NOT** use `fc:frame` meta tags — that's the legacy Frames v1 format. We use `fc:miniapp` for Mini Apps.

**DO NOT** use `WidthType.PERCENTAGE` for any UI element — it breaks in some clients.

---

## 1. SDK Installation & Setup

### Package Installation

```bash
npm install @farcaster/miniapp-sdk
npm install @farcaster/miniapp-wagmi-connector
```

**Optional but recommended** — Neynar's React wrapper adds analytics and managed services:
```bash
npm install @neynar/react
```

### CRITICAL: Calling `ready()`

**This is the #1 most common cause of broken mini apps.** If you don't call `ready()`, users see an infinite loading/splash screen forever.

```javascript
import { sdk } from '@farcaster/miniapp-sdk'

// Call this AFTER the app is fully loaded and interactive
// Not on mount — after data is fetched and UI is rendered
await sdk.actions.ready()
```

**When to call it:**
- AFTER your React component tree has mounted
- AFTER any critical data (current round info, user state) has loaded
- AFTER the UI is ready for user interaction

**Pseudocode for a Next.js/React app:**
```javascript
import { sdk } from '@farcaster/miniapp-sdk'
import { useEffect, useState } from 'react'

function SpellBlockApp() {
  const [roundData, setRoundData] = useState(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    async function init() {
      // Fetch current round data
      const data = await fetchCurrentRound()
      setRoundData(data)
      
      // NOW call ready - app is loaded and interactive
      await sdk.actions.ready()
      setIsReady(true)
    }
    init()
  }, [])

  if (!isReady) return <LoadingSpinner />
  return <GameBoard round={roundData} />
}
```

### Context Detection

The app must work both as a standalone website AND as a Farcaster mini app. Detect the environment:

```javascript
import { isInMiniApp } from '@farcaster/miniapp-sdk'

if (isInMiniApp()) {
  // Running inside Warpcast/Farcaster client
  // Use mini app features (wallet, casting, etc.)
  // Hide external wallet connect buttons
} else {
  // Running as standalone web app
  // Show standard web UI with existing wallet connectors
}
```

**Launch context** tells you HOW the user opened the mini app:
```javascript
// sdk.context.location will be one of:
// 'cast_embed'    — User tapped an embedded mini app in a cast
// 'cast_share'    — User opened from a shared cast
// 'notification'  — User tapped a push notification
// 'launcher'      — User opened from the mini app launcher/store
// 'channel'       — User opened from a channel
```

---

## 2. Authentication

### Quick Auth (Recommended — Simplest)

```javascript
import { sdk } from '@farcaster/miniapp-sdk'

// Get an auth token — auto-refreshes, includes user FID
const token = await sdk.quickAuth.getToken()
```

### User Context

Once authenticated, user info is available:

```javascript
const user = sdk.context.user
// user.fid         — Farcaster ID (unique numeric identifier)
// user.username    — e.g. "jake"
// user.displayName — e.g. "Jake"
// user.pfpUrl      — Profile picture URL
```

### Backend Integration for Shared Rounds

**CRITICAL REQUIREMENT**: Mini app users and web users MUST participate in the same rounds.

The backend needs to support **dual identification**:

```
Mini app users → identified by FID (Farcaster ID)
Web users      → identified by wallet address or session ID
```

**Implementation approach:**
1. When a mini app user commits a word, send their FID + wallet address to the backend
2. Backend stores the commitment associated with both identifiers
3. Leaderboards, round results, and game state show ALL players regardless of platform
4. The round state is stored server-side, never client-specific

**DO NOT** create separate round instances for mini app vs. web users. There is ONE game with ONE round at a time.

---

## 3. Wallet Integration with Wagmi

### Configuration

```javascript
import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterMiniApp()
  ]
})
```

**Key behaviors:**
- If the user already has a connected wallet in Warpcast, the connector **auto-connects** (`isConnected` will be `true` immediately)
- You do NOT need a "Connect Wallet" button in most cases inside the mini app
- Use standard Wagmi hooks: `useAccount`, `useSendTransaction`, `useSendCalls`

### Supported Chains

Base (primary — this is what we use), Ethereum, Optimism, Arbitrum, Polygon, Zora, Unichain.

### Conditional Wallet UI

```javascript
import { isInMiniApp } from '@farcaster/miniapp-sdk'
import { useAccount } from 'wagmi'

function WalletSection() {
  const { address, isConnected } = useAccount()

  if (isInMiniApp()) {
    // Wallet auto-connects in mini app — just show address
    // Hide any external wallet connect UI (WalletConnect, MetaMask, etc.)
    return isConnected ? <WalletInfo address={address} /> : <ConnectPrompt />
  } else {
    // Standard web — show existing wallet connect buttons
    return <ExistingWebWalletUI />
  }
}
```

### Batch Transactions (EIP-5792)

The Farcaster Wallet supports `wallet_sendCalls` for batching multiple transactions into a single user confirmation. This is useful for "approve + swap" patterns:

```javascript
import { useSendCalls } from 'wagmi'
import { encodeFunctionData, parseUnits } from 'viem'

function ApproveAndStake() {
  const { sendCalls } = useSendCalls()

  const handleApproveAndStake = () => {
    sendCalls({
      calls: [
        // Step 1: Approve CLAWDIA tokens
        {
          to: '0xbbd9aDe16525acb4B336b6dAd3b9762901522B07', // CLAWDIA token
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [SPELLBLOCK_CONTRACT, parseUnits('100', 18)]
          })
        },
        // Step 2: Stake CLAWDIA tokens
        {
          to: SPELLBLOCK_CONTRACT,
          data: encodeFunctionData({
            abi: spellblockAbi,
            functionName: 'commitWord',
            args: [commitHash, stakeAmount]
          })
        }
      ]
    })
  }

  return <button onClick={handleApproveAndStake}>Commit & Stake</button>
}
```

---

## 4. CLAWDIA Token Swap Feature

Allow users to swap into CLAWDIA tokens directly within the mini app using the native Farcaster swap UI:

```javascript
import { sdk } from '@farcaster/miniapp-sdk'

async function swapForClawdia() {
  try {
    const result = await sdk.actions.swapToken({
      // Sell token: USDC on Base (CAIP-19 format)
      sellToken: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      
      // Buy token: CLAWDIA on Base (CAIP-19 format)
      buyToken: 'eip155:8453/erc20:0xbbd9aDe16525acb4B336b6dAd3b9762901522B07',
      
      // Amount in smallest unit (1 USDC = 1000000, since 6 decimals)
      sellAmount: '1000000',
    })
    
    // result.transactions — array of tx hashes (may include approval + swap)
    console.log('Swap txs:', result.transactions)
  } catch (error) {
    // User cancelled or swap failed
    if (error.error === 'rejected_by_user') {
      // User cancelled — do nothing
    } else {
      console.error('Swap failed:', error.message)
    }
  }
}
```

**IMPORTANT NOTES on `swapToken`:**
- Use **CAIP-19 format** for token addresses: `eip155:{chainId}/erc20:{address}`
- Chain ID 8453 = Base
- The user CAN modify the swap before executing (change amounts, etc.)
- The function returns transaction hashes, not the swap result — you may need to watch the chain for confirmation
- CLAWDIA token address on Base: `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07`

### Swap UI Placement

Add a prominent "Get CLAWDIA" or "Swap for CLAWDIA" button in the game UI, especially:
- On the staking screen before committing a word
- In a wallet/token balance section
- As a CTA when the user doesn't have enough CLAWDIA to stake

---

## 5. Social Sharing — Compose Cast

Let players share their results as Farcaster casts:

```javascript
import { sdk } from '@farcaster/miniapp-sdk'

async function shareResult(score, roundNumber) {
  try {
    const result = await sdk.actions.composeCast({
      text: `🎯 I scored ${score} points in SpellBlock Round ${roundNumber}!\n\nThink you can beat me?`,
      embeds: ['https://spellblock.vercel.app/'],
      channelKey: 'games' // optional — posts to /games channel
    })
    
    // IMPORTANT: result.cast CAN BE NULL if user cancelled
    if (result.cast) {
      console.log('Cast published:', result.cast.hash)
    } else {
      // User cancelled — don't show error
    }
  } catch (error) {
    console.error('Cast failed:', error)
  }
}
```

**⚠️ DEFENSIVE NOTE**: Always check `result.cast` for null. The user can cancel the cast dialog, which returns a result but with `cast: null`. Do NOT treat this as an error.

### When to Show Share Buttons

- After a round resolves and the player sees their score
- On the leaderboard (share ranking position)
- After a particularly good play (optional gamification)

---

## 6. Embed Meta Tags

For SpellBlock links shared in casts to show a rich preview with a "Play" button, add this meta tag to the HTML `<head>`:

```html
<meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://spellblock.vercel.app/og-image.png","button":{"title":"Play Now","action":{"type":"launch_frame","name":"SpellBlock","url":"https://spellblock.vercel.app/","splashImageUrl":"https://spellblock.vercel.app/splash.png","splashBackgroundColor":"#f5f0ec"}}}' />
```

**Requirements for the images:**
- `imageUrl` — OG image displayed in feed, 3:2 aspect ratio
- `splashImageUrl` — Shown while app loads (before `ready()` is called)
- Both must be publicly accessible HTTPS URLs

**DO NOT** also include an `fc:frame` tag. Use `fc:miniapp` only.

---

## 7. Notifications

### Manifest File

Create `/.well-known/farcaster.json` in the public root of the app:

```json
{
  "accountAssociation": {
    "header": "GENERATE_THIS_VIA_FARCASTER_DEV_TOOLS",
    "payload": "GENERATE_THIS_VIA_FARCASTER_DEV_TOOLS",
    "signature": "GENERATE_THIS_VIA_FARCASTER_DEV_TOOLS"
  },
  "miniapp": {
    "version": "1",
    "name": "SpellBlock",
    "iconUrl": "https://spellblock.vercel.app/icon.png",
    "homeUrl": "https://spellblock.vercel.app/",
    "imageUrl": "https://spellblock.vercel.app/og-image.png",
    "buttonTitle": "Play Now",
    "splashImageUrl": "https://spellblock.vercel.app/splash.png",
    "splashBackgroundColor": "#f5f0ec",
    "webhookUrl": "https://spellblock.vercel.app/api/webhook"
  }
}
```

**To generate `accountAssociation`**: Use the Farcaster developer tools at https://farcaster.xyz/~/settings/developer-tools → Mini Apps → Manifest. This ties the app to your Farcaster account.

### Webhook Endpoint

Create `/api/webhook` to receive notification events:

```javascript
// /api/webhook.js (or .ts)
export async function POST(request) {
  const body = await request.json()
  const { event, data } = body

  switch (event) {
    case 'miniapp_added':
      // User added the mini app — store their notification token
      // data.fid — user's Farcaster ID
      // data.notificationToken — token for sending push notifications
      // data.notificationUrl — URL to POST notifications to
      await storeNotificationToken(data.fid, data.notificationToken, data.notificationUrl)
      break

    case 'miniapp_removed':
      // User removed the app — invalidate their tokens
      await removeNotificationTokens(data.fid)
      break

    case 'notifications_enabled':
      // User re-enabled notifications — store new token
      await storeNotificationToken(data.fid, data.notificationToken, data.notificationUrl)
      break

    case 'notifications_disabled':
      // User disabled notifications — invalidate tokens
      await invalidateNotificationTokens(data.fid)
      break
  }

  return new Response('OK', { status: 200 })
}
```

### Sending Notifications

When a round completes, new round starts, or other game events occur:

```javascript
async function notifyRoundComplete(roundNumber, results) {
  // Get all users with valid notification tokens
  const subscribers = await getNotificationSubscribers()

  // Batch up to 100 tokens per request
  for (const batch of chunkArray(subscribers, 100)) {
    const tokens = batch.map(s => s.notificationToken)
    const notificationUrl = batch[0].notificationUrl // Same for all users on same host

    await fetch(notificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: `round_${roundNumber}_complete`,
        title: 'Round Complete! 🎯',
        body: `Round ${roundNumber} results are in! Check your score.`,
        targetUrl: `https://spellblock.vercel.app/round/${roundNumber}`,
        tokens: tokens
      })
    })
  }
}
```

**Rate Limits:**
- 1 notification per 30 seconds per token
- 100 notifications per day per token
- Batch up to 100 tokens per request

**Notification Use Cases for SpellBlock:**
- New round started
- Round reveal complete / results available
- Player climbed the leaderboard
- Reminder to commit before round closes (if they haven't played)

### Alternative: Neynar Managed Notifications

If you don't want to run webhook infrastructure, Neynar can manage it:
```bash
npm install @neynar/react
```
Neynar handles token storage, webhook events, and notification delivery. Check https://docs.neynar.com/docs/convert-web-app-to-mini-app for setup.

---

## 8. Implementation Checklist

### Phase 1: Core Integration
- [ ] Install `@farcaster/miniapp-sdk` and `@farcaster/miniapp-wagmi-connector`
- [ ] Add `sdk.actions.ready()` call after app loads (**TEST THIS FIRST — most common failure**)
- [ ] Implement `isInMiniApp()` context detection
- [ ] Implement Quick Auth for user identification
- [ ] Ensure existing web functionality is preserved when NOT in mini app
- [ ] Test in Mini App Debug Tool: https://farcaster.xyz/~/developers/mini-apps/preview

### Phase 2: Wallet & Transactions
- [ ] Setup Wagmi config with `farcasterMiniApp()` connector for Base chain
- [ ] Verify wallet auto-connects in mini app environment
- [ ] Add `swapToken` action for CLAWDIA purchases (CAIP-19 format)
- [ ] Implement batch transactions if needed (approve + stake in one step)
- [ ] Hide external wallet connectors (MetaMask, WalletConnect) when in mini app
- [ ] Test wallet connection and token swaps

### Phase 3: Social Features
- [ ] Add `composeCast` for sharing game results
- [ ] Handle cast cancellation (result.cast === null)
- [ ] Add `fc:miniapp` meta tag to HTML `<head>`
- [ ] Create OG image (3:2 ratio) and splash image
- [ ] Test social sharing from within the mini app

### Phase 4: Notifications
- [ ] Create `/.well-known/farcaster.json` manifest
- [ ] Generate `accountAssociation` via Farcaster dev tools
- [ ] Create `/api/webhook` endpoint
- [ ] Implement webhook event handlers (added, removed, enabled, disabled)
- [ ] Implement notification sending for round events
- [ ] Test full notification flow

### Phase 5: Backend Integration
- [ ] Ensure backend supports FID-based user identification alongside wallet addresses
- [ ] Verify shared round state works for both web + mini app users
- [ ] Add real-time updates (WebSocket or polling) for cross-platform play
- [ ] Test: web user and mini app user in the same round simultaneously
- [ ] Leaderboard shows all participants regardless of platform

### Phase 6: Production
- [ ] Deploy to production domain (spellblock.vercel.app)
- [ ] Register manifest at https://farcaster.xyz/~/developers/mini-apps/manifest
- [ ] Verify manifest signature
- [ ] Test all features in production Warpcast client
- [ ] Verify Node.js 22.11.0+ (earlier versions not supported by SDK)

---

## 9. Testing & Debugging

### Enable Developer Mode
1. Visit https://farcaster.xyz/~/settings/developer-tools
2. Toggle on "Developer Mode"

### Preview Tool
Test your mini app without deploying:
```
https://farcaster.xyz/~/developers/mini-apps/preview?url=https://spellblock.vercel.app/
```

### Local Development with Tunnels
```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```
**IMPORTANT**: Open the tunnel URL directly in your browser first to whitelist it for iframe usage.

**Note**: `addMiniApp()` and manifest-dependent features require a production domain — they won't work with tunnel URLs.

### Common Issues & Solutions

| Problem | Cause | Fix |
|---------|-------|-----|
| Infinite loading screen | Missing `sdk.actions.ready()` | Call `ready()` after app is fully loaded |
| Tunnel URL not working | Not whitelisted | Open tunnel URL in browser first |
| Node.js errors | Wrong version | Use Node.js 22.11.0+ |
| Wallet not connecting | Missing connector | Use `farcasterMiniApp()` from wagmi connector package |
| Swap failing | Wrong token format | Use CAIP-19 format: `eip155:8453/erc20:0x...` |
| Cast returning null | User cancelled | Check `result.cast !== null` before processing |

---

## 10. Architecture Summary

```
┌─────────────────────────────────────────────────┐
│                  SpellBlock App                   │
│                                                   │
│  ┌──────────────┐        ┌──────────────────┐    │
│  │  Web Mode    │        │  Mini App Mode    │    │
│  │              │        │                   │    │
│  │ Standard     │        │ Farcaster SDK     │    │
│  │ wallet       │        │ Quick Auth        │    │
│  │ connectors   │        │ Auto-connect      │    │
│  │              │        │ wallet            │    │
│  │ Standard     │        │ composeCast       │    │
│  │ sharing      │        │ swapToken         │    │
│  └──────┬───────┘        └────────┬──────────┘    │
│         │                         │               │
│         └─────────┬───────────────┘               │
│                   │                               │
│          ┌────────▼────────┐                      │
│          │  Shared Backend  │                      │
│          │                  │                      │
│          │  Same rounds     │                      │
│          │  Same state      │                      │
│          │  Same leaderboard│                      │
│          │                  │                      │
│          │  User ID:        │                      │
│          │  FID (mini app)  │                      │
│          │  OR              │                      │
│          │  Wallet (web)    │                      │
│          └──────────────────┘                      │
└─────────────────────────────────────────────────┘
```

---

## 11. Resources

- **Official Mini App Docs**: https://miniapps.farcaster.xyz/
- **LLM-Friendly Docs** (use this for reference): https://miniapps.farcaster.xyz/llms-full.txt
- **Code Examples**: https://github.com/farcasterxyz/miniapps/tree/main/examples
- **Neynar Integration Guide**: https://docs.neynar.com/docs/convert-web-app-to-mini-app
- **Manifest Audit Tool**: Farcaster developer settings
- **Developer Rewards**: https://farcaster.xyz/~/developers/rewards

---

## 12. What NOT To Do (Defensive Reminders)

1. **DO NOT** create a separate game instance for mini app users. ONE game, ONE round, all players together.
2. **DO NOT** forget `sdk.actions.ready()`. Test this first. If the splash screen persists, this is why.
3. **DO NOT** use `fc:frame` meta tags. Use `fc:miniapp` only.
4. **DO NOT** fabricate SDK methods that don't exist. Refer to the official docs.
5. **DO NOT** hardcode wallet addresses without CAIP-19 format for swap features.
6. **DO NOT** assume `composeCast` always succeeds. The user can cancel. Check for null.
7. **DO NOT** send more than 100 notification tokens per request or exceed rate limits.
8. **DO NOT** use tunnel domains (ngrok, replit.dev, cloudflared) for production features.
9. **DO NOT** show Farcaster-specific UI elements (swap button, share cast) when running as a web app.
10. **DO NOT** skip the manifest `accountAssociation` — it must be generated via Farcaster dev tools, not fabricated.
