/**
 * Sinhala Singlish Transliteration Data
 *
 * Maps latin (English) phonetic input to Sinhala Unicode.
 * Uses a compositional model: consonants + vowel signs combine.
 *
 * Consonants carry an implicit hal kirima (්) unless followed by a vowel.
 */

// ─── Standalone Vowels ───────────────────────────────────────────
export const sinhalaVowels: Record<string, string> = {
  'a': 'අ',     'aa': 'ආ',     'aA': 'ආ',     'ā': 'ආ',
  'i': 'ඉ',     'ii': 'ඊ',     'iI': 'ඊ',     'ī': 'ඊ',
  'u': 'උ',     'uu': 'ඌ',     'uU': 'ඌ',     'ū': 'ඌ',
  'e': 'එ',     'ee': 'ඒ',     'eE': 'ඒ',     'ē': 'ඒ',
  'o': 'ඔ',     'oo': 'ඕ',     'oO': 'ඕ',     'ō': 'ඕ',
  'ae': 'ඇ',    'æ': 'ඇ',
  'aae': 'ඈ',   'aAe': 'ඈ',   'aæ': 'ඈ',
  'ai': 'ඓ',    'ay': 'ඓ',
  'au': 'ඖ',    'aw': 'ඖ',
};

// ─── Consonant Base Forms (with hal kirima ්) ───────────────────
export const sinhalaConsonants: Record<string, string> = {
  'k':  'ක්',  'g':  'ග්',  'ng': 'ඟ්',
  'c':  'ච්',  'ch': 'ච්',  'j':  'ජ්',  'ny': 'ඤ්',
  't':  'ට්',  'd':  'ඩ්',  'n':  'න්',  'N':  'ණ්',
  'T':  'ත්',  'th': 'ත්',  'D':  'ද්',  'dh': 'ද්',
  'p':  'ප්',  'b':  'බ්',  'm':  'ම්',
  'y':  'ය්',  'r':  'ර්',  'l':  'ල්',  'v':  'ව්',  'w':  'ව්',
  's':  'ස්',  'h':  'හ්',  'L':  'ළ්',
  'G':  'ඝ්',  'sh': 'ශ්',  'S':  'ෂ්',  'zh': 'ෂ්',
  'f':  'ෆ්',
};

// ─── Vowel Signs (combining forms after consonants) ─────────────
// 'a' means remove hal kirima (no sign needed)
export const sinhalaVowelSigns: Record<string, string> = {
  'a': '',       // implicit – remove hal
  'aa': 'ා',    'aA': 'ා',    'ā': 'ා',
  'i': 'ි',     'ii': 'ී',    'iI': 'ී',    'ī': 'ී',
  'u': 'ු',     'uu': 'ූ',    'uU': 'ූ',    'ū': 'ූ',
  'e': 'ෙ',     'ee': 'ේ',    'eE': 'ේ',    'ē': 'ේ',
  'o': 'ො',     'oo': 'ෝ',    'oO': 'ෝ',    'ō': 'ෝ',
  'ae': 'ැ',    'æ': 'ැ',
  'aae': 'ෑ',   'aAe': 'ෑ',   'aæ': 'ෑ',
  'ai': 'ෛ',    'ay': 'ෛ',
  'au': 'ෞ',    'aw': 'ෞ',
};

// ─── Conjunct Consonants (pre-defined common combinations) ──────
export const sinhalaConjuncts: Record<string, string> = {
  'ksh': 'ක්ෂ්',
  'tr':  'ත්ර',
  'dr':  'ද්ර',
  'shr': 'ශ්‍ර',
  'gy':  'ග්‍ය',
  'dhm': 'ධ්ම්',
  'ndr': 'න්ද්‍ර',
  'nth': 'න්ත්',
  'mph': 'ම්ඵ්',
  'mb':  'ම්බ්',
  'nj':  'න්ජ්',
  'nd':  'න්ද්',
  'nk':  'න්ක්',
  'ng':  'න්ග්',
  'nt':  'න්ට්',
  'mp':  'ම්ප්',
  'nch': 'න්ච්',
  'tth': 'ත්ථ්',
  'ddh': 'ද්ධ්',
  'll':  'ල්ල්',
  'ss':  'ස්ස්',
  'nn':  'න්න්',
  'mm':  'ම්ම්',
  'yy':  'ය්ය්',
  'rr':  'ර්ර්',
  'lv':  'ල්ව්',
};

// ─── Special ligatures / repha forms ──────────────────────────────
export const sinhalaSpecial: Record<string, string> = {
  'ru': 'රු',
  'ruu': 'රූ', 'rU': 'රූ', 'rū': 'රූ',
  'ry': 'ර්‍ය',
};

// ─── Punctuation & Numbers ───────────────────────────────────────
export const sinhalaPunctuation: Record<string, string> = {
  '.': '.',
  ',': ',',
  ';': ';',
  ':': ':',
  '!': '!',
  '?': '?',
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
};

// ─── Consonant priority order for prefix matching ───────────────
// Longer matches first for greedy matching
export const consonantKeys = Object.keys(sinhalaConsonants).sort((a, b) => b.length - a.length);
export const conjunctKeys = Object.keys(sinhalaConjuncts).sort((a, b) => b.length - a.length);
export const vowelKeys = Object.keys(sinhalaVowelSigns).sort((a, b) => b.length - a.length);
export const standaloneVowelKeys = Object.keys(sinhalaVowels).sort((a, b) => b.length - a.length);