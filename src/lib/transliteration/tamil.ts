/**
 * Tamil Transliteration Data
 *
 * Maps latin (English) phonetic input to Tamil Unicode.
 * Uses a compositional model similar to Sinhala.
 */

// ─── Standalone Vowels ────────────────────────────────────────
export const tamilVowels: Record<string, string> = {
  'a': 'அ',     'aa': 'ஆ',     'aA': 'ஆ',     'ā': 'ஆ',
  'i': 'இ',     'ii': 'ஈ',     'iI': 'ஈ',     'ī': 'ஈ',
  'u': 'உ',     'uu': 'ஊ',     'uU': 'ஊ',     'ū': 'ஊ',
  'e': 'எ',     'ee': 'ஏ',     'eE': 'ஏ',     'ē': 'ஏ',
  'ai': 'ஐ',    'ay': 'ஐ',
  'o': 'ஒ',     'oo': 'ஓ',     'oO': 'ஓ',     'ō': 'ஓ',
  'au': 'ஔ',    'aw': 'ஔ',
};

// ─── Consonant Base Forms (with pulli ்) ─────────────────────
export const tamilConsonants: Record<string, string> = {
  'k':  'க்',  'g':  'க்',
  'c':  'ச்',  'ch': 'ச்',  's':  'ச்',
  'j':  'ஜ்',  'z':  'ஜ்',
  't':  'ட்',  'd':  'ட்',
  'T':  'த்',  'th': 'த்',  'D':  'த்',  'dh': 'த்',
  'n':  'ன்',  'N':  'ண்',
  'p':  'ப்',  'b':  'ப்',
  'm':  'ம்',
  'y':  'ய்',
  'r':  'ற்',  'R':  'ழ்',
  'l':  'ல்',  'L':  'ள்',
  'v':  'வ்',  'w':  'வ்',
  'S':  'ஷ்',  'sh': 'ஷ்',
  'h':  'ஹ்',
  'ny': 'ஞ்',
  'ng': 'ங்',
  'jn': 'ஜ்ஞ்',
  'ks': 'க்ஷ்', 'ksh': 'க்ஷ்', 'x': 'க்ஷ்',
  'sr': 'ஸ்ர்',
};

// ─── Vowel Signs (combining forms after consonants) ────────────
export const tamilVowelSigns: Record<string, string> = {
  'a': '',       // implicit – remove pulli
  'aa': 'ா',    'aA': 'ா',    'ā': 'ா',
  'i': 'ி',     'ii': 'ீ',    'iI': 'ீ',    'ī': 'ீ',
  'u': 'ு',     'uu': 'ூ',    'uU': 'ூ',    'ū': 'ூ',
  'e': 'ெ',     'ee': 'ே',    'eE': 'ே',    'ē': 'ே',
  'ai': 'ை',    'ay': 'ை',
  'o': 'ொ',     'oo': 'ோ',    'oO': 'ோ',    'ō': 'ோ',
  'au': 'ௌ',    'aw': 'ௌ',
};

// ─── Conjunct Consonants ───────────────────────────────────────
export const tamilConjuncts: Record<string, string> = {
  'kt':  'க்ட்',  'kp':  'க்ப்',  'ksh': 'க்ஷ்',
  'nt':  'ந்த்',  'nth': 'ந்த்',  'nd':  'ந்த்',  'nj':  'ஞ்ச்',
  'mp':  'ம்ப்',  'mb':  'ம்ப்',  'mm':  'ம்ம்',
  'ny':  'ஞ்',
  'ng':  'ங்',
  'tt':  'ட்ட்',  'tth': 'த்த்',
  'pr':  'ப்ர்',  'pl':  'ப்ல்',
  'tr':  'த்ர்',
  'dr':  'த்ர்',
  'gr':  'க்ர்',
  'kr':  'க்ர்',
  'shr': 'ஷ்ர்',  'sr':  'ஸ்ர்',
  'sk':  'ஸ்க்',
  'st':  'ஸ்ட்',
  'sp':  'ஸ்ப்',
  'sn':  'ஸ்ன்',
  'sm':  'ஸ்ம்',
  'sv':  'ஸ்வ்',
  'ksv': 'க்ஸ்வ்',
};

// ─── Punctuation & Numbers ────────────────────────────────────
export const tamilPunctuation: Record<string, string> = {
  '.': '.',
  ',': ',',
  ';': ';',
  ':': ':',
  '!': '!',
  '?': '?',
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
};

// ─── Keys sorted by length (longest first) for greedy matching ─
export const consonantKeys = Object.keys(tamilConsonants).sort((a, b) => b.length - a.length);
export const conjunctKeys = Object.keys(tamilConjuncts).sort((a, b) => b.length - a.length);
export const vowelKeys = Object.keys(tamilVowelSigns).sort((a, b) => b.length - a.length);
export const standaloneVowelKeys = Object.keys(tamilVowels).sort((a, b) => b.length - a.length);