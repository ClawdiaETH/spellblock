# SpellBlock UI redesign — Implementation guide

You are updating the SpellBlock frontend to a clean, light-mode redesign inspired by NYT Wordle's minimalism and polish. This document is the complete spec. The reference implementation is in `spellblock-redesign.jsx` — use it as your source of truth for layout, component structure, and styling values.

---

## 1. Design philosophy

SpellBlock is NOT a Wordle clone. There is no 6×5 grid, no multiple guesses, no letter-by-letter color feedback. It is a **commit-reveal staking game** where players craft ONE word from an 8-letter pool, stake $CLAWDIA tokens, and hope it survives hidden constraints revealed at midnight UTC.

Every UI decision should support this flow:
- **Commit with uncertainty** → dramatic reveal → compete for prizes
- The pot display is the HERO element — it's what draws players in
- Hidden constraints create tension during commit phase
- The double reveal at midnight is the emotional peak

Design principles borrowed from successful word games:
- Game board front-and-center, no distractions
- Progressive disclosure (don't overwhelm new players)
- "How to play" modal for onboarding, not inline tutorials
- Share-worthy results
- Clean, minimal chrome — the content IS the interface

---

## 2. Color system — Light mode

All colors use CSS custom properties. The palette is warm and paper-like, not sterile white.

```css
:root {
  --bg: #F6F5F1;           /* warm off-white page background */
  --surface: #FFFFFF;       /* card/panel backgrounds */
  --surface-2: #EEECE7;    /* secondary surfaces, inputs */
  --border: #D8D5CC;        /* soft warm gray borders */
  --text: #1A1A1F;          /* primary text */
  --text-dim: #7C7A72;      /* muted/secondary text */
  --accent: #2B6CB0;        /* primary action blue */
  --accent-glow: #2B6CB030; /* subtle blue shadow */
  --green: #16A34A;         /* success, pass */
  --red: #DC2626;           /* fail, burn */
  --gold: #D97706;          /* gold accents, ruler */
  --purple: #7C3AED;        /* reveal phase accent */
}
```

### Spell-specific colors

| Spell  | Color   | Usage                          |
|--------|---------|--------------------------------|
| Veto   | #DC2626 | Red — danger, exclusion        |
| Anchor | #2B6CB0 | Blue — stability, start        |
| Seal   | #7C3AED | Purple — lock, end             |
| Gem    | #D97706 | Gold — treasure, doubles       |
| Ruler  | #D97706 | Gold (same as Gem)             |

### Shadow philosophy

Light mode uses subtle, soft shadows — never heavy dark-mode glows:
- Buttons: `box-shadow: 0 3px 12px {color}20`
- Cards: borders only, no shadow (let `--border` do the work)
- Modals: `box-shadow: 0 8px 28px rgba(0,0,0,0.12)`
- Overlay backdrop: `rgba(0,0,0,0.25)` — not 0.5

### Phase banner gradients

- Commit phase: `linear-gradient(135deg, #E8F0FE 0%, #F0F4FF 100%)` (soft blue tint)
- Reveal phase: `linear-gradient(135deg, #F0EAFE 0%, #F5F0FF 100%)` (soft purple tint)

---

## 3. Typography

Three font families, each with a specific role:

| Font              | Role           | Usage                                      |
|-------------------|----------------|---------------------------------------------|
| Instrument Serif  | Display        | Section titles, modal titles, panel titles  |
| DM Sans           | Body           | Everything else — labels, descriptions, UI  |
| JetBrains Mono    | Data/Code      | Numbers, addresses, timers, letter tiles    |

Import:
```
https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap
```

### Text style rules

- **All titles use sentence case.** "Letter pool" not "Letter Pool". "How to play" not "How to Play". This applies everywhere — section headers, buttons, modal titles, rule step titles, labels.
- Section titles: `font-family: 'Instrument Serif', serif; font-size: 19px; font-weight: 400; letter-spacing: -0.01em`
- Body text: DM Sans, 12.5–13px, `--text-dim` for secondary
- Monospace data: JetBrains Mono, 600 weight for amounts, 400 for addresses
- No emojis in headings — use them as decorative icons only (in dedicated icon containers)

---

## 4. Layout

- Max width: **600px**, centered
- Mobile-first, single column
- Padding: 14–18px on cards, 20px horizontal on main content
- Gap between sections: ~14–20px
- Sticky header at top
- No horizontal scrolling anywhere

---

## 5. Component architecture

### 5.1 Header

```
[ 🔮 SpellBlock ][ Round #42 ]          [ ? ][ 📊 ][ Connect Wallet ]
```

- Logo: 🔮 emoji + "SpellBlock" in DM Sans 18px bold
- Round badge: `var(--surface-2)` background, monospace, small
- Help icon (?) opens rules modal
- Activity icon (📊) opens side panel, has a green notification dot
- Connect Wallet button: `var(--accent)` background, white text, 13px
- Sticky, `var(--surface)` background, bottom border `var(--border)`

### 5.2 Phase banner

Full-width banner below header showing current game state.

**Content:**
- Phase dot (colored, with subtle glow) + phase name ("Commit phase" / "Reveal phase")
- Phase description (one sentence)
- Countdown timer (HH:MM:SS, JetBrains Mono)
- Phase progress track: three dots connected by lines (Open 16:00 → Reveal 00:00 → Settle 04:00)

**Visual:**
- Soft gradient background (blue tint for commit, purple tint for reveal)
- Bottom border
- Active phase steps are colored, inactive are `var(--border)`

### 5.3 Pot display (HERO)

This is the most prominent element. It's what makes players want to play.

```
                    Round pot
                     847.5M
                    $CLAWDIA

    Commits: 23  |  Season: S3·D7  |  Min stake: 1M
```

- Card with `linear-gradient(145deg, var(--surface) 0%, var(--surface-2) 100%)` background
- Pot amount: Instrument Serif, 36px — the biggest number on screen
- Token label: 10px uppercase, `--text-dim`
- Meta row: three stats separated by 1px dividers, monospace values
- Border: `var(--border)`, rounded 14px

### 5.4 Commit phase

Shown when `phase === "commit"`. Components in order:

#### 5.4.1 Constraints hidden card

```
🎭  Constraints hidden
    A spell (Veto, Anchor, Seal, or Gem) and three valid word
    lengths will be revealed at midnight UTC. Hedge wisely.
```

- Purple-tinted background: `rgba(124,58,237,0.06)` to `rgba(124,58,237,0.12)`
- Purple border: `rgba(124,58,237,0.18)`
- Flex row: large emoji + text column
- Title: 14px bold, description: 12.5px `--text-dim`

#### 5.4.2 Letter pool

Section header: "Letter pool" (Instrument Serif) + "{n} available" hint

- **Always 8 letters** in a flex row with gap
- Each tile: 44×48px, `var(--surface)` background, `var(--border)` border, rounded 8px
- Letter in JetBrains Mono 18px bold
- Tappable — when used, tile fades to 0.2 opacity and scales to 0.88
- Disabled when committed

#### 5.4.3 Word builder

Section header: "Your word" + "{n} letters" counter (shown when word.length > 0)

Three sub-elements:
1. **Word display**: Shows typed characters as individual styled spans with `fadeInUp` animation, or placeholder text "Tap letters or type below..."
2. **Action buttons**: "← Back" (delete last) and "Clear" — small, borderless, `--text-dim` colored
3. **Text input**: For direct typing. `var(--surface-2)` background, monospace, uppercase, max 15 chars

#### 5.4.4 Stake selector

Section header: "Stake"

- **Preset buttons**: 1M, 5M, 10M, 25M — monospace, togglable. Active = `var(--accent)` bg with white text, inactive = `var(--surface)` bg with `--text` colored
- **Custom input**: number input with "$CLAWDIA" unit label suffix, `var(--surface)` background

#### 5.4.5 Commit button

Full-width, two-line button:
- Main: "Commit word"
- Sub: "Stake {amount} $CLAWDIA · Word hidden until reveal"
- Style: `linear-gradient(135deg, var(--accent), #1E5A9E)`, white text, rounded 10px
- Shadow: `0 3px 12px var(--accent-glow)`

#### 5.4.6 Committed confirmation

Replaces the commit button after successful commit:

```
✓  Word committed!
   Your word is hashed onchain. Come back at midnight
   to see if it survives the reveal.
```

- Green-tinted card: `rgba(22,163,74,0.06)` to `rgba(22,163,74,0.14)`
- Green circle with checkmark icon
- All inputs become disabled/locked

### 5.5 Reveal phase

Shown when `phase === "reveal"`. Components in order:

#### 5.5.1 Constraint cards (2-column grid)

Two cards side by side in a CSS grid:

**Left card — Spell:**
```
⚓  Spell
    Anchor (subtitle, muted)

    Must START with [S]
```

- The card header shows the category "Spell" as the primary label in the spell's color, with the specific spell type name ("Anchor", "Veto", etc.) as a smaller muted subtitle underneath
- This hierarchy makes it instantly clear what kind of constraint it is
- The constraint letter is shown in a colored badge (26×26px, rounded 5px, white text on spell-color background)
- For Gem spell, no letter badge — the description is self-explanatory: "Must contain a double letter (e.g. SP·EE·D)"
- After reveal: shows "✓ PASSES" (green) or "✗ FAILS" (red) in monospace

**Right card — Ruler:**
```
📏  Ruler

    [5 letters] [7 letters] [8 letters]
```

- Gold-tinted card
- Shows three length badges in a flex row
- Badges: monospace, gold text on gold-tinted background
- After reveal: matching length badge turns green with white text
- After reveal: shows "✓ PASSES" or "✗ FAILS (yours: {n})" in monospace

Both cards: rounded 10px, 1px border, 18px padding, subtle gradient background using the respective color.

#### 5.5.2 Your committed word

Section header: "Your committed word"

**Before reveal:**
- Row of `?` characters (one per letter of committed word)
- Each `?` is 36×42px, `--surface-2` background, `--border` border, `--text-dim` color
- Label below: "{n} letters · Reveal to check constraints"

**After reveal:**
- Characters appear with staggered `revealChar` animation (0.07s delay per character)
- Each char: 40×46px, monospace 20px bold, 2px border
- Winner: green tint background, green border, green text
- Burned: red tint background, red border, red text

#### 5.5.3 Reveal button

Full-width, two-line button (same layout as commit button):
- Main: "Reveal my word"
- Sub: "Show word & check against spell + ruler"
- Style: `linear-gradient(135deg, var(--purple), #6D28D9)`, white text
- Shadow: `0 3px 12px rgba(124,58,237,0.2)`

#### 5.5.4 Result banner

Replaces the reveal button after word is revealed:

**Winner:**
```
🏆  Winner!
    Your word survived both constraints. Winnings distribute at 04:00 UTC.
```
Green-tinted background and border.

**Burned:**
```
🔥  Burned
    Your word failed. Your stake has been permanently burned.
```
Red-tinted background and border.

- Large emoji (36px), title (18px bold in result color), description (12.5px `--text-dim`)
- `fadeInUp` animation on appear

### 5.6 Burn counter

Always visible below main content:

```
🔥  Total burned
    2.34B $CLAWDIA                                    [forever]
```

- `var(--surface)` card with `var(--border)` border
- Amount in `var(--red)`, monospace
- "forever" tag: tiny red-tinted badge, uppercase monospace, auto-aligned right

### 5.7 Activity panel (side drawer)

Slides in from right when activity icon is clicked.

- 320px wide (88vw max), full height
- `var(--surface)` background with left border
- Header: "Live activity" (Instrument Serif) + close button
- List of anonymous commits:
  - Truncated address (monospace, `--text-dim`)
  - Stake amount (monospace, `--gold`, bold)
  - Relative time ("2m ago")
- Footer note: "Words hidden until reveal phase" (italic, centered, `--text-dim`)
- Overlay backdrop: `rgba(0,0,0,0.25)`

### 5.8 Rules modal ("How to play")

Centered modal (500px max, 85vh max height, scrollable).

**Four steps:**

1. **Craft your word** — "Each round reveals a pool of letters. Build a word using only those letters — you're betting it survives hidden constraints."

2. **Stake & commit** — "Stake $CLAWDIA tokens. Your word is hashed onchain — nobody sees it, and you can't change it."

3. **The double reveal** — "At midnight UTC, two hidden constraints appear:"
   - 🚫 **Veto:** Must NOT contain [letter]
   - ⚓ **Anchor:** Must START with [letter]
   - 🔒 **Seal:** Must END with [letter]
   - 💎 **Gem:** Must contain a double letter (e.g. SP·EE·D)
   - Plus the **Ruler** — three valid word lengths your word must match.

4. **Reveal & settle** — "Reveal your word. If it passes both spell and ruler, you win a share of the pot. If not, your stake burns forever."

**Daily schedule box** (at bottom of modal):
```
Daily schedule (UTC)
16:00  Round opens · Letters revealed
00:00  Commits close · Spell + Ruler revealed
04:00  Reveals close · Winners paid · Burns executed
```

Step numbers: 26px circles, `var(--accent)` background, white monospace number.

---

## 6. Animations

Three keyframe animations:

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes revealChar {
  from { opacity: 0; transform: scale(0.6) rotateX(60deg); }
  to { opacity: 1; transform: scale(1) rotateX(0); }
}
```

Usage:
- `.char-pop`: `fadeInUp 0.15s ease both` — word builder characters appearing
- `.reveal-char`: `revealChar 0.35s ease both` — dramatic character reveal with staggered delay
- Modals/panels: `fadeInUp 0.25s ease`
- Toast: `fadeInUp 0.25s ease`
- Letter pool tiles: CSS transition `all 0.15s` for opacity/scale changes
- Buttons: `transition: all 0.15s`

---

## 7. Game logic notes

### Letter validation
- Word must be at least 3 letters
- Each letter can only be used once (track used indices from the pool)
- Pool always has exactly 8 letters
- Validate against pool before allowing commit

### Spell constraint checking (reveal phase)
- **Veto**: `!word.includes(spellLetter)`
- **Anchor**: `word.startsWith(spellLetter)`
- **Seal**: `word.endsWith(spellLetter)`
- **Gem**: `/(.)\1/.test(word)` (any adjacent duplicate)

### Ruler constraint checking
- `rulerLengths.includes(word.length)`

### Win condition
- Must pass BOTH spell AND ruler

---

## 8. What NOT to build

- ❌ No 6×5 Wordle grid
- ❌ No letter-by-letter color feedback (green/yellow/gray)
- ❌ No multiple guesses per round
- ❌ No virtual keyboard component
- ❌ No dark mode (light only for now)
- ❌ No heavy glowing neon effects
- ❌ No particle systems or runic animations (keep it clean)

---

## 9. Tech stack compatibility

The existing codebase uses:
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Wagmi v2 + Viem (Base mainnet)
- ConnectKit for wallet connection

The reference component is written in plain React with inline styles for portability. When implementing, convert to your existing Tailwind + TypeScript patterns. The inline style values map directly to Tailwind utilities or custom CSS properties.

---

## 10. Reference file

The complete working React component is in `spellblock-redesign.jsx`. It includes:
- All components (Header, PhaseBanner, PotDisplay, CommitPhase, RevealPhase, BurnCounter, ActivityPanel, RulesModal)
- Full styling with all color values
- Mock data for both commit and reveal phases
- A demo phase toggle (remove in production)
- Letter pool validation logic
- Constraint checking logic

Use it as the single source of truth. Every pixel value, color code, font size, and spacing is specified there.
