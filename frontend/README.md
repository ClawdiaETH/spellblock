# SpellBlock Frontend v3

A mystical Next.js frontend for SpellBlock - the commit-reveal word game by Clawdia.

> **Now featuring the complete v3 spec with daily rounds, dual constraints, and enhanced UX!**

## ✨ New in v3

- 🎯 **Daily Rounds**: Fixed 12-hour cycles starting 16:00 UTC
- 🎭 **Double Reveal**: Spell + ruler lengths revealed simultaneously at midnight
- 🔥 **Live Burn Counter**: Real-time tracking of $CLAWDIA permanently destroyed
- 📊 **Activity Feed**: Watch commits happen live (stakes visible, words hidden)
- 🏆 **Season Leaderboards**: 14-day competitive seasons with rewards
- 💎 **Enhanced Pot Tracker**: HERO element with jackpot indicators
- 📏 **Ruler Display**: Shows Clawdia's 3 valid word lengths after reveal

## 🎮 Game Mechanics

### The Four Spells
- **Veto**: Word must NOT contain [letter]
- **Anchor**: Word must START with [letter] 
- **Seal**: Word must END with [letter]
- **Gem**: Word must have adjacent identical letters

### Daily Schedule (UTC)
- **16:00**: Round opens (letter pool revealed, constraints hidden)
- **00:00**: Commit phase closes → **DOUBLE REVEAL** (spell + ruler)
- **04:00**: Reveal phase closes → Winners paid, burn executed

### Winning Strategy
Your word must survive BOTH hidden constraints:
1. **Spell constraint** (1 of 4 spells)
2. **Ruler constraint** (word length must match 1 of 3 valid lengths)

## 🚀 Features

- 🔮 **Mystical UI**: Glass panels, particle effects, runic animations
- ⚡ **Real-time Updates**: Live pot tracking and activity feeds
- 🎯 **Interactive Gameplay**: Letter pool selection and word building
- 🌊 **Wallet Integration**: Seamless $CLAWDIA transactions
- 📱 **Responsive Design**: Perfect on mobile and desktop
- 🎨 **Spell Theming**: Visual effects matching each spell type

## 🛠 Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Full type safety
- **Tailwind CSS** - Custom mystical styling system
- **Wagmi v2** - Ethereum interactions with Base mainnet
- **Viem** - Modern Ethereum client
- **ConnectKit** - Premium wallet connection

## 🏗 Getting Started

1. **Clone & Install**:
```bash
git clone https://github.com/ClawdiaETH/spellblock-frontend
cd spellblock-frontend
npm install
```

2. **Run Development Server**:
```bash
npm run dev
```

3. **Visit**: [http://localhost:3000](http://localhost:3000)

## 🔗 Smart Contracts

**Base Mainnet Integration**:
- **$CLAWDIA Token**: `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07`
- **Min Stake**: 1,000,000 $CLAWDIA

**v3 Multi-Contract Architecture** (addresses TBD):
- `SpellBlockCore`: Main game logic and round management
- `SpellBlockTreasury`: Pot custody, payouts, and burn tracking
- `SpellBlockScoring`: Word validation and leaderboards
- `StreakTracker`: Player streak bonuses
- `SeasonAccumulator`: 14-day season competitions

## 📁 Project Structure

```
src/
├── components/
│   ├── ActivityFeed.tsx       # Live commit activity
│   ├── BurnCounter.tsx        # Cumulative $CLAWDIA burned
│   ├── GameBoard.tsx          # Main game interface
│   ├── PotDisplay.tsx         # HERO pot tracker
│   ├── RulerDisplay.tsx       # Valid word lengths
│   └── SeasonLeaderboard.tsx  # Competitive standings
├── config/
│   ├── contracts.ts           # ABIs and addresses
│   └── wagmi.ts               # Base mainnet config
└── app/
    ├── page.tsx               # Landing page
    ├── layout.tsx             # App structure
    └── globals.css            # Mystical styling
```

## 🎯 What Makes v3 Special

### For Players
- **Predictable Schedule**: Daily rounds at the same time create habit
- **Strategic Depth**: Two hidden constraints require complex hedging
- **Social Drama**: Live activity feed builds community tension
- **Seasonal Competition**: Long-term leaderboards and rewards
- **Visual Polish**: Every interaction feels magical and premium

### For Developers
- **Modular Components**: Each UI element cleanly separated
- **Type Safety**: Full TypeScript coverage with contract types
- **Event-Driven**: Real-time updates via wagmi event listeners
- **Responsive Architecture**: Works beautifully on all devices
- **Production Ready**: Optimized builds and deployment-ready

## 🌟 Key Innovations

1. **Double Reveal Drama**: The midnight moment when both spell and ruler are revealed simultaneously creates peak tension

2. **Live Pot Psychology**: Watching the pot grow in real-time with commit activity creates organic FOMO without exploitative mechanics

3. **Skill-Forward Design**: Both constraints are skill-based (word knowledge + hedging strategy), not luck-based

4. **Seasonal Meta**: 14-day seasons create long-term engagement beyond daily rounds

5. **Deflationary Mechanics**: Burn counter shows the permanent $CLAWDIA destruction, creating marketing value

## 🎨 Design Philosophy

SpellBlock combines the strategic depth of word games with the social dynamics of online poker. The mystical theming (glass panels, particle effects, runic animations) creates an otherworldly atmosphere that matches Clawdia's persona.

Every UI decision supports the core game loop: commit with uncertainty, experience the dramatic reveal, compete for prizes.

## 🔮 Built by Clawdia

This is Clawdia's game - a deflationary word game that rewards vocabulary mastery and strategic thinking. Built for the Base ecosystem with love for language and competition.

**Ready to cast your first spell?** 🐚

## 📄 License

MIT - Build upon this mystical foundation!