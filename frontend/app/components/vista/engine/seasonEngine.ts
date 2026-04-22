import type { Season } from './weatherEngine';

export function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export interface SeasonConfig {
  treeStyle: 'bare' | 'blossom' | 'full' | 'autumn';
  particles: 'none' | 'petals' | 'fireflies' | 'leaves';
  cloudTint: string;
  nightExtra: 'none' | 'aurora';
}

export function getSeasonConfig(season: Season): SeasonConfig {
  switch (season) {
    case 'winter': return { treeStyle: 'bare', particles: 'none', cloudTint: '#8a9ab8', nightExtra: 'aurora' };
    case 'spring': return { treeStyle: 'blossom', particles: 'petals', cloudTint: '#c8a8b8', nightExtra: 'none' };
    case 'summer': return { treeStyle: 'full', particles: 'fireflies', cloudTint: '#b8c8d8', nightExtra: 'none' };
    case 'autumn': return { treeStyle: 'autumn', particles: 'leaves', cloudTint: '#c8a888', nightExtra: 'none' };
  }
}
