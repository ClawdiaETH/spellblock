import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// SPELLBLOCK — Commit-Reveal Word Game Redesign
// NOT Wordle. You craft ONE word from a letter pool, stake tokens,
// and hope it survives hidden spell + ruler constraints.
// ═══════════════════════════════════════════════════════════════

const SPELL_TYPES = {
  VETO: { name: "Veto", icon: "🚫", desc: "Must NOT contain", color: "#DC2626" },
  ANCHOR: { name: "Anchor", icon: "⚓", desc: "Must START with", color: "#2B6CB0" },
  SEAL: { name: "Seal", icon: "🔒", desc: "Must END with", color: "#7C3AED" },
  GEM: { name: "Gem", icon: "💎", desc: "Must contain a double letter (e.g. SP·EE·D)", color: "#D97706" },
};

const PHASES = { COMMIT: "commit", REVEAL: "reveal", RESULTS: "results", WAITING: "waiting" };

// ── Mock data ──
const MOCK_ROUND = {
  id: 42,
  phase: PHASES.COMMIT,
  letterPool: ["S", "P", "E", "L", "B", "O", "C", "K"],
  potSize: 847_500_000,
  commitCount: 23,
  spell: null,
  spellLetter: null,
  rulerLengths: null,
  phaseEnd: Date.now() + 4 * 60 * 60 * 1000,
  season: { number: 3, day: 7 },
  burnTotal: 2_340_000_000,
};

const MOCK_REVEALED = {
  ...MOCK_ROUND,
  phase: PHASES.REVEAL,
  spell: "ANCHOR",
  spellLetter: "S",
  rulerLengths: [5, 7, 8],
  phaseEnd: Date.now() + 4 * 60 * 60 * 1000,
};

const MOCK_ACTIVITY = [
  { addr: "0x1a2b...3c4d", stake: 5_000_000, time: "2m ago" },
  { addr: "0x5e6f...7g8h", stake: 12_000_000, time: "4m ago" },
  { addr: "0x9i0j...1k2l", stake: 1_000_000, time: "7m ago" },
  { addr: "0x3m4n...5o6p", stake: 25_000_000, time: "11m ago" },
  { addr: "0x7q8r...9s0t", stake: 3_000_000, time: "15m ago" },
];

const fmt = (n) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function SpellBlock() {
  const [word, setWord] = useState("");
  const [stake, setStake] = useState(1_000_000);
  const [committed, setCommitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [toast, setToast] = useState(null);
  const [demoPhase, setDemoPhase] = useState("commit");

  const currentRound = demoPhase === "reveal" ? MOCK_REVEALED : MOCK_ROUND;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCommit = () => {
    if (word.length < 3) return showToast("Word must be at least 3 letters");
    const poolCopy = [...currentRound.letterPool];
    for (const ch of word.toUpperCase()) {
      const idx = poolCopy.indexOf(ch);
      if (idx === -1) return showToast(`Letter "${ch}" not in the pool`);
      poolCopy.splice(idx, 1);
    }
    setCommitted(true);
    showToast("Word committed! Hash submitted onchain 🔮");
  };

  const handleReveal = () => {
    setRevealed(true);
    showToast("Word revealed! Checking constraints...");
  };

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>
            <span style={styles.logoIcon}>🔮</span>
            SpellBlock
          </h1>
          <span style={styles.roundBadge}>Round #{currentRound.id}</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.iconBtn} onClick={() => setShowRules(true)} title="How to play">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          <button style={styles.iconBtn} onClick={() => setShowActivity(!showActivity)} title="Activity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span style={styles.activityDot} />
          </button>
          <button style={styles.connectBtn}>Connect Wallet</button>
        </div>
      </header>

      {/* Demo Toggle (remove in production) */}
      <div style={styles.demoToggle}>
        <span style={{ opacity: 0.5, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>Demo view:</span>
        {["commit", "reveal"].map((p) => (
          <button
            key={p}
            onClick={() => { setDemoPhase(p); setCommitted(false); setRevealed(false); setWord(""); }}
            style={{
              ...styles.demoBtn,
              background: demoPhase === p ? "var(--accent)" : "transparent",
              color: demoPhase === p ? "#fff" : "var(--text-dim)",
            }}
          >
            {p} phase
          </button>
        ))}
      </div>

      {/* Phase Banner */}
      <PhaseBanner round={currentRound} />

      {/* Main Content */}
      <main style={styles.main}>
        <PotDisplay round={currentRound} />

        {currentRound.phase === PHASES.COMMIT ? (
          <CommitPhase
            round={currentRound}
            word={word}
            setWord={setWord}
            stake={stake}
            setStake={setStake}
            committed={committed}
            onCommit={handleCommit}
          />
        ) : (
          <RevealPhase
            round={currentRound}
            word={word || "SKATING"}
            revealed={revealed}
            onReveal={handleReveal}
          />
        )}

        <BurnCounter total={currentRound.burnTotal} />
      </main>

      {showActivity && <ActivityPanel onClose={() => setShowActivity(false)} />}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE BANNER — Current phase + countdown + progress track
// ═══════════════════════════════════════════════════════════════
function PhaseBanner({ round }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = round.phaseEnd - Date.now();
      if (diff <= 0) return setTimeLeft("00:00:00");
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [round.phaseEnd]);

  const isCommit = round.phase === PHASES.COMMIT;

  return (
    <div style={{
      ...styles.phaseBanner,
      background: isCommit
        ? "linear-gradient(135deg, #E8F0FE 0%, #F0F4FF 100%)"
        : "linear-gradient(135deg, #F0EAFE 0%, #F5F0FF 100%)",
    }}>
      <div style={styles.phaseRow}>
        <div style={styles.phaseInfo}>
          <div style={styles.phaseLabel}>
            <span style={{
              ...styles.phaseDot,
              background: isCommit ? "#2B6CB0" : "#7C3AED",
              boxShadow: isCommit ? "0 2px 8px #2B6CB020" : "0 2px 8px #7C3AED20",
            }} />
            {isCommit ? "Commit Phase" : "Reveal Phase"}
          </div>
          <div style={styles.phaseDesc}>
            {isCommit
              ? "Craft your word and stake your claim. Constraints are hidden."
              : "Spell & ruler revealed. Show your word to claim winnings."}
          </div>
        </div>
        <div style={styles.timerBlock}>
          <div style={styles.timerLabel}>Phase ends in</div>
          <div style={styles.timer}>{timeLeft}</div>
        </div>
      </div>

      <div style={styles.phaseTrack}>
        <PhaseStep label="Open" time="16:00" active={true} color="#2B6CB0" />
        <div style={{ ...styles.phaseLine, background: isCommit ? "var(--border)" : "#2B6CB0" }} />
        <PhaseStep label="Reveal" time="00:00" active={!isCommit} color={isCommit ? "var(--border)" : "#7C3AED"} />
        <div style={{ ...styles.phaseLine, background: "var(--border)" }} />
        <PhaseStep label="Settle" time="04:00" active={false} color="var(--border)" />
      </div>
    </div>
  );
}

function PhaseStep({ label, time, active, color }) {
  return (
    <div style={styles.phaseStep}>
      <div style={{
        ...styles.stepDot,
        background: color,
        borderColor: color,
        boxShadow: active ? `0 2px 6px ${color}30` : "none",
      }} />
      <span style={{ ...styles.stepLabel, color: active ? "var(--text)" : "var(--text-dim)" }}>{label}</span>
      <span style={styles.stepTime}>{time}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// POT DISPLAY — Hero element: total staked this round
// ═══════════════════════════════════════════════════════════════
function PotDisplay({ round }) {
  return (
    <div style={styles.potCard}>
      <div style={styles.potInner}>
        <div style={styles.potLabel}>Round pot</div>
        <div style={styles.potAmount}>{fmt(round.potSize)}</div>
        <div style={styles.potToken}>$CLAWDIA</div>
      </div>
      <div style={styles.potMeta}>
        <div style={styles.potStat}>
          <span style={styles.potStatLabel}>Commits</span>
          <span style={styles.potStatVal}>{round.commitCount}</span>
        </div>
        <div style={styles.potDivider} />
        <div style={styles.potStat}>
          <span style={styles.potStatLabel}>Season</span>
          <span style={styles.potStatVal}>S{round.season.number} · D{round.season.day}</span>
        </div>
        <div style={styles.potDivider} />
        <div style={styles.potStat}>
          <span style={styles.potStatLabel}>Min stake</span>
          <span style={styles.potStatVal}>1M</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMMIT PHASE — Letter pool → word builder → stake → commit
// ═══════════════════════════════════════════════════════════════
function CommitPhase({ round, word, setWord, stake, setStake, committed, onCommit }) {
  const [usedIndices, setUsedIndices] = useState(new Set());

  useEffect(() => {
    const indices = new Set();
    const poolCopy = round.letterPool.map((l, i) => ({ letter: l, index: i, used: false }));
    for (const ch of word.toUpperCase()) {
      const found = poolCopy.find((p) => p.letter === ch && !p.used);
      if (found) { found.used = true; indices.add(found.index); }
    }
    setUsedIndices(indices);
  }, [word, round.letterPool]);

  const addLetter = (letter, idx) => {
    if (usedIndices.has(idx) || committed) return;
    setWord((w) => w + letter);
  };

  return (
    <div style={styles.gameSection}>
      {/* Hidden Constraints Warning */}
      <div style={styles.unknownCard}>
        <div style={styles.unknownIcon}>🎭</div>
        <div>
          <div style={styles.unknownTitle}>Constraints hidden</div>
          <div style={styles.unknownDesc}>
            A spell (Veto, Anchor, Seal, or Gem) and three valid word lengths will be
            revealed at midnight UTC. Hedge wisely.
          </div>
        </div>
      </div>

      {/* Letter Pool */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Letter pool</h2>
        <span style={styles.sectionHint}>{round.letterPool.length} available</span>
      </div>
      <div style={styles.letterPool}>
        {round.letterPool.map((letter, i) => (
          <button
            key={i}
            onClick={() => addLetter(letter, i)}
            disabled={usedIndices.has(i) || committed}
            style={{
              ...styles.poolTile,
              opacity: usedIndices.has(i) ? 0.2 : 1,
              transform: usedIndices.has(i) ? "scale(0.88)" : "scale(1)",
              cursor: usedIndices.has(i) || committed ? "default" : "pointer",
            }}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Word Builder */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Your word</h2>
        {word.length > 0 && <span style={styles.wordLen}>{word.length} letters</span>}
      </div>
      <div style={styles.wordBuilder}>
        <div style={styles.wordDisplay}>
          {word.length === 0 ? (
            <span style={styles.wordPlaceholder}>Tap letters or type below...</span>
          ) : (
            word.toUpperCase().split("").map((ch, i) => (
              <span key={i} style={styles.wordChar} className="char-pop">{ch}</span>
            ))
          )}
        </div>
        <div style={styles.wordActions}>
          <button onClick={() => !committed && setWord((w) => w.slice(0, -1))} disabled={committed || !word.length} style={styles.wordActionBtn}>← Back</button>
          <button onClick={() => !committed && setWord("")} disabled={committed || !word.length} style={styles.wordActionBtn}>Clear</button>
        </div>
        <input
          type="text"
          value={word}
          onChange={(e) => { if (!committed) setWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, "")); }}
          placeholder="Or type directly..."
          style={styles.wordInput}
          maxLength={15}
        />
      </div>

      {/* Stake Selection */}
      {!committed && (
        <div style={{ marginTop: 4 }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Stake</h2>
          </div>
          <div style={styles.stakePresets}>
            {[1_000_000, 5_000_000, 10_000_000, 25_000_000].map((amount) => (
              <button
                key={amount}
                onClick={() => setStake(amount)}
                style={{
                  ...styles.stakePresetBtn,
                  background: stake === amount ? "var(--accent)" : "var(--surface)",
                  color: stake === amount ? "#fff" : "var(--text)",
                  borderColor: stake === amount ? "var(--accent)" : "var(--border)",
                }}
              >
                {fmt(amount)}
              </button>
            ))}
          </div>
          <div style={styles.stakeInputWrap}>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              style={styles.stakeInput}
              min={1_000_000}
              step={1_000_000}
            />
            <span style={styles.stakeUnit}>$CLAWDIA</span>
          </div>
        </div>
      )}

      {/* Commit Button / Confirmed State */}
      {!committed ? (
        <button
          onClick={onCommit}
          disabled={word.length < 3}
          style={{ ...styles.commitBtn, opacity: word.length < 3 ? 0.4 : 1, cursor: word.length < 3 ? "not-allowed" : "pointer" }}
        >
          <span>Commit word</span>
          <span style={styles.commitSub}>Stake {fmt(stake)} $CLAWDIA · Word hidden until reveal</span>
        </button>
      ) : (
        <div style={styles.committedCard}>
          <div style={styles.committedIcon}>✓</div>
          <div>
            <div style={styles.committedTitle}>Committed</div>
            <div style={styles.committedDesc}>
              Your word <strong>"{word.toUpperCase()}"</strong> is locked with {fmt(stake)} $CLAWDIA.
              Constraints reveal at midnight UTC.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REVEAL PHASE — Constraints shown → reveal word → win or burn
// ═══════════════════════════════════════════════════════════════
function RevealPhase({ round, word, revealed, onReveal }) {
  const spell = SPELL_TYPES[round.spell];

  const passesSpell = (() => {
    if (!revealed) return null;
    const w = word.toUpperCase();
    switch (round.spell) {
      case "VETO": return !w.includes(round.spellLetter);
      case "ANCHOR": return w.startsWith(round.spellLetter);
      case "SEAL": return w.endsWith(round.spellLetter);
      case "GEM": return /(.)\1/.test(w);
      default: return false;
    }
  })();

  const passesRuler = revealed ? round.rulerLengths.includes(word.length) : null;
  const isWinner = passesSpell && passesRuler;

  return (
    <div style={styles.gameSection}>
      {/* Revealed Constraints */}
      <div style={styles.revealGrid}>
        {/* Spell */}
        <div style={{
          ...styles.constraintCard,
          borderColor: spell.color + "40",
          background: `linear-gradient(160deg, ${spell.color}06, ${spell.color}14)`,
        }}>
          <div style={styles.constraintHeader}>
            <span style={{ fontSize: 28 }}>{spell.icon}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ ...styles.constraintType, color: spell.color }}>Spell</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>{spell.name}</span>
            </div>
          </div>
          <div style={styles.constraintRule}>
            {spell.desc}{" "}
            {round.spell !== "GEM" && (
              <span style={{ ...styles.constraintLetter, background: spell.color }}>{round.spellLetter}</span>
            )}
          </div>
          {revealed && (
            <div style={{ ...styles.constraintResult, color: passesSpell ? "#16A34A" : "#DC2626" }}>
              {passesSpell ? "✓ PASSES" : "✗ FAILS"}
            </div>
          )}
        </div>

        {/* Ruler */}
        <div style={{
          ...styles.constraintCard,
          borderColor: "#D9770640",
          background: "linear-gradient(160deg, #D9770606, #D9770614)",
        }}>
          <div style={styles.constraintHeader}>
            <span style={{ fontSize: 28 }}>📏</span>
            <span style={{ ...styles.constraintType, color: "#D97706" }}>Ruler</span>
          </div>
          <div style={styles.rulerLengths}>
            {round.rulerLengths.map((len) => (
              <span key={len} style={{
                ...styles.rulerBadge,
                background: revealed && word.length === len ? "#16A34A" : "#D9770618",
                color: revealed && word.length === len ? "#fff" : "#D97706",
                borderColor: revealed && word.length === len ? "#16A34A" : "#D9770630",
              }}>
                {len} letters
              </span>
            ))}
          </div>
          {revealed && (
            <div style={{ ...styles.constraintResult, color: passesRuler ? "#16A34A" : "#DC2626" }}>
              {passesRuler ? "✓ PASSES" : `✗ FAILS (yours: ${word.length})`}
            </div>
          )}
        </div>
      </div>

      {/* Your Committed Word */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Your committed word</h2>
      </div>
      {!revealed ? (
        <div style={styles.hiddenWord}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {word.split("").map((_, i) => (
              <span key={i} style={styles.hiddenChar}>?</span>
            ))}
          </div>
          <div style={styles.hiddenLabel}>{word.length} letters · Reveal to check constraints</div>
        </div>
      ) : (
        <div style={styles.revealedWordWrap}>
          {word.toUpperCase().split("").map((ch, i) => (
            <span key={i} style={{
              ...styles.revealedChar,
              background: isWinner ? "#16A34A14" : "#DC262614",
              borderColor: isWinner ? "#16A34A40" : "#DC262640",
              color: isWinner ? "#16A34A" : "#DC2626",
              animationDelay: `${i * 0.07}s`,
            }} className="reveal-char">
              {ch}
            </span>
          ))}
        </div>
      )}

      {/* Action */}
      {!revealed ? (
        <button onClick={onReveal} style={styles.revealBtn}>
          <span>Reveal my word</span>
          <span style={styles.commitSub}>Show word & check against spell + ruler</span>
        </button>
      ) : (
        <div style={{
          ...styles.resultBanner,
          background: isWinner ? "linear-gradient(135deg, #16A34A10, #16A34A20)" : "linear-gradient(135deg, #DC262610, #DC262620)",
          borderColor: isWinner ? "#16A34A40" : "#DC262640",
        }}>
          <div style={{ fontSize: 36 }}>{isWinner ? "🏆" : "🔥"}</div>
          <div>
            <div style={{ ...styles.resultTitle, color: isWinner ? "#16A34A" : "#DC2626" }}>
              {isWinner ? "Winner!" : "Burned"}
            </div>
            <div style={styles.resultDesc}>
              {isWinner
                ? "Your word survived both constraints. Winnings distribute at 04:00 UTC."
                : "Your word failed. Your stake has been permanently burned."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BURN COUNTER
// ═══════════════════════════════════════════════════════════════
function BurnCounter({ total }) {
  return (
    <div style={styles.burnCard}>
      <div style={{ fontSize: 22 }}>🔥</div>
      <div>
        <div style={styles.burnLabel}>Total burned</div>
        <div style={styles.burnAmount}>{fmt(total)} <span style={styles.burnToken}>$CLAWDIA</span></div>
      </div>
      <div style={styles.burnTag}>forever</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY PANEL — Live anonymous commits
// ═══════════════════════════════════════════════════════════════
function ActivityPanel({ onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.activityPanel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>Live activity</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.activityList}>
          {MOCK_ACTIVITY.map((a, i) => (
            <div key={i} style={styles.activityItem}>
              <span style={styles.activityAddr}>{a.addr}</span>
              <div style={{ textAlign: "right" }}>
                <div style={styles.activityAmount}>{fmt(a.stake)}</div>
                <div style={styles.activityTime}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={styles.activityNote}>Words hidden until reveal phase</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RULES MODAL
// ═══════════════════════════════════════════════════════════════
function RulesModal({ onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.panelHeader}>
          <h2 style={styles.modalTitle}>How to play</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.modalBody}>
          {[
            { n: "1", title: "Craft your word", desc: "Each round reveals a pool of letters. Build a word using only those letters — you're betting it survives hidden constraints." },
            { n: "2", title: "Stake & commit", desc: "Stake $CLAWDIA tokens. Your word is hashed onchain — nobody sees it, and you can't change it." },
            { n: "3", title: "The double reveal", desc: "At midnight UTC, two hidden constraints appear:" },
            { n: "4", title: "Reveal & settle", desc: "Reveal your word. If it passes both spell and ruler, you win a share of the pot. If not, your stake burns forever." },
          ].map((step) => (
            <div key={step.n} style={styles.ruleStep}>
              <div style={styles.ruleNum}>{step.n}</div>
              <div>
                <div style={styles.ruleStepTitle}>{step.title}</div>
                <div style={styles.ruleStepDesc}>{step.desc}</div>
                {step.n === "3" && (
                  <div style={styles.spellList}>
                    {Object.entries(SPELL_TYPES).map(([key, s]) => (
                      <div key={key} style={styles.spellItem}>
                        <span>{s.icon}</span>
                        <strong>{s.name}:</strong>
                        <span style={{ opacity: 0.7 }}>{s.desc}{key !== "GEM" ? " [letter]" : ""}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>
                      Plus the <strong>Ruler</strong> — three valid word lengths your word must match.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div style={styles.scheduleBox}>
            <div style={styles.scheduleTitle}>Daily schedule (UTC)</div>
            <div style={styles.scheduleRow}><span style={styles.scheduleTime}>16:00</span> Round opens · Letters revealed</div>
            <div style={styles.scheduleRow}><span style={styles.scheduleTime}>00:00</span> Commits close · Spell + Ruler revealed</div>
            <div style={styles.scheduleRow}><span style={styles.scheduleTime}>04:00</span> Reveals close · Winners paid · Burns executed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL CSS
// ═══════════════════════════════════════════════════════════════
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :root {
    --bg: #F6F5F1;
    --surface: #FFFFFF;
    --surface-2: #EEECE7;
    --border: #D8D5CC;
    --text: #1A1A1F;
    --text-dim: #7C7A72;
    --accent: #2B6CB0;
    --accent-glow: #2B6CB030;
    --green: #16A34A;
    --red: #DC2626;
    --gold: #D97706;
    --purple: #7C3AED;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
  ::selection { background: var(--accent); color: #fff; }
  input:focus, button:focus { outline: none; }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes revealChar { from { opacity: 0; transform: scale(0.6) rotateX(60deg); } to { opacity: 1; transform: scale(1) rotateX(0); } }
  .char-pop { animation: fadeInUp 0.15s ease both; }
  .reveal-char { animation: revealChar 0.35s ease both; }
`;

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = {
  app: { minHeight: "100vh", background: "var(--bg)", fontFamily: "'DM Sans', sans-serif" },

  // Header
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 20px", borderBottom: "1px solid var(--border)",
    background: "var(--surface)", position: "sticky", top: 0, zIndex: 50,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  logo: {
    fontFamily: "'Instrument Serif', serif", fontSize: 22, fontWeight: 400,
    display: "flex", alignItems: "center", gap: 7, color: "var(--text)", letterSpacing: "-0.02em",
  },
  logoIcon: { fontSize: 20 },
  roundBadge: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, padding: "2px 7px",
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 5,
    color: "var(--text-dim)", fontWeight: 500,
  },
  iconBtn: {
    background: "none", border: "1px solid var(--border)", color: "var(--text-dim)",
    width: 34, height: 34, borderRadius: 8, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
  },
  activityDot: {
    position: "absolute", top: 5, right: 5, width: 6, height: 6,
    borderRadius: "50%", background: "var(--green)", animation: "pulse 2s infinite",
  },
  connectBtn: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
    padding: "7px 14px", background: "var(--accent)", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer", marginLeft: 4,
  },

  // Demo
  demoToggle: {
    display: "flex", alignItems: "center", gap: 6, padding: "6px 20px",
    borderBottom: "1px solid var(--border)", background: "var(--surface)",
  },
  demoBtn: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, padding: "3px 10px",
    border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer",
    textTransform: "uppercase", letterSpacing: "0.06em",
  },

  // Phase Banner
  phaseBanner: { padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" },
  phaseRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  phaseInfo: {},
  phaseLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 600, marginBottom: 3 },
  phaseDot: { width: 10, height: 10, borderRadius: "50%" },
  phaseDesc: { fontSize: 13, color: "var(--text-dim)", maxWidth: 380 },
  timerBlock: { textAlign: "right" },
  timerLabel: { fontSize: 10, color: "var(--text-dim)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" },
  timer: { fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600, letterSpacing: "0.04em" },
  phaseTrack: { display: "flex", alignItems: "center" },
  phaseStep: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 48 },
  stepDot: { width: 10, height: 10, borderRadius: "50%", border: "2px solid" },
  stepLabel: { fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  stepTime: { fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)", opacity: 0.5 },
  phaseLine: { flex: 1, height: 2, borderRadius: 1, marginTop: -18 },

  // Main
  main: { maxWidth: 600, margin: "0 auto", padding: "20px 16px 80px" },

  // Pot
  potCard: {
    background: "linear-gradient(145deg, var(--surface) 0%, var(--surface-2) 100%)",
    border: "1px solid var(--border)", borderRadius: 14, padding: "24px 20px 14px",
    marginBottom: 20, textAlign: "center",
  },
  potInner: { marginBottom: 14 },
  potLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 },
  potAmount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 700, color: "var(--gold)", letterSpacing: "-0.02em" },
  potToken: { fontSize: 12, color: "var(--text-dim)", fontWeight: 500, marginTop: 1 },
  potMeta: { display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: "10px 0 0", borderTop: "1px solid var(--border)" },
  potStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 1 },
  potStatLabel: { fontSize: 9.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" },
  potStatVal: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 },
  potDivider: { width: 1, height: 24, background: "var(--border)" },

  // Game Section
  gameSection: { animation: "fadeInUp 0.35s ease both" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, marginTop: 18 },
  sectionTitle: { fontFamily: "'Instrument Serif', serif", fontSize: 19, fontWeight: 400, letterSpacing: "-0.01em" },
  sectionHint: { fontSize: 11, color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" },

  // Unknown Card
  unknownCard: {
    display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px",
    background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.12))",
    border: "1px solid rgba(124,58,237,0.18)", borderRadius: 10, marginBottom: 6,
  },
  unknownIcon: { fontSize: 26, flexShrink: 0, marginTop: 1 },
  unknownTitle: { fontSize: 14, fontWeight: 600, marginBottom: 3 },
  unknownDesc: { fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 },

  // Letter Pool
  letterPool: {
    display: "flex", flexWrap: "wrap", gap: 7, padding: "14px",
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
  },
  poolTile: {
    width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 600,
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7,
    color: "var(--text)", transition: "all 0.12s", userSelect: "none",
  },

  // Word Builder
  wordBuilder: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 },
  wordDisplay: { minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flexWrap: "wrap", padding: "6px 0 10px" },
  wordPlaceholder: { fontSize: 14, color: "var(--text-dim)", fontStyle: "italic", opacity: 0.4 },
  wordChar: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 40, height: 46, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700,
    background: "rgba(43,108,176,0.10)", border: "2px solid rgba(43,108,176,0.30)", borderRadius: 7, color: "var(--accent)",
  },
  wordLen: { fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)", fontWeight: 500 },
  wordActions: { display: "flex", gap: 7, marginBottom: 7, justifyContent: "center" },
  wordActionBtn: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 500, padding: "4px 11px",
    background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-dim)", borderRadius: 5, cursor: "pointer",
  },
  wordInput: {
    width: "100%", padding: "9px 12px", background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: 7, color: "var(--text)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.1em", textTransform: "uppercase",
  },

  // Stake
  stakePresets: { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 },
  stakePresetBtn: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, padding: "6px 13px",
    borderRadius: 7, border: "1px solid", cursor: "pointer", transition: "all 0.12s",
  },
  stakeInputWrap: {
    display: "flex", alignItems: "center", gap: 8, background: "var(--surface)",
    border: "1px solid var(--border)", borderRadius: 7, padding: "0 12px",
  },
  stakeInput: {
    flex: 1, padding: "9px 0", background: "transparent", border: "none",
    color: "var(--text)", fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600,
  },
  stakeUnit: { fontSize: 10.5, color: "var(--text-dim)", fontWeight: 600, whiteSpace: "nowrap" },

  // Commit Button
  commitBtn: {
    width: "100%", marginTop: 18, padding: "16px 20px",
    background: "linear-gradient(135deg, var(--accent), #1E5A9E)", border: "none", borderRadius: 10,
    color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    boxShadow: "0 3px 12px var(--accent-glow)", transition: "all 0.15s",
  },
  commitSub: { fontSize: 11.5, fontWeight: 400, opacity: 0.7 },

  // Committed
  committedCard: {
    display: "flex", gap: 12, alignItems: "flex-start", padding: "16px",
    background: "linear-gradient(135deg, rgba(22,163,74,0.06), rgba(22,163,74,0.14))",
    border: "1px solid rgba(22,163,74,0.3)", borderRadius: 10, marginTop: 18,
  },
  committedIcon: {
    width: 32, height: 32, borderRadius: "50%", background: "var(--green)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0,
  },
  committedTitle: { fontSize: 15, fontWeight: 700, marginBottom: 3 },
  committedDesc: { fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 },

  // Reveal Phase
  revealGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 },
  constraintCard: { padding: "18px 14px", borderRadius: 10, border: "1px solid" },
  constraintHeader: { display: "flex", alignItems: "center", gap: 9, marginBottom: 10 },
  constraintType: { fontSize: 15, fontWeight: 700 },
  constraintRule: { fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 },
  constraintLetter: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 26, height: 26, borderRadius: 5, color: "#fff",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, marginLeft: 3, verticalAlign: "middle",
  },
  constraintResult: { marginTop: 10, fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" },
  rulerLengths: { display: "flex", gap: 5, flexWrap: "wrap" },
  rulerBadge: {
    fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
    padding: "3px 9px", borderRadius: 5, border: "1px solid",
  },

  // Reveal Word
  hiddenWord: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    padding: "18px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
  },
  hiddenChar: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 36, height: 42, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600,
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text-dim)",
  },
  hiddenLabel: { fontSize: 11.5, color: "var(--text-dim)" },
  revealedWordWrap: {
    display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5,
    padding: "18px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
  },
  revealedChar: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 40, height: 46, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700,
    borderRadius: 7, border: "2px solid",
  },

  // Reveal Button
  revealBtn: {
    width: "100%", marginTop: 18, padding: "16px 20px",
    background: "linear-gradient(135deg, var(--purple), #6D28D9)", border: "none", borderRadius: 10,
    color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    boxShadow: "0 3px 12px rgba(124,58,237,0.2)", transition: "all 0.15s",
  },

  // Result
  resultBanner: {
    display: "flex", gap: 14, alignItems: "center", padding: "18px",
    borderRadius: 10, border: "1px solid", marginTop: 18, animation: "fadeInUp 0.4s ease both",
  },
  resultTitle: { fontSize: 18, fontWeight: 700, marginBottom: 3 },
  resultDesc: { fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 },

  // Burn
  burnCard: {
    display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, marginTop: 20,
  },
  burnLabel: { fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" },
  burnAmount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, color: "var(--red)" },
  burnToken: { fontSize: 10.5, fontWeight: 400, color: "var(--text-dim)" },
  burnTag: {
    fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", padding: "2px 7px",
    background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 3,
    color: "var(--red)", marginLeft: "auto", textTransform: "uppercase", letterSpacing: "0.05em",
  },

  // Overlay / Panels
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 100, display: "flex", justifyContent: "flex-end" },
  activityPanel: {
    width: 320, maxWidth: "88vw", background: "var(--surface)", borderLeft: "1px solid var(--border)",
    height: "100%", display: "flex", flexDirection: "column", animation: "fadeInUp 0.2s ease",
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 18px", borderBottom: "1px solid var(--border)",
  },
  panelTitle: { fontFamily: "'Instrument Serif', serif", fontSize: 18, fontWeight: 400 },
  closeBtn: {
    background: "none", border: "1px solid var(--border)", color: "var(--text-dim)",
    width: 30, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  activityList: { flex: 1, overflow: "auto", padding: "6px 0" },
  activityItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 18px", borderBottom: "1px solid var(--border)",
  },
  activityAddr: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--text-dim)" },
  activityAmount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, fontWeight: 600, color: "var(--gold)" },
  activityTime: { fontSize: 10.5, color: "var(--text-dim)" },
  activityNote: {
    padding: "10px 18px", fontSize: 10.5, color: "var(--text-dim)", textAlign: "center",
    borderTop: "1px solid var(--border)", fontStyle: "italic",
  },

  // Modal
  modal: {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
    width: "100%", maxWidth: 500, maxHeight: "85vh", overflow: "auto",
    animation: "fadeInUp 0.25s ease", position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
  },
  modalTitle: { fontFamily: "'Instrument Serif', serif", fontSize: 22, fontWeight: 400 },
  modalBody: { padding: "18px 22px 24px" },

  // Rules
  ruleStep: { display: "flex", gap: 12, marginBottom: 18 },
  ruleNum: {
    width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace",
  },
  ruleStepTitle: { fontSize: 14, fontWeight: 700, marginBottom: 3 },
  ruleStepDesc: { fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.6 },
  spellList: { marginTop: 8, display: "flex", flexDirection: "column", gap: 3 },
  spellItem: { display: "flex", gap: 5, alignItems: "center", fontSize: 12.5, padding: "3px 0" },
  scheduleBox: {
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "12px 14px", marginTop: 4,
  },
  scheduleTitle: { fontSize: 12.5, fontWeight: 700, marginBottom: 6 },
  scheduleRow: { fontSize: 12.5, color: "var(--text-dim)", padding: "3px 0", lineHeight: 1.5 },
  scheduleTime: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--text)", marginRight: 7 },

  // Toast
  toast: {
    position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
    padding: "10px 22px", background: "var(--surface-2)", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--text)", zIndex: 300,
    animation: "fadeInUp 0.25s ease", boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
  },
};
