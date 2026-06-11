import type { CreatureForm, ElementType } from '../types';

export interface GymLeader {
  tier: number;
  name: string;
  element: ElementType;
  creature: CreatureForm;
  badgeReward: string;
}

export const GYM_LEADERS: Record<number, GymLeader> = {
  1: {
    tier: 1,
    name: 'Rocky (Granite)',
    element: 'Rock',
    badgeReward: 'Granite Badge',
    creature: { name: 'Pebbleton', stage: 0, type: 'Rock', stats: { hp: 50, atk: 14, def: 18, spd: 5 } }
  },
  2: {
    tier: 2,
    name: 'Marina (Wave)',
    element: 'Water',
    badgeReward: 'Wave Badge',
    creature: { name: 'Aquastream', stage: 1, type: 'Water', stats: { hp: 60, atk: 20, def: 16, spd: 18 } }
  },
  3: {
    tier: 3,
    name: 'Sparky (Volt)',
    element: 'Electric',
    badgeReward: 'Volt Badge',
    creature: { name: 'Thunderfang', stage: 1, type: 'Electric', stats: { hp: 65, atk: 24, def: 14, spd: 22 } }
  },
  4: {
    tier: 4,
    name: 'Flora (Bloom)',
    element: 'Grass',
    badgeReward: 'Bloom Badge',
    creature: { name: 'Solarvine', stage: 2, type: 'Grass', stats: { hp: 75, atk: 26, def: 22, spd: 15 } }
  },
  5: {
    tier: 5,
    name: 'Toxa (Sludge)',
    element: 'Poison',
    badgeReward: 'Sludge Badge',
    creature: { name: 'Oozemonster', stage: 1, type: 'Poison', stats: { hp: 85, atk: 25, def: 28, spd: 14 } }
  },
  6: {
    tier: 6,
    name: 'Mentis (Mind)',
    element: 'Psychic',
    badgeReward: 'Mind Badge',
    creature: { name: 'Psyclopse', stage: 2, type: 'Psychic', stats: { hp: 80, atk: 32, def: 18, spd: 28 } }
  },
  7: {
    tier: 7,
    name: 'Ignis (Flare)',
    element: 'Fire',
    badgeReward: 'Flare Badge',
    creature: { name: 'Infernawl', stage: 1, type: 'Fire', stats: { hp: 90, atk: 34, def: 20, spd: 25 } }
  },
  8: {
    tier: 8,
    name: 'Terra (Seismic)',
    element: 'Ground',
    badgeReward: 'Seismic Badge',
    creature: { name: 'Terraking', stage: 1, type: 'Ground', stats: { hp: 105, atk: 36, def: 32, spd: 16 } }
  }
};

export const CHAMPION = {
  name: 'Champion Alden',
  party: [
    { name: 'Psyclopse', stage: 2, type: 'Psychic', stats: { hp: 120, atk: 40, def: 25, spd: 40 } },
    { name: 'Wyrmshadow', stage: 1, type: 'Dragon', stats: { hp: 135, atk: 45, def: 35, spd: 38 } },
    { name: 'Titanox', stage: 2, type: 'Steel', stats: { hp: 150, atk: 48, def: 50, spd: 25 } }
  ] as CreatureForm[]
};
