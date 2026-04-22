export interface Phase {
  hour: number;
  name: string;
  colors: [string, string, string, string, string]; // sky-top, sky-mid, sky-warm, sky-gold, sky-peach
  sun: number;
  moon: number;
  stars: number;
  lamp: number;
  ember: number;
}

export const phases: Phase[] = [
  { hour: 0,  name: 'MIDNIGHT',     colors: ['#040614','#0a0d22','#161a3a','#1e2448','#252b54'], sun: 0,   moon: 1,   stars: 0.9, lamp: 1,   ember: 0.8 },
  { hour: 4,  name: 'PRE-DAWN',     colors: ['#0a0d22','#1a1a40','#2a2448','#3a2c48','#4a3254'], sun: 0,   moon: 0.8, stars: 0.7, lamp: 1,   ember: 0.8 },
  { hour: 6,  name: 'DAWN',         colors: ['#1a2048','#3a2860','#8a4860','#c86858','#e89868'], sun: 0.3, moon: 0.2, stars: 0.2, lamp: 0.7, ember: 0.5 },
  { hour: 7,  name: 'SUNRISE',      colors: ['#2a3a7a','#5a4a8a','#c86878','#e89878','#f5b888'], sun: 0.8, moon: 0,   stars: 0,   lamp: 0.3, ember: 0.2 },
  { hour: 8,  name: 'MORNING',      colors: ['#3a5a8a','#6a8aba','#9abaca','#c8d4da','#e0e5e8'], sun: 1,   moon: 0,   stars: 0,   lamp: 0.1, ember: 0.1 },
  { hour: 12, name: 'NOON',         colors: ['#4a7aba','#6a9acc','#8abadc','#aacae4','#cadae8'], sun: 1,   moon: 0,   stars: 0,   lamp: 0,   ember: 0   },
  { hour: 16, name: 'AFTERNOON',    colors: ['#2a4a8a','#4a6aaa','#8a6aaa','#d88a6a','#e8a860'], sun: 1,   moon: 0,   stars: 0,   lamp: 0.1, ember: 0.1 },
  { hour: 18, name: 'GOLDEN HOUR',  colors: ['#1a1f3a','#4a3a5e','#c76846','#e8a050','#f4c27a'], sun: 1,   moon: 0,   stars: 0.3, lamp: 0.8, ember: 0.6 },
  { hour: 20, name: 'SUNSET',       colors: ['#0a0c28','#2a1c48','#6a2a58','#a84854','#c06858'], sun: 0.2, moon: 0.5, stars: 0.6, lamp: 1,   ember: 0.8 },
  { hour: 22, name: 'DUSK',         colors: ['#040a20','#0a1028','#181830','#222038','#2a2840'], sun: 0,   moon: 1,   stars: 0.9, lamp: 1,   ember: 0.9 },
  { hour: 24, name: 'MIDNIGHT',     colors: ['#040614','#0a0d22','#161a3a','#1e2448','#252b54'], sun: 0,   moon: 1,   stars: 0.9, lamp: 1,   ember: 0.8 },
];

/** Linearly interpolate between two phases based on fractional hour */
export function interpolatePhase(hour: number): {
  colors: [string, string, string, string, string];
  sun: number; moon: number; stars: number; lamp: number; ember: number;
  name: string;
} {
  const h = ((hour % 24) + 24) % 24;
  let a = phases[phases.length - 2]; // wrap
  let b = phases[1];
  for (let i = 0; i < phases.length - 1; i++) {
    if (h >= phases[i].hour && h < phases[i + 1].hour) {
      a = phases[i];
      b = phases[i + 1];
      break;
    }
  }
  const range = b.hour - a.hour || 1;
  const t = (h - a.hour) / range;

  const lerpHex = (c1: string, c2: string, t: number): string => {
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const bv = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bv.toString(16).padStart(2,'0')}`;
  };
  const lerp = (v1: number, v2: number, t: number) => v1 + (v2 - v1) * t;

  return {
    colors: a.colors.map((c, i) => lerpHex(c, b.colors[i], t)) as [string,string,string,string,string],
    sun: lerp(a.sun, b.sun, t),
    moon: lerp(a.moon, b.moon, t),
    stars: lerp(a.stars, b.stars, t),
    lamp: lerp(a.lamp, b.lamp, t),
    ember: lerp(a.ember, b.ember, t),
    name: t < 0.5 ? a.name : b.name,
  };
}
