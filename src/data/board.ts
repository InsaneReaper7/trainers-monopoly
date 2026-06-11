import type { BoardSpace } from '../types';
import { CREATURES } from './creatures';

// TP cost per house upgrade (per tile in the group)
export const GROUP_HOUSE_COST: Record<string, number> = {
  brown:    50,
  lightBlue: 50,
  pink:    100,
  orange:  100,
  red:     150,
  yellow:  150,
  green:   200,
  darkBlue: 200,
};

// Additional rent gained per power-up tier (Reverted to original)
export const GROUP_RENT_PER_TIER: Record<string, number> = {
  brown:    50,
  lightBlue: 50,
  pink:    100,
  orange:  100,
  red:     150,
  yellow:  150,
  green:   200,
  darkBlue: 250,
};

export const BOARD_SPACES: BoardSpace[] = [
  // SIDE 1 (Bottom row, left to right 0-10)
  { index: 0, name: 'Healing Center', type: 'Start' },
  { index: 1, name: 'Terravore Tile 1', type: 'Creature', speciesId: 'terravore', groupId: 'brown' },
  { index: 2, name: 'Trainer\'s Journal', type: 'Event', eventDeck: 'Journal' },
  { index: 3, name: 'Terravore Tile 2', type: 'Creature', speciesId: 'terravore', groupId: 'brown' },
  { index: 4, name: 'Creature License Fee', type: 'Tax', taxAmount: 100 },
  { index: 5, name: 'Gym 1 - Granite', type: 'Gym', gymTier: 1, gymElement: 'Rock' },
  { index: 6, name: 'Pyrowl Tile 1', type: 'Creature', speciesId: 'pyrowl', groupId: 'lightBlue' },
  { index: 7, name: 'Scout Report', type: 'Event', eventDeck: 'Scout' },
  { index: 8, name: 'Pyrowl Tile 2', type: 'Creature', speciesId: 'pyrowl', groupId: 'lightBlue' },
  { index: 9, name: 'Gym 2 - Wave', type: 'Gym', gymTier: 2, gymElement: 'Water' },
  
  // CORNER
  { index: 10, name: 'Just Adventuring', type: 'Corner' },

  // SIDE 2 (Left column, bottom to top 11-19)
  { index: 11, name: 'Lumibulb Tile 1', type: 'Creature', speciesId: 'lumibulb', groupId: 'pink' },
  { index: 12, name: 'Wild Encounter', type: 'Wild' },
  { index: 13, name: 'Lumibulb Tile 2', type: 'Creature', speciesId: 'lumibulb', groupId: 'pink' },
  { index: 14, name: 'Lumibulb Tile 3', type: 'Creature', speciesId: 'lumibulb', groupId: 'pink' },
  { index: 15, name: 'Gym 3 - Volt', type: 'Gym', gymTier: 3, gymElement: 'Electric' },
  { index: 16, name: 'Voltpaw Tile 1', type: 'Creature', speciesId: 'voltpaw', groupId: 'orange' },
  { index: 17, name: 'Trainer\'s Journal', type: 'Event', eventDeck: 'Journal' },
  { index: 18, name: 'Voltpaw Tile 2', type: 'Creature', speciesId: 'voltpaw', groupId: 'orange' },
  { index: 19, name: 'Gym 4 - Bloom', type: 'Gym', gymTier: 4, gymElement: 'Grass' },
  
  // CORNER
  { index: 20, name: 'Champion\'s Arena', type: 'Corner' },

  // SIDE 3 (Top row, right to left 21-29)
  { index: 21, name: 'Psyhorn Tile 1', type: 'Creature', speciesId: 'psyhorn', groupId: 'red' },
  { index: 22, name: 'Scout Report', type: 'Event', eventDeck: 'Scout' },
  { index: 23, name: 'Psyhorn Tile 2', type: 'Creature', speciesId: 'psyhorn', groupId: 'red' },
  { index: 24, name: 'Psyhorn Tile 3', type: 'Creature', speciesId: 'psyhorn', groupId: 'red' },
  { index: 25, name: 'Gym 5 - Sludge', type: 'Gym', gymTier: 5, gymElement: 'Poison' },
  { index: 26, name: 'Shadowrak Tile 1', type: 'Creature', speciesId: 'shadowrak', groupId: 'yellow' },
  { index: 27, name: 'Wild Encounter', type: 'Wild' },
  { index: 28, name: 'Shadowrak Tile 2', type: 'Creature', speciesId: 'shadowrak', groupId: 'yellow' },
  { index: 29, name: 'Gym 6 - Mind', type: 'Gym', gymTier: 6, gymElement: 'Psychic' },

  // CORNER
  { index: 30, name: 'Lost in an Adventure', type: 'Corner' },

  // SIDE 4 (Right column, top to bottom 31-39)
  { index: 31, name: 'Glacieon Tile 1', type: 'Creature', speciesId: 'glacieon', groupId: 'green' },
  { index: 32, name: 'Glacieon Tile 2', type: 'Creature', speciesId: 'glacieon', groupId: 'green' },
  { index: 33, name: 'Trainer\'s Journal', type: 'Event', eventDeck: 'Journal' },
  { index: 34, name: 'Glacieon Tile 3', type: 'Creature', speciesId: 'glacieon', groupId: 'green' },
  { index: 35, name: 'Gym 7 - Flare', type: 'Gym', gymTier: 7, gymElement: 'Fire' },
  { index: 36, name: 'Dracoveil Tile 1', type: 'Creature', speciesId: 'dracoveil', groupId: 'darkBlue' },
  { index: 37, name: 'Elite Trainer Tax', type: 'Tax', taxAmount: 200 },
  { index: 38, name: 'Dracoveil Tile 2', type: 'Creature', speciesId: 'dracoveil', groupId: 'darkBlue' },
  { index: 39, name: 'Gym 8 - Seismic', type: 'Gym', gymTier: 8, gymElement: 'Ground' },
];

export const generateBoard = (randomCreatureTiles: boolean): BoardSpace[] => {
  if (!randomCreatureTiles) {
    return BOARD_SPACES;
  }
  
  const groupSpecies: Record<string, string> = {
    brown: Math.random() < 0.5 ? 'terravore' : 'digmole',
    lightBlue: Math.random() < 0.5 ? 'pyrowl' : 'pyroshell',
    pink: Math.random() < 0.5 ? 'lumibulb' : 'leafawn',
    orange: Math.random() < 0.5 ? 'voltpaw' : 'sparkitten',
    red: Math.random() < 0.5 ? 'psyhorn' : 'mindpup',
    yellow: Math.random() < 0.5 ? 'shadowrak' : 'duskclaw',
    green: Math.random() < 0.5 ? 'glacieon' : 'frosbeast',
    darkBlue: Math.random() < 0.5 ? 'dracoveil' : 'wyrmlet',
  };
  
  return BOARD_SPACES.map(space => {
    if (space.type === 'Creature' && space.groupId && groupSpecies[space.groupId]) {
      const chosenSpeciesId = groupSpecies[space.groupId];
      const chosenSpecies = CREATURES[chosenSpeciesId];
      if (chosenSpecies) {
        const creatureName = chosenSpecies.baseForm.name;
        const tileNumberMatch = space.name.match(/Tile \d+/);
        const suffix = tileNumberMatch ? tileNumberMatch[0] : 'Tile';
        const name = `${creatureName} ${suffix}`.trim();
        return {
          ...space,
          name,
          speciesId: chosenSpeciesId
        };
      }
    }
    return space;
  });
};

// --- Single Player Campaign Boards Generator ---
export const CAMPAIGN_CHAPTERS = [
  {
    chapter: 1,
    title: 'Chapter 1: The Molten Caverns',
    theme: 'volcanic',
    description: 'Brave the subterranean magma chambers. The ground shakes and ash chokes the air. Only Earth and Fire elements survive here.',
    goal: 'Own all Brown and Light Blue properties, or bankrupt your rivals.',
    startingTp: 1500,
    opponents: [
      { name: 'Rocky (Rival)', color: '#ef4444', isCpu: true },
      { name: 'Ignis (Rival)', color: '#f97316', isCpu: true }
    ],
    creaturePool: ['terravore', 'digmole', 'pyrowl', 'pyroshell', 'pebbleton', 'volcanis']
  },
  {
    chapter: 2,
    title: 'Chapter 2: The Electric Woodlands',
    theme: 'forest-electric',
    description: 'Navigate a mystical forest charging with static storms. Grass and Electric beasts are thriving in this high-voltage environment.',
    goal: 'Earn 3,000 Trainer Points (TP) to power up the woodland beacon.',
    startingTp: 1200,
    opponents: [
      { name: 'Flora (Rival)', color: '#22c55e', isCpu: true },
      { name: 'Sparky (Rival)', color: '#eab308', isCpu: true }
    ],
    creaturePool: ['lumibulb', 'leafawn', 'voltpaw', 'sparkitten', 'caterpinch', 'venoshock']
  },
  {
    chapter: 3,
    title: 'Chapter 3: The Frozen Abyssal Sea',
    theme: 'aquatic-glacial',
    description: 'Sail through freezing glaciers and deep trenches. Dark waters hide terrifying Ice and Water creatures.',
    goal: 'Earn 4 Gym Badges to unlock the path through the iceberg peaks.',
    startingTp: 1000,
    opponents: [
      { name: 'Marina (Rival)', color: '#3b82f6', isCpu: true },
      { name: 'Duskclaw (Rival)', color: '#6b7280', isCpu: true }
    ],
    creaturePool: ['glacieon', 'frosbeast', 'aquaflow', 'phantomin', 'shadowgeist', 'hydradrac']
  },
  {
    chapter: 4,
    title: 'Chapter 4: The Sky Sanctuary',
    theme: 'celestial',
    description: 'Ascend to the ancient clouds where legendary Dragons and Psychic deities nest. Face the ultimate test of strength.',
    goal: 'Defeat Champion Alden at the Arena and claim victory.',
    startingTp: 1500,
    opponents: [
      { name: 'Champion Alden', color: '#a855f7', isCpu: true },
      { name: 'Sky-Watcher (Rival)', color: '#14b8a6', isCpu: true }
    ],
    creaturePool: ['dracoveil', 'wyrmlet', 'psyhorn', 'mindpup', 'mythicor', 'aerozor', 'steelodon']
  }
];

export const generateCampaignBoard = (chapter: number): BoardSpace[] => {
  const chapterConfig = CAMPAIGN_CHAPTERS.find(c => c.chapter === chapter) || CAMPAIGN_CHAPTERS[0];
  const pool = chapterConfig.creaturePool;
  
  // Choose exactly one species from the pool for each color group (8 groups)
  const groupSpecies: Record<string, string> = {
    brown: pool[0 % pool.length],
    lightBlue: pool[1 % pool.length],
    pink: pool[2 % pool.length],
    orange: pool[3 % pool.length],
    red: pool[4 % pool.length],
    yellow: pool[5 % pool.length],
    green: pool[6 % pool.length] || pool[0],
    darkBlue: pool[7 % pool.length] || pool[1],
  };
  
  return BOARD_SPACES.map((space) => {
    if (space.type === 'Creature' && space.groupId && groupSpecies[space.groupId]) {
      const chosenSpeciesId = groupSpecies[space.groupId];
      const species = CREATURES[chosenSpeciesId];
      if (species) {
        const tileNumberMatch = space.name.match(/Tile \d+/);
        const suffix = tileNumberMatch ? tileNumberMatch[0] : 'Tile';
        const name = `${species.baseForm.name} ${suffix}`.trim();
        return {
          ...space,
          name,
          speciesId: chosenSpeciesId
        };
      }
    }
    return space;
  });
};
