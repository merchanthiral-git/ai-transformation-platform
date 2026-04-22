const STORAGE_KEY = 'vista-speed';
const STORAGE_HOUR_KEY = 'vista-hour';

export type Speed = 1 | 60 | 600;

export function getStoredSpeed(): Speed {
  if (typeof window === 'undefined') return 60;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === '1' || v === '60' || v === '600') return Number(v) as Speed;
  return 60;
}

export function storeSpeed(s: Speed) {
  localStorage.setItem(STORAGE_KEY, String(s));
}

export function getStoredHour(): number {
  if (typeof window === 'undefined') return 18;
  const v = localStorage.getItem(STORAGE_HOUR_KEY);
  return v ? parseFloat(v) : 18;
}

export function storeHour(h: number) {
  localStorage.setItem(STORAGE_HOUR_KEY, String(h));
}

/**
 * Advance the world clock.
 * Returns new fractional hour (0-24).
 * At speed=1, 1 real second = 1 real second.
 * At speed=60, 1 real second = 1 in-world minute.
 * At speed=600, 1 real second = 10 in-world minutes.
 */
export function advanceTime(currentHour: number, deltaMs: number, speed: Speed): number {
  // hours per real millisecond at given speed
  const hoursPerMs = speed / 3_600_000;
  let next = currentHour + deltaMs * hoursPerMs;
  if (next >= 24) next -= 24;
  if (next < 0) next += 24;
  return next;
}
