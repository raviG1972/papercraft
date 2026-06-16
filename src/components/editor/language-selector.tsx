'use client';

import { useInputMethodStore } from '@/lib/input-method-store';
import type { TransliterationMode } from '@/lib/transliteration';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Languages } from 'lucide-react';

const LANGUAGES: { value: TransliterationMode; label: string; shortLabel: string; description: string }[] = [
  { value: 'english', label: 'English', shortLabel: 'EN', description: 'Standard English typing' },
  { value: 'sinhala-singlish', label: 'සිංහල Singlish', shortLabel: 'සිං', description: 'Type in English, get Sinhala (e.g. "kaa" → කා)' },
  { value: 'sinhala-wijesekara', label: 'සිංහල Wijesekara', shortLabel: 'විජේ', description: 'Sinhala typewriter keyboard layout' },
  { value: 'tamil-unicode', label: 'தமிழ் Unicode', shortLabel: 'தமி', description: 'Type in English, get Tamil (e.g. "kaa" → கா)' },
  { value: 'tamil-typewriter', label: 'தமிழ் Typewriter', shortLabel: 'டைப்', description: 'Tamil typewriter keyboard layout' },
];

export function LanguageSelector() {
  const { activeMode, setActiveMode } = useInputMethodStore();

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center h-7 w-7">
            <Languages className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Input Language
        </TooltipContent>
      </Tooltip>

      <ToggleGroup
        type="single"
        value={activeMode}
        onValueChange={(val) => {
          if (val) setActiveMode(val as TransliterationMode);
        }}
        className="gap-0.5"
      >
        {LANGUAGES.map((lang) => (
          <Tooltip key={lang.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={lang.value}
                aria-label={lang.label}
                className={`h-8 px-2 text-[11px] font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground ${
                  lang.value === 'sinhala-singlish' || lang.value === 'sinhala-wijesekara'
                    ? 'data-[state=on]:bg-amber-600 data-[state=on]:text-white'
                    : lang.value === 'tamil-unicode' || lang.value === 'tamil-typewriter'
                      ? 'data-[state=on]:bg-teal-600 data-[state=on]:text-white'
                      : ''
                }`}
              >
                {lang.shortLabel}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              <p className="font-medium">{lang.label}</p>
              <p className="text-muted-foreground mt-0.5">{lang.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </div>
  );
}