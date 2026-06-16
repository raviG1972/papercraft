/**
 * Transliteration Engine
 *
 * Takes latin text input and produces Unicode suggestions.
 * Supports both Sinhala (Singlish) and Tamil transliteration modes.
 */

import {
  sinhalaVowels,
  sinhalaConsonants,
  sinhalaVowelSigns,
  sinhalaConjuncts,
  sinhalaSpecial,
  consonantKeys as siConsonantKeys,
  conjunctKeys as siConjunctKeys,
  vowelKeys as siVowelKeys,
  standaloneVowelKeys as siStandaloneVowelKeys,
} from './sinhala';

import {
  tamilVowels,
  tamilConsonants,
  tamilVowelSigns,
  tamilConjuncts,
  consonantKeys as taConsonantKeys,
  conjunctKeys as taConjunctKeys,
  vowelKeys as taVowelKeys,
  standaloneVowelKeys as taStandaloneVowelKeys,
} from './tamil';

export type TransliterationMode =
  | 'english'
  | 'sinhala-singlish'
  | 'sinhala-wijesekara'
  | 'tamil-unicode'
  | 'tamil-typewriter';

export interface Suggestion {
  text: string;         // The unicode output
  display: string;      // Same as text (for rendering)
  label?: string;       // Optional short label
}

// ─── Transliterate a full string (for immediate conversion) ─

export function transliterateFull(
  latin: string,
  mode: 'sinhala-singlish' | 'tamil-unicode',
): string {
  if (mode === 'sinhala-singlish') return transliterateSinhala(latin);
  if (mode === 'tamil-unicode') return transliterateTamil(latin);
  return latin;
}

// ─── Get suggestions for a composing prefix ─────────────────

export function getSuggestions(
  prefix: string,
  mode: 'sinhala-singlish' | 'tamil-unicode',
): Suggestion[] {
  if (!prefix || prefix.length === 0) return [];

  if (mode === 'sinhala-singlish') return getSinhalaSuggestions(prefix);
  if (mode === 'tamil-unicode') return getTamilSuggestions(prefix);
  return [];
}

// ═══════════════════════════════════════════════════════════════
// SINHALA ENGINE
// ═══════════════════════════════════════════════════════════════

function getSinhalaSuggestions(prefix: string): Suggestion[] {
  const results: Suggestion[] = [];
  const p = prefix.toLowerCase();

  // 1. Check standalone vowels first
  for (const key of siStandaloneVowelKeys) {
    if (p === key || p.startsWith(key)) {
      const val = sinhalaVowels[key];
      if (!results.find((r) => r.text === val)) {
        results.push({ text: val, display: val });
      }
    }
  }

  // 2. Check consonant + vowel combinations
  for (const cKey of siConsonantKeys) {
    if (p.startsWith(cKey)) {
      const remainder = p.slice(cKey.length);

      if (remainder === '' || remainder === ' ') {
        // Bare consonant (with hal)
        const base = sinhalaConsonants[cKey].replace('්', '');
        results.push({ text: sinhalaConsonants[cKey], display: sinhalaConsonants[cKey] });
        results.push({ text: base, display: base, label: 'no hal' });
      } else {
        // Try vowel signs
        for (const vKey of siVowelKeys) {
          if (remainder.startsWith(vKey) || remainder === vKey) {
            const base = sinhalaConsonants[cKey].replace('්', '');
            const sign = sinhalaVowelSigns[vKey];
            const combined = base + sign;
            if (!results.find((r) => r.text === combined)) {
              results.push({ text: combined, display: combined });
            }
          }
        }
      }
    }
  }

  // 3. Check conjuncts
  for (const key of siConjunctKeys) {
    if (p.startsWith(key)) {
      const conj = sinhalaConjuncts[key];
      const remainder = p.slice(key.length);
      if (remainder === '' || remainder === ' ') {
        if (!results.find((r) => r.text === conj)) {
          results.push({ text: conj, display: conj });
        }
      } else {
        for (const vKey of siVowelKeys) {
          if (remainder.startsWith(vKey)) {
            const base = conj.replace(/්$/, '');
            const sign = sinhalaVowelSigns[vKey];
            const combined = base + sign;
            if (!results.find((r) => r.text === combined)) {
              results.push({ text: combined, display: combined });
            }
          }
        }
      }
    }
  }

  // 4. Check special forms
  for (const [key, val] of Object.entries(sinhalaSpecial)) {
    if (p === key || p.startsWith(key)) {
      if (!results.find((r) => r.text === val)) {
        results.push({ text: val, display: val });
      }
    }
  }

  return results.slice(0, 8);
}

function transliterateSinhala(latin: string): string {
  let result = '';
  let i = 0;
  const lower = latin.toLowerCase();

  while (i < lower.length) {
    let matched = false;

    // Try conjuncts first (longest match)
    for (const key of siConjunctKeys) {
      if (lower.startsWith(key, i)) {
        const conj = sinhalaConjuncts[key];
        const afterConj = lower.slice(i + key.length);

        // Check if a vowel follows
        let vowelFound = false;
        for (const vKey of siVowelKeys) {
          if (afterConj.startsWith(vKey)) {
            const base = conj.replace(/්$/, '');
            result += base + sinhalaVowelSigns[vKey];
            i += key.length + vKey.length;
            vowelFound = true;
            matched = true;
            break;
          }
        }
        if (vowelFound) continue;

        // No vowel – keep the conjunct as-is
        result += conj;
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Try consonants
    for (const key of siConsonantKeys) {
      if (lower.startsWith(key, i)) {
        const after = lower.slice(i + key.length);
        const base = sinhalaConsonants[key].replace('්', '');

        // Check if a vowel follows
        let vowelFound = false;
        for (const vKey of siVowelKeys) {
          if (after.startsWith(vKey)) {
            result += base + sinhalaVowelSigns[vKey];
            i += key.length + vKey.length;
            vowelFound = true;
            matched = true;
            break;
          }
        }
        if (vowelFound) continue;

        // No vowel – consonant with hal (unless next char is a space/end)
        if (after.length === 0 || after[0] === ' ') {
          // At end or before space: bare consonant without hal
          result += base;
        } else {
          result += sinhalaConsonants[key];
        }
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Try standalone vowels
    for (const key of siStandaloneVowelKeys) {
      if (lower.startsWith(key, i)) {
        result += sinhalaVowels[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Pass through
    result += latin[i];
    i++;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// TAMIL ENGINE
// ═══════════════════════════════════════════════════════════════

function getTamilSuggestions(prefix: string): Suggestion[] {
  const results: Suggestion[] = [];
  const p = prefix.toLowerCase();

  // 1. Standalone vowels
  for (const key of taStandaloneVowelKeys) {
    if (p === key || p.startsWith(key)) {
      const val = tamilVowels[key];
      if (!results.find((r) => r.text === val)) {
        results.push({ text: val, display: val });
      }
    }
  }

  // 2. Consonant + vowel
  for (const cKey of taConsonantKeys) {
    if (p.startsWith(cKey)) {
      const remainder = p.slice(cKey.length);
      if (remainder === '' || remainder === ' ') {
        const base = tamilConsonants[cKey].replace('்', '');
        results.push({ text: tamilConsonants[cKey], display: tamilConsonants[cKey] });
        results.push({ text: base, display: base, label: 'no pulli' });
      } else {
        for (const vKey of taVowelKeys) {
          if (remainder.startsWith(vKey)) {
            const base = tamilConsonants[cKey].replace('்', '');
            const sign = tamilVowelSigns[vKey];
            const combined = base + sign;
            if (!results.find((r) => r.text === combined)) {
              results.push({ text: combined, display: combined });
            }
          }
        }
      }
    }
  }

  // 3. Conjuncts
  for (const key of taConjunctKeys) {
    if (p.startsWith(key)) {
      const conj = tamilConjuncts[key];
      const remainder = p.slice(key.length);
      if (remainder === '' || remainder === ' ') {
        if (!results.find((r) => r.text === conj)) {
          results.push({ text: conj, display: conj });
        }
      } else {
        for (const vKey of taVowelKeys) {
          if (remainder.startsWith(vKey)) {
            const base = conj.replace(/்$/, '');
            const combined = base + tamilVowelSigns[vKey];
            if (!results.find((r) => r.text === combined)) {
              results.push({ text: combined, display: combined });
            }
          }
        }
      }
    }
  }

  return results.slice(0, 8);
}

function transliterateTamil(latin: string): string {
  let result = '';
  let i = 0;
  const lower = latin.toLowerCase();

  while (i < lower.length) {
    let matched = false;

    // Conjuncts
    for (const key of taConjunctKeys) {
      if (lower.startsWith(key, i)) {
        const conj = tamilConjuncts[key];
        const after = lower.slice(i + key.length);
        let vowelFound = false;
        for (const vKey of taVowelKeys) {
          if (after.startsWith(vKey)) {
            const base = conj.replace(/்$/, '');
            result += base + tamilVowelSigns[vKey];
            i += key.length + vKey.length;
            vowelFound = true;
            matched = true;
            break;
          }
        }
        if (vowelFound) continue;
        result += conj;
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Consonants
    for (const key of taConsonantKeys) {
      if (lower.startsWith(key, i)) {
        const after = lower.slice(i + key.length);
        const base = tamilConsonants[key].replace('்', '');
        let vowelFound = false;
        for (const vKey of taVowelKeys) {
          if (after.startsWith(vKey)) {
            result += base + tamilVowelSigns[vKey];
            i += key.length + vKey.length;
            vowelFound = true;
            matched = true;
            break;
          }
        }
        if (vowelFound) continue;
        if (after.length === 0 || after[0] === ' ') {
          result += base;
        } else {
          result += tamilConsonants[key];
        }
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Vowels
    for (const key of taStandaloneVowelKeys) {
      if (lower.startsWith(key, i)) {
        result += tamilVowels[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    result += latin[i];
    i++;
  }

  return result;
}