export const tokens = {
  color: {
    // Canvas & surface stack (Linear dark)
    ivory: '#0B0D12',
    ivoryDeep: '#0B0D12',
    ivoryCard: '#1D2130',
    ivoryPaper: '#151821',
    ivoryWash: '#1A2438',

    // Text / ink stack
    navy: '#E8EAED',
    navySoft: '#9BA1B0',
    navyLine: '#3A4054',

    // Primary action (blue)
    blue: '#5B8DEF',
    blueBright: '#7AA3F5',
    bluePale: '#1A2438',
    blueWash: '#1A2438',

    // Attention (orange)
    orange: '#FF8A3D',
    orangeBright: '#FFA15F',
    orangePale: '#2B1C10',
    orangeWash: '#2B1C10',

    // Text scale
    ink: '#E8EAED',
    inkSoft: '#9BA1B0',
    inkMute: '#6B7180',
    inkFaint: '#4A4F5C',

    // Lines / borders
    line: '#2A2F3E',
    lineSoft: '#1D2130',
    lineFaint: '#1D2130',

    // Semantic
    danger: '#FF5A5F',
    dangerPale: '#2B1418',
    green: '#3DDC97',
    greenPale: '#0F2B1F',
    gold: '#F5C451',
    purple: '#5B8DEF',
    teal: '#3DDC97',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 2px 8px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)',
    lg: '0 12px 32px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25)',
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
  exec:       { from: '#E8EAED', to: '#3A4054' },
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
