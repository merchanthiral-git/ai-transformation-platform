export const tokens = {
  color: {
    // Warm ivory surface stack
    ivory: '#EFE9D9',
    ivoryDeep: '#E3D9BF',
    ivoryCard: '#F8F2E1',
    ivoryPaper: '#FCF7E8',
    ivoryWash: '#F4EED9',

    // Deep navy ink stack
    navy: '#051530',
    navySoft: '#0F2748',
    navyLine: '#22406B',

    // Primary blue
    blue: '#0E47B8',
    blueBright: '#2869DC',
    bluePale: '#CFDDF5',
    blueWash: '#EAF0FA',

    // Signal orange
    orange: '#D6611A',
    orangeBright: '#EB7A30',
    orangePale: '#F4D0AE',
    orangeWash: '#FAEBD7',

    // Ink scale (text)
    ink: '#051530',
    inkSoft: '#2E4466',
    inkMute: '#6C7F9A',
    inkFaint: '#A0AFC3',

    // Lines
    line: '#CEC09F',
    lineSoft: '#DED3B5',
    lineFaint: '#E8DFC4',

    // Semantic
    danger: '#9A362A',
    dangerPale: '#DFC2BB',
    green: '#2F6B4A',
    greenPale: '#C5D4C7',
    gold: '#AA8A46',
    purple: '#6B3E99',
    teal: '#2A7A78',
  },
  shadow: {
    sm: '0 1px 2px rgba(5,21,48,0.04)',
    md: '0 2px 8px rgba(5,21,48,0.06), 0 1px 2px rgba(5,21,48,0.04)',
    lg: '0 12px 32px rgba(5,21,48,0.08), 0 4px 8px rgba(5,21,48,0.04)',
  },
  font: {
    display: "'Fraunces', serif",
    body: "'Inter Tight', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  motion: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    fast: '150ms',
    base: '250ms',
    slow: '350ms',
  },
} as const;

export const FUNC_BANDS: Record<string, { from: string; to: string }> = {
  finance:    { from: '#1E6EC7', to: '#3C8AE0' },
  ops:        { from: '#5A7A2E', to: '#7A9A4E' },
  legal:      { from: '#7B3E99', to: '#9C5FB8' },
  hr:         { from: '#AA6A3A', to: '#C98855' },
  marketing:  { from: '#D13F6A', to: '#E55F86' },
  commercial: { from: '#0E7F7C', to: '#2FA19E' },
  digital:    { from: '#3A4CC7', to: '#5E6FE2' },
  brand:      { from: '#B5541E', to: '#D47230' },
  exec:       { from: tokens.color.navy, to: tokens.color.navyLine },
};

export type TabId = 'strategy' | 'operating-model' | 'structure' | 'principles' | 'accountability' | 'work-talent' | 'execution' | 'methodology';

export const TABS: { id: TabId; label: string }[] = [
  { id: 'strategy', label: 'Strategy' },
  { id: 'operating-model', label: 'Operating Model' },
  { id: 'structure', label: 'Structure' },
  { id: 'principles', label: 'Principles' },
  { id: 'accountability', label: 'Accountability' },
  { id: 'work-talent', label: 'Work & Talent' },
  { id: 'execution', label: 'Execution' },
  { id: 'methodology', label: 'Methodology' },
];
