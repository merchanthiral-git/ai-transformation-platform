export type Weather = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const WEATHER_ORDER: Weather[] = ['clear', 'rain', 'snow', 'fog', 'storm'];

export function cycleWeather(current: Weather): Weather {
  const idx = WEATHER_ORDER.indexOf(current);
  return WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
}

/** Season-weighted weather probabilities for auto mode */
const SEASON_WEIGHTS: Record<Season, Record<Weather, number>> = {
  spring: { clear: 0.4, rain: 0.35, snow: 0.0, fog: 0.2, storm: 0.05 },
  summer: { clear: 0.6, rain: 0.15, snow: 0.0, fog: 0.05, storm: 0.2 },
  autumn: { clear: 0.35, rain: 0.3, snow: 0.05, fog: 0.25, storm: 0.05 },
  winter: { clear: 0.3, rain: 0.1, snow: 0.4, fog: 0.15, storm: 0.05 },
};

/** Pick a random weather based on season weights */
export function randomWeather(season: Season): Weather {
  const weights = SEASON_WEIGHTS[season];
  const r = Math.random();
  let sum = 0;
  for (const [w, p] of Object.entries(weights)) {
    sum += p;
    if (r <= sum) return w as Weather;
  }
  return 'clear';
}

/** Auto-change interval: every 3-8 in-world hours */
export function nextWeatherChangeHours(): number {
  return 3 + Math.random() * 5;
}
