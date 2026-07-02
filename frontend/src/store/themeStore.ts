import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BgTheme    = 'classic' | 'midnight' | 'slate' | 'burgundy' | 'royal' | 'forest';
export type TableColor = 'green' | 'blue' | 'red' | 'black' | 'teal' | 'purple';
export type CardStyle  = 'classic' | 'fourcolor' | 'dark';

export interface BgThemeDef {
  bg:      string;
  accent:  string;
  name:    string;
  nameFr:  string;
}

export interface TableColorDef {
  center: string;
  mid:    string;
  edge:   string;
  name:   string;
  nameFr: string;
}

export interface CardStyleDef {
  name:     string;
  nameFr:   string;
  cardBg:   string;             // Tailwind bg class for the card face
  faceDown: string;             // Tailwind gradient + border for face-down card
  border:   string;             // Tailwind border class for face-up card
  text:     Record<string, string>; // Tailwind text-color classes per suit
  hex:      Record<string, string>; // Hex colors per suit (for SVG/canvas)
}

export const BG_THEMES: Record<BgTheme, BgThemeDef> = {
  classic:  { bg: '#0d2318', accent: '#1a4a2e', name: 'Classic Green',  nameFr: 'Vert Classic'   },
  midnight: { bg: '#08091a', accent: '#1a1f40', name: 'Midnight',        nameFr: 'Minuit'          },
  slate:    { bg: '#0f172a', accent: '#1e293b', name: 'Slate',           nameFr: 'Ardoise'         },
  burgundy: { bg: '#1a0810', accent: '#3d1020', name: 'Burgundy',        nameFr: 'Bordeaux'        },
  royal:    { bg: '#0d0818', accent: '#1e0f40', name: 'Royal Purple',    nameFr: 'Violet Royal'    },
  forest:   { bg: '#071510', accent: '#0f2e1a', name: 'Dark Forest',     nameFr: 'Forêt Noire'     },
};

export const TABLE_COLORS: Record<TableColor, TableColorDef> = {
  green:  { center: '#22733f', mid: '#155530', edge: '#0a3520', name: 'Classic Green', nameFr: 'Vert Classic'  },
  blue:   { center: '#1a4a7a', mid: '#0d3057', edge: '#061e38', name: 'Ocean Blue',    nameFr: 'Bleu Océan'    },
  red:    { center: '#7a1a1a', mid: '#571010', edge: '#380606', name: 'Casino Red',    nameFr: 'Rouge Casino'  },
  black:  { center: '#282828', mid: '#181818', edge: '#0a0a0a', name: 'Midnight Black',nameFr: 'Noir Absolu'   },
  teal:   { center: '#0a5a5a', mid: '#084040', edge: '#042828', name: 'Deep Teal',     nameFr: 'Teal Profond'  },
  purple: { center: '#3a1a6a', mid: '#280f50', edge: '#180830', name: 'Velvet',        nameFr: 'Velours'       },
};

export const CARD_STYLES: Record<CardStyle, CardStyleDef> = {
  classic: {
    name: 'Classic', nameFr: 'Classique',
    cardBg:   'bg-white',
    faceDown: 'from-blue-900 to-indigo-950 border-blue-700/80',
    border:   'border-gray-300/90',
    text: { h: 'text-red-600',  d: 'text-red-600',  c: 'text-gray-900', s: 'text-gray-900' },
    hex:  { h: '#dc2626',       d: '#dc2626',        c: '#111827',       s: '#111827'       },
  },
  fourcolor: {
    name: '4 Colors', nameFr: '4 Couleurs',
    cardBg:   'bg-white',
    faceDown: 'from-blue-900 to-indigo-950 border-blue-700/80',
    border:   'border-gray-300/90',
    text: { h: 'text-red-600',  d: 'text-blue-600', c: 'text-green-700', s: 'text-gray-900' },
    hex:  { h: '#dc2626',       d: '#1d4ed8',        c: '#15803d',        s: '#111827'       },
  },
  dark: {
    name: 'Dark', nameFr: 'Sombre',
    cardBg:   'bg-gray-700',
    faceDown: 'from-gray-700 to-slate-900 border-gray-500/80',
    border:   'border-gray-400/70',
    text: { h: 'text-red-400',  d: 'text-red-400',  c: 'text-gray-50', s: 'text-gray-50' },
    hex:  { h: '#f87171',       d: '#f87171',        c: '#f9fafb',      s: '#f9fafb'      },
  },
};

// ─── Legacy aliases (backward compat for external consumers) ─────────────────

export const SUIT_COLORS: Record<CardStyle, Record<string, string>> =
  Object.fromEntries(Object.entries(CARD_STYLES).map(([k, v]) => [k, v.hex])) as any;

// ─── Store ────────────────────────────────────────────────────────────────────

interface ThemeState {
  bgTheme:            BgTheme;
  tableColor:         TableColor;
  /** Card style for training exercises (table, live play) */
  trainingCardStyle:  CardStyle;
  /** Card style for static display contexts (rules, explanations) */
  displayCardStyle:   CardStyle;

  setBgTheme:             (t: BgTheme)    => void;
  setTableColor:          (c: TableColor) => void;
  setTrainingCardStyle:   (s: CardStyle)  => void;
  setDisplayCardStyle:    (s: CardStyle)  => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      bgTheme:           'classic',
      tableColor:        'green',
      trainingCardStyle: 'classic',
      displayCardStyle:  'classic',

      setBgTheme:             (bgTheme)           => set({ bgTheme }),
      setTableColor:          (tableColor)        => set({ tableColor }),
      setTrainingCardStyle:   (trainingCardStyle) => set({ trainingCardStyle }),
      setDisplayCardStyle:    (displayCardStyle)  => set({ displayCardStyle }),
    }),
    { name: 'poker-theme' }
  )
);
