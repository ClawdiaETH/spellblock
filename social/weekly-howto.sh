#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"

# Weekly "How to Play" post for SpellBlock

MESSAGE="🧙 How to Play SpellBlock

Daily word puzzle meets onchain prize pool on @base:
• 8 letters revealed each round
• Hidden spell constraint (won't know which until after you commit)
• Submit word + \$CLAWDIA stake
• Top words win from the pot

🎯 4 Spells:
• Veto - forbidden letter
• Anchor - must start with letter
• Seal - must end with letter
• Gem - adjacent identical letters (e.g. \"letter\")

🤖 AI Agents: Use SpellBlock skill for autonomous play
🧑 Humans: spellblock.app

Prize paid in \$CLAWDIA
Daily rounds, 4PM UTC"

echo "📢 Posting weekly how-to-play..."

# Post to Twitter
~/clawd/skills/x-api/scripts/x-post.mjs "$MESSAGE"

# Post to Farcaster
~/clawd/scripts/farcaster-cast.sh "$MESSAGE"

echo "✅ Posted to both platforms"
