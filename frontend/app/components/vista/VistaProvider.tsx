'use client';

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { interpolatePhase } from './engine/phases';
import { advanceTime, getStoredHour, getStoredSpeed, storeHour, storeSpeed, type Speed } from './engine/timeEngine';
import { cycleWeather, randomWeather, nextWeatherChangeHours, type Weather } from './engine/weatherEngine';
import { getCurrentSeason, getSeasonConfig, type SeasonConfig } from './engine/seasonEngine';
import type { Season } from './engine/weatherEngine';
import type { Workstream } from './engine/characters';

export interface VistaState {
  hour: number;
  speed: Speed;
  weather: Weather;
  weatherAuto: boolean;
  season: Season;
  seasonConfig: SeasonConfig;
  phaseName: string;
  colors: [string, string, string, string, string];
  sun: number; moon: number; stars: number; lamp: number; ember: number;
  activeWorkstream?: Workstream;
  forceHour?: number;
  setSpeed: (s: Speed) => void;
  toggleWeather: () => void;
  setActiveWorkstream: (w?: Workstream) => void;
}

export const VistaContext = createContext<VistaState | null>(null);

export default function VistaProvider({ children, forceHour }: { children: ReactNode; forceHour?: number }) {
  const season = getCurrentSeason();
  const seasonConfig = getSeasonConfig(season);

  const [hour, setHour] = useState(() => forceHour ?? getStoredHour());
  const [speed, setSpeedState] = useState<Speed>(() => getStoredSpeed());
  const [weather, setWeather] = useState<Weather>('clear');
  const [weatherAuto, setWeatherAuto] = useState(true);
  const [activeWorkstream, setActiveWorkstream] = useState<Workstream | undefined>();
  const nextWeatherChange = useRef(nextWeatherChangeHours());
  const weatherAccum = useRef(0);
  const lastTs = useRef(0);

  const setSpeed = useCallback((s: Speed) => { setSpeedState(s); storeSpeed(s); }, []);

  const toggleWeather = useCallback(() => {
    if (weatherAuto) {
      setWeatherAuto(false);
      setWeather(w => cycleWeather(w));
    } else {
      const next = cycleWeather(weather);
      if (next === 'clear') {
        setWeatherAuto(true);
      }
      setWeather(next);
    }
  }, [weather, weatherAuto]);

  // Main animation loop
  useEffect(() => {
    if (forceHour !== undefined) { setHour(forceHour); return; }
    let raf: number;
    const tick = (ts: number) => {
      if (lastTs.current === 0) lastTs.current = ts;
      const delta = Math.min(ts - lastTs.current, 100); // cap at 100ms
      lastTs.current = ts;

      setHour(prev => {
        const next = advanceTime(prev, delta, speed);
        // Store periodically (every ~1s worth of frames)
        if (Math.floor(prev * 10) !== Math.floor(next * 10)) storeHour(next);
        return next;
      });

      // Auto weather
      if (weatherAuto) {
        const hoursElapsed = (delta * speed) / 3_600_000;
        weatherAccum.current += hoursElapsed;
        if (weatherAccum.current >= nextWeatherChange.current) {
          weatherAccum.current = 0;
          nextWeatherChange.current = nextWeatherChangeHours();
          setWeather(randomWeather(season));
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed, weatherAuto, season, forceHour]);

  // Apply CSS variables to document
  const phase = interpolatePhase(hour);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sky-top', phase.colors[0]);
    root.style.setProperty('--sky-mid', phase.colors[1]);
    root.style.setProperty('--sky-warm', phase.colors[2]);
    root.style.setProperty('--sky-gold', phase.colors[3]);
    root.style.setProperty('--sky-peach', phase.colors[4]);
    root.style.setProperty('--sun-opacity', String(phase.sun));
    root.style.setProperty('--moon-opacity', String(phase.moon));
    root.style.setProperty('--stars-opacity', String(phase.stars));
    root.style.setProperty('--lamp-opacity', String(phase.lamp));
    root.style.setProperty('--ember-opacity', String(phase.ember));
    // Also update bg-void for ambient
    root.style.setProperty('--bg-void', phase.colors[0]);
  });

  const value: VistaState = {
    hour, speed, weather, weatherAuto, season, seasonConfig, forceHour,
    phaseName: phase.name,
    colors: phase.colors,
    sun: phase.sun, moon: phase.moon, stars: phase.stars, lamp: phase.lamp, ember: phase.ember,
    activeWorkstream,
    setSpeed, toggleWeather, setActiveWorkstream,
  };

  return <VistaContext.Provider value={value}>{children}</VistaContext.Provider>;
}
