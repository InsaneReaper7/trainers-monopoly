import type { CreatureSpecies } from '../types';

export const CREATURES: Record<string, CreatureSpecies> = {
  // --- Ground ---
  terravore: {
    id: 'terravore',
    groupId: 'brown',
    tier: 'Common',
    captureCost: 60,
    baseRent: 30,
    baseForm: { name: 'Terravore', stage: 0, type: 'Ground', stats: { hp: 35, atk: 8, def: 10, spd: 4 } },
    stage1Form: { name: 'Terraking', stage: 1, type: 'Ground', stats: { hp: 45, atk: 12, def: 15, spd: 7 } }
  },
  digmole: {
    id: 'digmole',
    groupId: 'brown',
    tier: 'Common',
    captureCost: 60,
    baseRent: 30,
    baseForm: { name: 'Digmole', stage: 0, type: 'Ground', stats: { hp: 32, atk: 9, def: 8, spd: 5 } },
    stage1Form: { name: 'Drillmole', stage: 1, type: 'Ground', stats: { hp: 42, atk: 13, def: 12, spd: 8 } }
  },

  // --- Fire ---
  pyrowl: {
    id: 'pyrowl',
    groupId: 'lightBlue',
    tier: 'Common',
    captureCost: 100,
    baseRent: 60,
    baseForm: { name: 'Pyrowl', stage: 0, type: 'Fire', stats: { hp: 30, atk: 8, def: 6, spd: 10 } },
    stage1Form: { name: 'Infernawl', stage: 1, type: 'Fire', stats: { hp: 40, atk: 12, def: 10, spd: 13 } },
    stage2Form: { name: 'Blazebird', stage: 2, type: 'Fire', stats: { hp: 50, atk: 18, def: 14, spd: 18 } }
  },
  pyroshell: {
    id: 'pyroshell',
    groupId: 'lightBlue',
    tier: 'Common',
    captureCost: 100,
    baseRent: 60,
    baseForm: { name: 'Pyroshell', stage: 0, type: 'Fire', stats: { hp: 34, atk: 7, def: 9, spd: 6 } },
    stage1Form: { name: 'Magmagator', stage: 1, type: 'Fire', stats: { hp: 44, atk: 11, def: 14, spd: 9 } },
    stage2Form: { name: 'Volcanicor', stage: 2, type: 'Fire', stats: { hp: 54, atk: 16, def: 20, spd: 13 } }
  },

  // --- Grass ---
  lumibulb: {
    id: 'lumibulb',
    groupId: 'pink',
    tier: 'Common',
    captureCost: 120,
    baseRent: 100,
    baseForm: { name: 'Lumibulb', stage: 0, type: 'Grass', stats: { hp: 32, atk: 7, def: 7, spd: 8 } },
    stage1Form: { name: 'Floralum', stage: 1, type: 'Grass', stats: { hp: 42, atk: 11, def: 11, spd: 11 } },
    stage2Form: { name: 'Solarvine', stage: 2, type: 'Grass', stats: { hp: 52, atk: 16, def: 16, spd: 16 } }
  },
  leafawn: {
    id: 'leafawn',
    groupId: 'pink',
    tier: 'Common',
    captureCost: 120,
    baseRent: 100,
    baseForm: { name: 'Leafawn', stage: 0, type: 'Grass', stats: { hp: 36, atk: 6, def: 9, spd: 6 } },
    stage1Form: { name: 'Blossomdeer', stage: 1, type: 'Grass', stats: { hp: 46, atk: 10, def: 13, spd: 9 } },
    stage2Form: { name: 'Elderbloom', stage: 2, type: 'Grass', stats: { hp: 56, atk: 15, def: 18, spd: 13 } }
  },

  // --- Electric ---
  voltpaw: {
    id: 'voltpaw',
    groupId: 'orange',
    tier: 'Uncommon',
    captureCost: 160,
    baseRent: 140,
    baseForm: { name: 'Voltpaw', stage: 0, type: 'Electric', stats: { hp: 40, atk: 11, def: 7, spd: 14 } },
    stage1Form: { name: 'Thunderfang', stage: 1, type: 'Electric', stats: { hp: 50, atk: 15, def: 11, spd: 18 } }
  },
  sparkitten: {
    id: 'sparkitten',
    groupId: 'orange',
    tier: 'Uncommon',
    captureCost: 160,
    baseRent: 140,
    baseForm: { name: 'Sparkitten', stage: 0, type: 'Electric', stats: { hp: 42, atk: 10, def: 8, spd: 12 } },
    stage1Form: { name: 'Electroleopard', stage: 1, type: 'Electric', stats: { hp: 52, atk: 14, def: 12, spd: 16 } }
  },

  // --- Psychic ---
  psyhorn: {
    id: 'psyhorn',
    groupId: 'red',
    tier: 'Uncommon',
    captureCost: 200,
    baseRent: 180,
    baseForm: { name: 'Psyhorn', stage: 0, type: 'Psychic', stats: { hp: 44, atk: 11, def: 9, spd: 10 } },
    stage1Form: { name: 'Mentacore', stage: 1, type: 'Psychic', stats: { hp: 54, atk: 15, def: 13, spd: 13 } },
    stage2Form: { name: 'Psyclopse', stage: 2, type: 'Psychic', stats: { hp: 64, atk: 21, def: 18, spd: 18 } }
  },
  mindpup: {
    id: 'mindpup',
    groupId: 'red',
    tier: 'Uncommon',
    captureCost: 200,
    baseRent: 180,
    baseForm: { name: 'Mindpup', stage: 0, type: 'Psychic', stats: { hp: 46, atk: 9, def: 10, spd: 11 } },
    stage1Form: { name: 'Esperdog', stage: 1, type: 'Psychic', stats: { hp: 56, atk: 13, def: 14, spd: 14 } },
    stage2Form: { name: 'Brainhound', stage: 2, type: 'Psychic', stats: { hp: 66, atk: 19, def: 19, spd: 19 } }
  },

  // --- Dark ---
  shadowrak: {
    id: 'shadowrak',
    groupId: 'yellow',
    tier: 'Uncommon',
    captureCost: 220,
    baseRent: 220,
    baseForm: { name: 'Shadowrak', stage: 0, type: 'Dark', stats: { hp: 48, atk: 12, def: 8, spd: 9 } },
    stage1Form: { name: 'Nightstalker', stage: 1, type: 'Dark', stats: { hp: 58, atk: 16, def: 12, spd: 12 } }
  },
  duskclaw: {
    id: 'duskclaw',
    groupId: 'yellow',
    tier: 'Uncommon',
    captureCost: 220,
    baseRent: 220,
    baseForm: { name: 'Duskclaw', stage: 0, type: 'Dark', stats: { hp: 45, atk: 13, def: 7, spd: 11 } },
    stage1Form: { name: 'Umbragloom', stage: 1, type: 'Dark', stats: { hp: 55, atk: 17, def: 11, spd: 14 } }
  },

  // --- Ice ---
  glacieon: {
    id: 'glacieon',
    groupId: 'green',
    tier: 'Rare',
    captureCost: 300,
    baseRent: 260,
    baseForm: { name: 'Glacieon', stage: 0, type: 'Ice', stats: { hp: 54, atk: 15, def: 12, spd: 10 } },
    stage1Form: { name: 'Frostbite', stage: 1, type: 'Ice', stats: { hp: 64, atk: 19, def: 16, spd: 14 } },
    stage2Form: { name: 'Avalanche', stage: 2, type: 'Ice', stats: { hp: 74, atk: 25, def: 21, spd: 19 } }
  },
  frosbeast: {
    id: 'frosbeast',
    groupId: 'green',
    tier: 'Rare',
    captureCost: 300,
    baseRent: 260,
    baseForm: { name: 'Frosbeast', stage: 0, type: 'Ice', stats: { hp: 52, atk: 16, def: 11, spd: 11 } },
    stage1Form: { name: 'Glaciersledge', stage: 1, type: 'Ice', stats: { hp: 62, atk: 20, def: 15, spd: 15 } },
    stage2Form: { name: 'Frostcolossus', stage: 2, type: 'Ice', stats: { hp: 72, atk: 26, def: 20, spd: 20 } }
  },

  // --- Dragon ---
  dracoveil: {
    id: 'dracoveil',
    groupId: 'darkBlue',
    tier: 'Rare',
    captureCost: 400,
    baseRent: 300,
    baseForm: { name: 'Dracoveil', stage: 0, type: 'Dragon', stats: { hp: 58, atk: 16, def: 12, spd: 12 } },
    stage1Form: { name: 'Wyrmshadow', stage: 1, type: 'Dragon', stats: { hp: 68, atk: 21, def: 17, spd: 16 } }
  },
  wyrmlet: {
    id: 'wyrmlet',
    groupId: 'darkBlue',
    tier: 'Rare',
    captureCost: 400,
    baseRent: 300,
    baseForm: { name: 'Wyrmlet', stage: 0, type: 'Dragon', stats: { hp: 60, atk: 17, def: 13, spd: 11 } },
    stage1Form: { name: 'Drakesoul', stage: 1, type: 'Dragon', stats: { hp: 70, atk: 22, def: 18, spd: 15 } }
  },

  // --- Water (Non-board) ---
  aquaflow: {
    id: 'aquaflow',
    groupId: 'wild',
    tier: 'Uncommon',
    captureCost: 150,
    baseRent: 130,
    baseForm: { name: 'Aquaflow', stage: 0, type: 'Water', stats: { hp: 44, atk: 11, def: 9, spd: 11 } },
    stage1Form: { name: 'Aquastream', stage: 1, type: 'Water', stats: { hp: 54, atk: 15, def: 13, spd: 15 } },
    stage2Form: { name: 'Torrential', stage: 2, type: 'Water', stats: { hp: 64, atk: 21, def: 18, spd: 20 } }
  },

  // --- Normal (Non-board) ---
  rattapi: {
    id: 'rattapi',
    groupId: 'wild',
    tier: 'Common',
    captureCost: 80,
    baseRent: 40,
    baseForm: { name: 'Rattapi', stage: 0, type: 'Normal', stats: { hp: 32, atk: 7, def: 6, spd: 9 } },
    stage1Form: { name: 'Rattafuse', stage: 1, type: 'Normal', stats: { hp: 42, atk: 11, def: 10, spd: 13 } }
  },

  // --- Rock (Non-board) ---
  pebbleton: {
    id: 'pebbleton',
    groupId: 'wild',
    tier: 'Common',
    captureCost: 90,
    baseRent: 50,
    baseForm: { name: 'Pebbleton', stage: 0, type: 'Rock', stats: { hp: 38, atk: 8, def: 11, spd: 4 } },
    stage1Form: { name: 'Stonemason', stage: 1, type: 'Rock', stats: { hp: 48, atk: 12, def: 16, spd: 7 } }
  },

  // --- Bug (Non-board) ---
  caterpinch: {
    id: 'caterpinch',
    groupId: 'wild',
    tier: 'Common',
    captureCost: 70,
    baseRent: 35,
    baseForm: { name: 'Caterpinch', stage: 0, type: 'Bug', stats: { hp: 30, atk: 7, def: 7, spd: 8 } },
    stage1Form: { name: 'Silkcoon', stage: 1, type: 'Bug', stats: { hp: 40, atk: 10, def: 12, spd: 5 } },
    stage2Form: { name: 'Pincherfly', stage: 2, type: 'Bug', stats: { hp: 50, atk: 15, def: 15, spd: 15 } }
  },

  // --- Ghost (Non-board) ---
  phantomin: {
    id: 'phantomin',
    groupId: 'wild',
    tier: 'Uncommon',
    captureCost: 140,
    baseRent: 100,
    baseForm: { name: 'Phantomin', stage: 0, type: 'Ghost', stats: { hp: 40, atk: 12, def: 7, spd: 11 } },
    stage1Form: { name: 'Spectergeist', stage: 1, type: 'Ghost', stats: { hp: 50, atk: 16, def: 11, spd: 14 } },
    stage2Form: { name: 'Reaperlord', stage: 2, type: 'Ghost', stats: { hp: 60, atk: 22, def: 15, spd: 18 } }
  },

  // --- Fighting (Non-board) ---
  machfist: {
    id: 'machfist',
    groupId: 'wild',
    tier: 'Uncommon',
    captureCost: 160,
    baseRent: 140,
    baseForm: { name: 'Machfist', stage: 0, type: 'Fighting', stats: { hp: 46, atk: 13, def: 8, spd: 9 } },
    stage1Form: { name: 'Combatant', stage: 1, type: 'Fighting', stats: { hp: 56, atk: 17, def: 12, spd: 12 } },
    stage2Form: { name: 'Championite', stage: 2, type: 'Fighting', stats: { hp: 66, atk: 23, def: 16, spd: 17 } }
  },

  // --- Legendaries & Special Wild ---
  aerozor: {
    id: 'aerozor',
    groupId: 'wild',
    tier: 'Legendary',
    captureCost: 500,
    baseRent: 400,
    baseForm: { name: 'Aerozor', stage: 0, type: 'Flying', stats: { hp: 70, atk: 22, def: 15, spd: 22 } },
    stage1Form: { name: 'Aerodrake', stage: 1, type: 'Flying', stats: { hp: 85, atk: 28, def: 20, spd: 27 } },
    stage2Form: { name: 'Stormking', stage: 2, type: 'Flying', stats: { hp: 105, atk: 36, def: 26, spd: 34 } }
  },
  gustwing: {
    id: 'gustwing',
    groupId: 'wild',
    tier: 'Uncommon',
    captureCost: 150,
    baseRent: 130,
    baseForm: { name: 'Gustwing', stage: 0, type: 'Flying', stats: { hp: 42, atk: 11, def: 8, spd: 13 } },
    stage1Form: { name: 'Hurricaneer', stage: 1, type: 'Flying', stats: { hp: 52, atk: 15, def: 12, spd: 17 } },
    stage2Form: { name: 'Zephyrus', stage: 2, type: 'Flying', stats: { hp: 62, atk: 21, def: 17, spd: 22 } }
  },
  toxeon: {
    id: 'toxeon',
    groupId: 'wild',
    tier: 'Legendary',
    captureCost: 500,
    baseRent: 400,
    baseForm: { name: 'Toxeon', stage: 0, type: 'Poison', stats: { hp: 75, atk: 20, def: 18, spd: 15 } },
    stage1Form: { name: 'Noxeon', stage: 1, type: 'Poison', stats: { hp: 90, atk: 26, def: 24, spd: 19 } },
    stage2Form: { name: 'Venomist', stage: 2, type: 'Poison', stats: { hp: 110, atk: 32, def: 30, spd: 24 } }
  },
  sludger: {
    id: 'sludger',
    groupId: 'wild',
    tier: 'Uncommon',
    captureCost: 130,
    baseRent: 100,
    baseForm: { name: 'sludger', stage: 0, type: 'Poison', stats: { hp: 44, atk: 10, def: 10, spd: 8 } },
    stage1Form: { name: 'Oozemonster', stage: 1, type: 'Poison', stats: { hp: 54, atk: 14, def: 14, spd: 11 } },
    stage2Form: { name: 'Toxicrash', stage: 2, type: 'Poison', stats: { hp: 64, atk: 20, def: 19, spd: 15 } }
  },
  steelodon: {
    id: 'steelodon',
    groupId: 'wild',
    tier: 'Legendary',
    captureCost: 550,
    baseRent: 450,
    baseForm: { name: 'Steelodon', stage: 0, type: 'Steel', stats: { hp: 80, atk: 18, def: 24, spd: 10 } },
    stage1Form: { name: 'Ironclad', stage: 1, type: 'Steel', stats: { hp: 95, atk: 24, def: 32, spd: 14 } },
    stage2Form: { name: 'Titanox', stage: 2, type: 'Steel', stats: { hp: 115, atk: 31, def: 42, spd: 18 } }
  },
  ironite: {
    id: 'ironite',
    groupId: 'wild',
    tier: 'Rare',
    captureCost: 280,
    baseRent: 250,
    baseForm: { name: 'Ironite', stage: 0, type: 'Steel', stats: { hp: 50, atk: 14, def: 16, spd: 9 } },
    stage1Form: { name: 'Metaldragon', stage: 1, type: 'Steel', stats: { hp: 60, atk: 18, def: 22, spd: 12 } },
    stage2Form: { name: 'Steelcolossus', stage: 2, type: 'Steel', stats: { hp: 70, atk: 24, def: 29, spd: 16 } }
  },
  mythicor: {
    id: 'mythicor',
    groupId: 'wild',
    tier: 'Legendary',
    captureCost: 600,
    baseRent: 500,
    baseForm: { name: 'Mythicor', stage: 0, type: 'Fairy', stats: { hp: 75, atk: 23, def: 16, spd: 20 } },
    stage1Form: { name: 'Arcanist', stage: 1, type: 'Fairy', stats: { hp: 90, atk: 30, def: 21, spd: 25 } },
    stage2Form: { name: 'Eternity', stage: 2, type: 'Fairy', stats: { hp: 110, atk: 38, def: 27, spd: 31 } }
  },
  pixipuff: {
    id: 'pixipuff',
    groupId: 'wild',
    tier: 'Rare',
    captureCost: 250,
    baseRent: 220,
    baseForm: { name: 'Pixipuff', stage: 0, type: 'Fairy', stats: { hp: 50, atk: 14, def: 10, spd: 12 } },
    stage1Form: { name: 'Pixiqueen', stage: 1, type: 'Fairy', stats: { hp: 60, atk: 18, def: 14, spd: 15 } },
    stage2Form: { name: 'Sylphina', stage: 2, type: 'Fairy', stats: { hp: 70, atk: 24, def: 19, spd: 19 } }
  },

  // --- Dual Types ---
  volcanis: {
    id: 'volcanis',
    groupId: 'wild',
    tier: 'Rare',
    captureCost: 350,
    baseRent: 300,
    baseForm: { name: 'Volcanis', stage: 0, type: 'Fire', secondaryType: 'Rock', stats: { hp: 52, atk: 15, def: 13, spd: 10 } },
    stage1Form: { name: 'Volcaturtle', stage: 1, type: 'Fire', secondaryType: 'Rock', stats: { hp: 67, atk: 21, def: 19, spd: 13 } }
  },
  hydradrac: {
    id: 'hydradrac',
    groupId: 'wild',
    tier: 'Rare',
    captureCost: 350,
    baseRent: 300,
    baseForm: { name: 'Hydradrac', stage: 0, type: 'Water', secondaryType: 'Dragon', stats: { hp: 54, atk: 15, def: 12, spd: 11 } },
    stage1Form: { name: 'Leviathron', stage: 1, type: 'Water', secondaryType: 'Dragon', stats: { hp: 69, atk: 21, def: 18, spd: 14 } }
  },
  venoshock: {
    id: 'venoshock',
    groupId: 'wild',
    tier: 'Rare',
    captureCost: 350,
    baseRent: 300,
    baseForm: { name: 'venoshock', stage: 0, type: 'Poison', secondaryType: 'Electric', stats: { hp: 50, atk: 15, def: 11, spd: 13 } },
    stage1Form: { name: 'Toxivolt', stage: 1, type: 'Poison', secondaryType: 'Electric', stats: { hp: 65, atk: 21, def: 16, spd: 17 } }
  },
  shadowgeist: {
    id: 'shadowgeist',
    groupId: 'wild',
    tier: 'Rare',
    captureCost: 350,
    baseRent: 300,
    baseForm: { name: 'Shadowgeist', stage: 0, type: 'Ghost', secondaryType: 'Dark', stats: { hp: 50, atk: 15, def: 11, spd: 12 } },
    stage1Form: { name: 'Phantomum', stage: 1, type: 'Ghost', secondaryType: 'Dark', stats: { hp: 65, atk: 21, def: 16, spd: 15 } }
  }
};
