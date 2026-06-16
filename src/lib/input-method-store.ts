import { create } from 'zustand';
import type { TransliterationMode } from '@/lib/transliteration';

export interface LanguageFontConfig {
  english: string;
  sinhalaSinglish: string;
  sinhalaWijesekara: string;
  tamilUnicode: string;
  tamilTypewriter: string;
}

export const DEFAULT_FONTS: LanguageFontConfig = {
  english: 'sans',
  sinhalaSinglish: 'Noto Sans Sinhala',
  sinhalaWijesekara: 'Noto Sans Sinhala',
  tamilUnicode: 'Noto Sans Tamil',
  tamilTypewriter: 'Noto Sans Tamil',
};

interface InputMethodState {
  activeMode: TransliterationMode;
  fonts: LanguageFontConfig;
  setActiveMode: (mode: TransliterationMode) => void;
  setFont: (mode: keyof LanguageFontConfig, fontFamily: string) => void;
  getActiveFont: () => string;
}

export const useInputMethodStore = create<InputMethodState>((set, get) => ({
  activeMode: 'english',
  fonts: { ...DEFAULT_FONTS },

  setActiveMode: (mode) => set({ activeMode: mode }),

  setFont: (mode, fontFamily) =>
    set((state) => ({
      fonts: { ...state.fonts, [mode]: fontFamily },
    })),

  getActiveFont: () => {
    const { activeMode, fonts } = get();
    switch (activeMode) {
      case 'sinhala-singlish': return fonts.sinhalaSinglish;
      case 'sinhala-wijesekara': return fonts.sinhalaWijesekara;
      case 'tamil-unicode': return fonts.tamilUnicode;
      case 'tamil-typewriter': return fonts.tamilTypewriter;
      default: return fonts.english;
    }
  },
}));