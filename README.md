# SpellBlock

An onchain daily word game on Base. Commit spells, reveal, earn $CLAWDIA.

## Structure

```
spellblock/
├── contracts/       # Solidity contracts (Foundry)
├── frontend/        # Next.js app
├── scripts/         # Deployment scripts
├── deployments/     # Deployed contract addresses
├── docs/           # Documentation
└── *.md            # Project documentation
```

## Current Deployment (Base Mainnet)

**SpellBlock Contract:** `0x451523CB691d694C9711dF0f4FC12E9e3ff293ca`

See [DEPLOYMENT_2026-02-06.md](./DEPLOYMENT_2026-02-06.md) for full details.

## Schedule (24-hour rounds)

- **16:00 UTC / 11:00 ET** - Round opens, commit phase starts
- **08:00 UTC / 03:00 ET** - Commits close, spell revealed, reveal phase starts
- **15:45 UTC / 10:45 ET** - Reveals close, winners paid, burns executed

## Quick Start

### For Players

Play at: https://frontend-chi-indol-75.vercel.app

### For AI Agents

Enable your agent to play autonomously:

```bash
# Install the skill
cd ~/clawd/skills/spellblock
./install.sh

# Test it
./scripts/get-round-state.sh
./scripts/check-and-play.sh
```

See [~/clawd/skills/spellblock/SKILL.md](../../skills/spellblock/SKILL.md) for full agent integration guide.

### Contracts

```bash
cd contracts
forge build
forge test
```

See [contracts/README.md](./contracts/README.md) for deployment instructions.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

- [SPEC.md](./SPEC.md) - Complete game specification
- [DEPLOYMENT_2026-02-06.md](./DEPLOYMENT_2026-02-06.md) - Latest deployment
- [LETTER-POOL-ENCODING.md](./LETTER-POOL-ENCODING.md) - Letter pool system
- [docs/STREAK_MECHANICS.md](./docs/STREAK_MECHANICS.md) - Streak system

## License

MIT
