import { create } from 'zustand';

export interface CustomFont {
  id: string;
  name: string;
  family: string;
  // We keep the FontFace object reference so we can unregister
  fontFace: FontFace;
}

interface CustomFontsState {
  fonts: CustomFont[];
  addFont: (font: CustomFont) => void;
  removeFont: (id: string) => void;
}

export const useCustomFontsStore = create<CustomFontsState>((set) => ({
  fonts: [],
  addFont: (font) =>
    set((state) => ({
      fonts: [...state.fonts, font],
    })),
  removeFont: (id) =>
    set((state) => {
      const font = state.fonts.find((f) => f.id === id);
      if (font) {
        // Unregister the font from the browser
        try {
          document.fonts.delete(font.fontFace);
        } catch {
          // font may already be removed
        }
      }
      return {
        fonts: state.fonts.filter((f) => f.id !== id),
      };
    }),
}));