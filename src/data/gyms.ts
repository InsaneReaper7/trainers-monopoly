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
    name: 'Brock (Boulder)',
    element: 'Rock',
    badgeReward: 'Boulder Badge',
    creature: { name: 'Geodude', stage: 0, type: 'Rock', stats: { hp: 45, atk: 15, def: 20, spd: 5 } }
  },
  2: {
    tier: 2,
    name: 'Misty (Cascade)',
    element: 'Water',
    badgeReward: 'Cascade Badge',
    creature: { name: 'Starmie', stage: 1, type: 'Water', stats: { hp: 55, atk: 20, def: 18, spd: 22 } }
  },
  3: {
    tier: 3,
    name: 'Surge (Thunder)',
    element: 'Electric',
    badgeReward: 'Thunder Badge',
    creature: { name: 'Raichu', stage: 1, type: 'Electric', stats: { hp: 60, atk: 25, def: 15, spd: 25 } }
  },
  4: {
    tier: 4,
    name: 'Erika (Rainbow)',
    element: 'Grass',
    badgeReward: 'Rainbow Badge',
    creature: { name: 'Vileplume', stage: 2, type: 'Grass', stats: { hp: 70, atk: 22, def: 22, spd: 15 } }
  },
  5: {
    tier: 5,
    name: 'Koga (Soul)',
    element: 'Poison',
    badgeReward: 'Soul Badge',
    creature: { name: 'Weezing', stage: 1, type: 'Poison', stats: { hp: 80, atk: 25, def: 30, spd: 18 } }
  },
  6: {
    tier: 6,
    name: 'Sabrina (Marsh)', // Swapped badge names technically but following GDD structure
    element: 'Psychic',
    badgeReward: 'Marsh Badge',
    creature: { name: 'Alakazam', stage: 2, type: 'Psychic', stats: { hp: 70, atk: 35, def: 15, spd: 35 } }
  },
  7: {
    tier: 7,
    name: 'Blaine (Volcano)',
    element: 'Fire',
    badgeReward: 'Volcano Badge',
    creature: { name: 'Arcanine', stage: 1, type: 'Fire', stats: { hp: 90, atk: 32, def: 22, spd: 30 } }
  },
  8: {
    tier: 8,
    name: 'Giovanni (Earth)',
    element: 'Ground',
    badgeReward: 'Earth Badge',
    creature: { name: 'Rhydon', stage: 1, type: 'Ground', stats: { hp: 100, atk: 35, def: 35, spd: 15 } }
  }
};

export const CHAMPION = {
  name: 'Champion Lance',
  party: [
    { name: 'Alakazam', stage: 2, type: 'Psychic', stats: { hp: 120, atk: 45, def: 30, spd: 50 } },
    { name: 'Dragonite', stage: 2, type: 'Dragon', stats: { hp: 150, atk: 50, def: 40, spd: 40 } },
    { name: 'Metagross', stage: 2, type: 'Steel', stats: { hp: 140, atk: 48, def: 55, spd: 30 } }
  ] as CreatureForm[]
};
