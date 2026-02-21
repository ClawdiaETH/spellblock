/**
 * SpellBlock word validation — pure logic, no LLM, no API calls
 * Used by mention poller and finalize scripts
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Load dictionary once at startup (41k words, ~2MB)
const PROOFS_PATH = join(__dir, '../../frontend/src/data/merkle-proofs.json');
let _dict = null;

function getDict() {
  if (!_dict) {
    const raw = JSON.parse(readFileSync(PROOFS_PATH, 'utf8'));
    _dict = new Set(Object.keys(raw.proofs || raw).map(w => w.toLowerCase()));
  }
  return _dict;
}

/**
 * Check word uses only letters from the 8-letter pool.
 * Repeats are unlimited — if Z is in the pool, FIZZY, FUZZY, ZZZZ all pass.
 * Each letter in the word just needs to appear at least once in the pool.
 */
export function checkLetterPool(word, letters) {
  const pool = new Set(letters.toLowerCase().split(''));
  return word.toLowerCase().split('').every(l => pool.has(l));
}

/**
 * Check word is in the dictionary
 */
export function checkDictionary(word) {
  return getDict().has(word.toLowerCase());
}

/**
 * Check word length is one of the valid lengths (revealed after commit deadline)
 */
export function checkLength(word, validLengths) {
  return validLengths.includes(word.length);
}

/**
 * Check spell rule (revealed after commit deadline)
 * spell_id 0 = Veto: word must NOT contain spellParam letter
 * spell_id 1 = Anchor: word must START with spellParam letter
 * spell_id 2 = Seal: word must END with spellParam letter
 * spell_id 3 = Gem: word must have adjacent identical letters
 */
export function checkSpell(word, spellId, spellParam) {
  const w = word.toLowerCase();
  const p = (spellParam || '').toLowerCase().charAt(0);

  switch (spellId) {
    case 0: return !w.includes(p);                          // Veto
    case 1: return w.startsWith(p);                         // Anchor
    case 2: return w.endsWith(p);                           // Seal
    case 3: return /(.)\1/.test(w);                         // Gem
    default: return true;
  }
}

/**
 * Pre-reveal validation (at entry time): letter pool + dictionary only
 * Returns { valid, reason }
 */
export function validateEntry(word, letters) {
  const w = word.trim().toUpperCase();

  if (!w || w.length < 4 || w.length > 8) {
    return { valid: false, reason: `word must be 4–8 letters` };
  }
  if (!/^[A-Z]+$/.test(w)) {
    return { valid: false, reason: `letters only` };
  }
  if (!checkLetterPool(w, letters)) {
    return { valid: false, reason: `uses letters not in pool (${letters})` };
  }
  if (!checkDictionary(w)) {
    return { valid: false, reason: `not in dictionary` };
  }

  return { valid: true, reason: null };
}

/**
 * Post-reveal scoring (after spell + lengths known)
 * Returns { valid, score, reason }
 * Score = word length (longer = better); spell/length violations = 0
 */
export function scoreEntry(word, letters, validLengths, spellId, spellParam) {
  const w = word.toUpperCase();
  const lengthOk = checkLength(w, validLengths);
  const spellOk  = checkSpell(w, spellId, spellParam);
  const poolOk   = checkLetterPool(w, letters);
  const dictOk   = checkDictionary(w);

  if (!poolOk || !dictOk) return { valid: false, score: 0, reason: 'invalid word' };
  if (!lengthOk)          return { valid: false, score: 0, reason: `length ${w.length} not in ${validLengths.join('/')}` };
  if (!spellOk)           return { valid: false, score: 0, reason: `fails spell rule` };

  return { valid: true, score: w.length, reason: null };
}
