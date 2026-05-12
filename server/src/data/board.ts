import type { BoardSpace } from '../types';

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
  // SIDE 1 (Bottom row conceptually, left to right 0-10)
  { index: 0, name: 'Healing Center', type: 'Start' },
  { index: 1, name: 'Terravore Tile 1', type: 'Creature', speciesId: 'terravore', groupId: 'brown' },
  { index: 2, name: 'Trainer\'s Journal', type: 'Event', eventDeck: 'Journal' },
  { index: 3, name: 'Terravore Tile 2', type: 'Creature', speciesId: 'terravore', groupId: 'brown' },
  { index: 4, name: 'Creature License Fee', type: 'Tax', taxAmount: 100 },
  { index: 5, name: 'Gym 1 - Boulder', type: 'Gym', gymTier: 1, gymElement: 'Rock' },
  { index: 6, name: 'Pyrowl Tile 1', type: 'Creature', speciesId: 'pyrowl', groupId: 'lightBlue' },
  { index: 7, name: 'Scout Report', type: 'Event', eventDeck: 'Scout' },
  { index: 8, name: 'Pyrowl Tile 2', type: 'Creature', speciesId: 'pyrowl', groupId: 'lightBlue' },
  { index: 9, name: 'Gym 2 - Cascade', type: 'Gym', gymTier: 2, gymElement: 'Water' }, // Using Gym instead of 3rd Pyrowl to fit 8 gyms
  
  // CORNER
  { index: 10, name: 'Just Adventuring', type: 'Corner' },

  // SIDE 2 (Left column conceptually, bottom to top 11-19)
  { index: 11, name: 'Lumibulb Tile 1', type: 'Creature', speciesId: 'lumibulb', groupId: 'pink' },
  { index: 12, name: 'Wild Encounter', type: 'Wild' },
  { index: 13, name: 'Lumibulb Tile 2', type: 'Creature', speciesId: 'lumibulb', groupId: 'pink' },
  { index: 14, name: 'Lumibulb Tile 3', type: 'Creature', speciesId: 'lumibulb', groupId: 'pink' },
  { index: 15, name: 'Gym 3 - Thunder', type: 'Gym', gymTier: 3, gymElement: 'Electric' },
  { index: 16, name: 'Voltpaw Tile 1', type: 'Creature', speciesId: 'voltpaw', groupId: 'orange' },
  { index: 17, name: 'Trainer\'s Journal', type: 'Event', eventDeck: 'Journal' },
  { index: 18, name: 'Voltpaw Tile 2', type: 'Creature', speciesId: 'voltpaw', groupId: 'orange' },
  { index: 19, name: 'Gym 4 - Rainbow', type: 'Gym', gymTier: 4, gymElement: 'Grass' },
  
  // CORNER
  { index: 20, name: 'Champion\'s Arena', type: 'Corner' },

  // SIDE 3 (Top row conceptually, right to left 21-29)
  { index: 21, name: 'Psyhorn Tile 1', type: 'Creature', speciesId: 'psyhorn', groupId: 'red' },
  { index: 22, name: 'Scout Report', type: 'Event', eventDeck: 'Scout' },
  { index: 23, name: 'Psyhorn Tile 2', type: 'Creature', speciesId: 'psyhorn', groupId: 'red' },
  { index: 24, name: 'Psyhorn Tile 3', type: 'Creature', speciesId: 'psyhorn', groupId: 'red' },
  { index: 25, name: 'Gym 5 - Soul', type: 'Gym', gymTier: 5, gymElement: 'Ghost' },
  { index: 26, name: 'Shadowrak Tile 1', type: 'Creature', speciesId: 'shadowrak', groupId: 'yellow' },
  { index: 27, name: 'Shadowrak Tile 2', type: 'Creature', speciesId: 'shadowrak', groupId: 'yellow' },
  { index: 28, name: 'Wild Encounter', type: 'Wild' },
  { index: 29, name: 'Gym 6 - Marsh', type: 'Gym', gymTier: 6, gymElement: 'Poison' },

  // CORNER
  { index: 30, name: 'Lost in an Adventure', type: 'Corner' },

  // SIDE 4 (Right column conceptually, top to bottom 31-39)
  { index: 31, name: 'Glacieon Tile 1', type: 'Creature', speciesId: 'glacieon', groupId: 'green' },
  { index: 32, name: 'Glacieon Tile 2', type: 'Creature', speciesId: 'glacieon', groupId: 'green' },
  { index: 33, name: 'Trainer\'s Journal', type: 'Event', eventDeck: 'Journal' },
  { index: 34, name: 'Glacieon Tile 3', type: 'Creature', speciesId: 'glacieon', groupId: 'green' },
  { index: 35, name: 'Gym 7 - Volcano', type: 'Gym', gymTier: 7, gymElement: 'Fire' },
  { index: 36, name: 'Dracoveil Tile 1', type: 'Creature', speciesId: 'dracoveil', groupId: 'darkBlue' },
  { index: 37, name: 'Elite Trainer Tax', type: 'Tax', taxAmount: 200 },
  { index: 38, name: 'Dracoveil Tile 2', type: 'Creature', speciesId: 'dracoveil', groupId: 'darkBlue' },
  { index: 39, name: 'Gym 8 - Earth', type: 'Gym', gymTier: 8, gymElement: 'Ground' },
];
