/**
 * Animation presets for Framer Motion — consistent motion language.
 */

export const spring = {
  gentle: { type: "spring" as const, stiffness: 300, damping: 30 },
  bouncy: { type: "spring" as const, stiffness: 400, damping: 25 },
  snappy: { type: "spring" as const, stiffness: 500, damping: 35 },
  slow:   { type: "spring" as const, stiffness: 200, damping: 30 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};

export const staggerChildren = (staggerMs = 60) => ({
  animate: { transition: { staggerChildren: staggerMs / 1000 } },
});
