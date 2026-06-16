/**
 * Keyboard Layouts for typewriter-style input.
 *
 * Each entry maps a physical key (with optional modifiers) to a Unicode character.
 * Shift variants are mapped via 'shift_' prefix or a separate shift map.
 */

// ─── Wijesekara Keyboard Layout ──────────────────────────────
// Standard Sri Lankan government Wijesekara layout
// Maps US QWERTY positions to Sinhala characters
export const wijesekaraLayout: Record<string, string> = {
  // Row 1: Number row
  '`': '්',  '1': 'ු',  '2': 'ූ',  '3': 'ෘ',  '4': 'ෙ',  '5': 'ේ',
  '6': 'ො',  '7': 'ෝ',  '8': 'ෛ',  '9': 'ැ',  '0': 'ෑ',  '-': 'ෞ',
  '=': 'ෟ',

  // Row 2: QWERTY row
  'q': 'ඌ',  'w': 'ඍ',  'e': 'එ',  'r': 'ර',  't': 'ට',  'y': 'ය',
  'u': 'උ',  'i': 'ඉ',  'o': 'ඔ',  'p': 'ප',  '[': '෴',  ']': '්',
  '\\': '්',

  // Row 3: Home row
  'a': 'ඇ',  's': 'ස',  'd': 'ඩ',  'f': 'ෆ',  'g': 'ග',  'h': 'හ',
  'j': 'ජ',  'k': 'ක',  'l': 'ල',  ';': 'ළ',  "'": '්',

  // Row 4: Bottom row
  'z': 'ලු', 'x': 'ෂ',  'c': 'ච',  'v': 'ව',  'b': 'බ',  'n': 'න',
  'm': 'ම',  ',': 'ඤ',  '.': '.,',  '/': 'ඞ',
};

export const wijesekaraShiftLayout: Record<string, string> = {
  // Row 1: Number row (shift)
  '~': '්',  '!': 'ෘ්',  '@': 'ෘ්',  '#': 'ෟ්',  '$': 'ේ',  '%': 'ේ්',
  '^': 'ෝ',  '&': 'ෝ්',  '*': 'ෛ්',  '(': 'ැ්',  ')': 'ෑ්',  '_': 'ෞ්',
  '+': 'ෟ්',

  // Row 2: Shift
  'Q': 'ළු', 'W': 'ළු',  'E': 'ඒ',  'R': 'ර්',  'T': 'ට්',  'Y': 'ය්',
  'U': 'ඌ',  'I': 'ඊ',  'O': 'ඕ',  'P': 'ඵ',  '{': '෴',  '}': '්',
  '|': '්',

  // Row 3: Shift
  'A': 'ඈ',  'S': 'ශ',  'D': 'ඪ',  'F': 'භ',  'G': 'ඝ',  'H': 'හ්',
  'J': 'ඣ',  'K': 'ඛ',  'L': 'ළ',  ':': '්',  '"': '්',

  // Row 4: Shift
  'Z': 'ළූ', 'X': 'ෂ්',  'C': 'ඡ',  'V': 'ව්',  'B': 'භ',  'N': 'ණ',
  'M': 'ඹ',  '<': '.,',  '>': '.,',  '?': 'ධ',
};

// ─── Tamil Typewriter Keyboard Layout ────────────────────────
// Standard Tamil typewriter (Typewriter-99 / Old Tamil typewriter)
export const tamilTypewriterLayout: Record<string, string> = {
  // Row 1: Number row
  '`': 'ஔ',  '1': '௧',  '2': '௨',  '3': '௩',  '4': '௪',  '5': '௫',
  '6': '௬',  '7': '௭',  '8': '௮',  '9': '௯',  '0': '௰',  '-': 'ஸ்',
  '=': 'ஷ்',

  // Row 2: QWERTY row
  'q': 'ஒ',  'w': 'எ',  'e': 'ஏ',  'r': 'ற்', 't': 'ட்',  'y': 'ஞ்',
  'u': 'உ',  'i': 'இ',  'o': 'ஓ',  'p': 'ப்',  '[': 'ள்',  ']': 'ழ்',
  '\\': 'ன்',

  // Row 3: Home row
  'a': 'ஆ',  's': 'ச்',  'd': 'ட்',  'f': 'த்',  'g': 'க்',  'h': 'ற',
  'j': 'ஜ்',  'k': 'ங்',  'l': 'ல்',  ';': 'ள',  "'": 'ழ்',

  // Row 4: Bottom row
  'z': 'அ',  'x': 'ஆ',  'c': 'இ',  'v': 'ஈ',  'b': 'உ',  'n': 'ண்',
  'm': 'ம்',  ',': 'ன',  '.': 'ந',  '/': 'ி',
};

export const tamilTypewriterShiftLayout: Record<string, string> = {
  // Row 1: Shift
  '~': 'ஔ',  '!': '௧',  '@': '௨',  '#': '௩',  '$': '௪',  '%': '௫',
  '^': '௬',  '&': '௭',  '*': '௮',  '(': '௯',  ')': '௰',  '_': 'ஸ்ர்',
  '+': 'ஷ்ர்',

  // Row 2: Shift
  'Q': 'க',  'W': 'க்',  'E': 'கூ',  'R': 'ற',  'T': 'ட',  'Y': 'ஞ',
  'U': 'ஊ',  'I': 'ஈ',  'O': 'கூ',  'P': 'ப',  '{': 'ள',  '}': 'ழ',
  '|': 'ன',

  // Row 3: Shift
  'A': 'ா',  'S': 'ச',  'D': 'ட',  'F': 'த',  'G': 'க',  'H': 'ற',
  'J': 'ஜ',  'K': 'ங',  'L': 'ல',  ':': 'ை',  '"': 'ை',

  // Row 4: Shift
  'Z': 'ள்', 'X': 'ற்',  'C': 'ன்',  'V': 'ந்',  'B': 'ண',  'N': 'ன',
  'M': 'ம',  '<': 'ை',  '>': 'ை',  '?': 'ர்',
};

/**
 * Resolve a key press to its mapped character for a given layout.
 */
export function resolveKey(
  key: string,
  layout: Record<string, string>,
  shiftLayout: Record<string, string>,
  shiftKey: boolean,
): string | null {
  if (shiftKey) {
    // Try shift layout first, then base layout with uppercase
    return shiftLayout[key] ?? layout[key.toUpperCase()] ?? null;
  }
  return layout[key.toLowerCase()] ?? null;
}