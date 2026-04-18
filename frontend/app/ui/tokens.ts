/**
 * Typed token access — maps semantic token names to CSS variable references.
 * Not "use client" — safe to import in server components and config files.
 */

export const colors = {
  // Semantic status
  semSuccess:       "var(--sem-success)",
  semSuccessBg:     "var(--sem-success-bg)",
  semSuccessBorder: "var(--sem-success-border)",
  semWarn:          "var(--sem-warn)",
  semWarnBg:        "var(--sem-warn-bg)",
  semWarnBorder:    "var(--sem-warn-border)",
  semRisk:          "var(--sem-risk)",
  semRiskBg:        "var(--sem-risk-bg)",
  semRiskBorder:    "var(--sem-risk-border)",
  semInfo:          "var(--sem-info)",
  semInfoBg:        "var(--sem-info-bg)",
  semInfoBorder:    "var(--sem-info-border)",
  semInsight:       "var(--sem-insight)",
  semInsightBg:     "var(--sem-insight-bg)",
  semInsightBorder: "var(--sem-insight-border)",

  // Chart data palette
  data1: "var(--data-1)",
  data2: "var(--data-2)",
  data3: "var(--data-3)",
  data4: "var(--data-4)",
  data5: "var(--data-5)",
  data6: "var(--data-6)",
  data7: "var(--data-7)",
  data8: "var(--data-8)",

  // Data role colors
  dataHuman:     "var(--data-human)",
  dataAi:        "var(--data-ai)",
  dataAugmented: "var(--data-augmented)",
  dataRisk:      "var(--data-risk)",
  dataScenario:  "var(--data-scenario)",

  // Career track colors
  trackE: "var(--track-E)",
  trackM: "var(--track-M)",
  trackP: "var(--track-P)",
  trackS: "var(--track-S)",
  trackT: "var(--track-T)",

  // Accent
  accentPrimary: "var(--accent-primary)",
  accentLight:   "var(--accent-light)",

  // Text
  textPrimary:   "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted:     "var(--text-muted)",

  // Surface
  bg:       "var(--bg)",
  surface1: "var(--surface-1)",
  surface2: "var(--surface-2)",
  surface3: "var(--surface-3)",

  // Border / interactive
  border:   "var(--border)",
  hover:    "var(--hover)",
  activeBg: "var(--active-bg)",
} as const;

export type ColorToken = keyof typeof colors;

export const spacing = {
  sp1:  "var(--sp-1)",
  sp2:  "var(--sp-2)",
  sp3:  "var(--sp-3)",
  sp4:  "var(--sp-4)",
  sp5:  "var(--sp-5)",
  sp6:  "var(--sp-6)",
  sp8:  "var(--sp-8)",
  sp10: "var(--sp-10)",
  sp12: "var(--sp-12)",
  sp16: "var(--sp-16)",

  // Stack tokens
  stackSm: "var(--stack-sm)",
  stackMd: "var(--stack-md)",
  stackLg: "var(--stack-lg)",
  stackXl: "var(--stack-xl)",

  // Card / sidebar
  cardPadding:  "var(--card-padding)",
  sidebarWidth: "var(--sidebar-width)",
} as const;

export type SpacingToken = keyof typeof spacing;

export const motion = {
  // Easing functions
  easeSpring: "var(--ease-spring)",
  easeOut:    "var(--ease-out)",
  easeInOut:  "var(--ease-in-out)",

  // Durations
  durationFast:   "var(--duration-fast)",
  durationBase:   "var(--duration-base)",
  durationSlow:   "var(--duration-slow)",
  durationSlower: "var(--duration-slower)",
} as const;

export type MotionToken = keyof typeof motion;

export const shadows = {
  shadow0: "var(--shadow-0)",
  shadow1: "var(--shadow-1)",
  shadow2: "var(--shadow-2)",
  shadow3: "var(--shadow-3)",
  shadow4: "var(--shadow-4)",
} as const;

export type ShadowToken = keyof typeof shadows;
