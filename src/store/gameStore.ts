import { create } from 'zustand';
import type { ActiveCreature, CreatureForm } from '../types';
import { BOARD_SPACES, GROUP_HOUSE_COST, GROUP_RENT_PER_TIER } from '../data/board';
import { CREATURES } from '../data/creatures';
import { GYM_LEADERS, CHAMPION } from '../data/gyms';
import { calculateDamage } from '../utils/combat';
import { mpIntercept } from '../multiplayer/actionBridge';

export interface Player {
  id: string;
  name: string;
  tp: number;
  position: number;
  party: ActiveCreature[];
  storage: ActiveCreature[];
  badges: string[];
  inJail: boolean;
  jailTurns: number;
  color: string;
  isCpu: boolean;
  isBankrupt: boolean;
  consecutiveDoubles: number;
  inAdventure: boolean;
}

export interface BattleState {
  isActive: boolean;
  type: 'TILE' | 'GYM' | 'CHAMPION';
  challengerId: string;
  challengerCreatureId?: string;
  defenderId?: string; // Player ID, or 'GYM'
  defenderCreatureId?: string;
  defenderCreatureTemp?: CreatureForm; // For Gym AI
  round: number;
  logs: string[];
}

export interface TradeState {
  status: 'DRAFTING' | 'PROPOSED' | 'COUNTER';
  initiatorId: string;
  targetId: string;
  offeredTp: number;
  offeredCreatureIds: string[];
  requestedTp: number;
  requestedCreatureIds: string[];
  /** The player currently holding the ball — must accept/decline/negotiate */
  responderId: string;
}

export type GamePhase = 'MENU' | 'SETUP' | 'ROLL' | 'ACTION' | 'BATTLE' | 'END_TURN' | 'BANKRUPTCY' | 'ADVENTURE' | 'GAME_OVER';

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  dice: [number, number];
  boardOwnership: Record<number, { ownerId: string; powerUpTier: number; creatureId: string }>;
  battleState: BattleState | null;
  tradeState: TradeState | null;
  wildEncounter: { speciesId: string } | null;
  storageModalOpen: boolean;
  selectedTileIndex: number | null;
  rolledDoubles: boolean;
  pendingGymChallenge: boolean;
  winner: string | null;

  // Actions
  toggleStorageModal: () => void;
  swapStorageCreature: (partyId: string, storageId: string) => void;
  selectTile: (index: number | null) => void;
  powerUpTile: (spaceIndex: number) => void;
  addPlayer: (name: string, color: string, isCpu: boolean) => void;
  addCpuPlayers: (count?: number) => void;
  startChampionBattle: () => void;
  quitToMenu: () => void;
  startGame: () => void;
  rollDice: () => void;
  endTurn: () => void;
  
  // Interactions
  captureTile: (spaceIndex: number) => void;
  payRent: (spaceIndex: number) => void;
  startBattle: (spaceIndex: number, isGym: boolean) => void;
  selectBattleCreature: (creatureId: string) => void;
  executeBattleRound: () => void;
  endBattle: () => void;
  releaseCreature: (creatureId: string) => void;
  drawCard: (deckType: string) => void;
  payTax: (amount: number) => void;
  captureWildCreature: () => void;
  clearWildEncounter: () => void;
  
  // Trade Actions
  initiateTrade: (targetId: string) => void;
  updateTradeOffer: (offer: Partial<Omit<TradeState, 'status' | 'initiatorId' | 'targetId' | 'responderId'>>) => void;
  proposeTrade: () => void;
  negotiateTrade: () => void;
  acceptTrade: () => void;
  declineTrade: () => void;
  cancelTrade: () => void;
  
  cardMessage: string | null;
  clearCardMessage: () => void;
  
  // Game Log
  gameLogs: string[];
  addLog: (msg: string) => void;
  
  // Bankruptcy
  sellPowerUp: (spaceIndex: number) => void;
  declareBankruptcy: () => void;

  // Lost in Adventure
  payAdventureFine: () => void;
  loseAdventureTurn: () => void;
  
  // CPU Utility
  playCpuAction: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const applyExp = (c: ActiveCreature, expGain: number): ActiveCreature => {
  const species = CREATURES[c.speciesId];
  let newExp = c.exp + expGain;
  let newLevel = c.level;
  let newStats = { ...c.stats };
  let newHp = c.currentHp;
  while (newLevel < 100) {
    const expNeeded = Math.floor(100 * Math.pow(1.2, newLevel - 1));
    if (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel++;
      newStats.hp  += Math.floor(species.baseForm.stats.hp  * 0.1) || 1;
      newStats.atk += Math.floor(species.baseForm.stats.atk * 0.1) || 1;
      newStats.def += Math.floor(species.baseForm.stats.def * 0.1) || 1;
      newStats.spd += Math.floor(species.baseForm.stats.spd * 0.1) || 1;
      newHp += Math.floor(species.baseForm.stats.hp * 0.1) || 1;
    } else {
      break;
    }
  }
  return { ...c, exp: newExp, level: newLevel, stats: newStats, currentHp: newHp };
};

export const useGameStore = create<GameState>((set, get) => ({
  players: [],
  currentPlayerIndex: 0,
  phase: 'MENU',
  dice: [1, 1],
  boardOwnership: {},
  battleState: null,
  tradeState: null,
  wildEncounter: null,
  storageModalOpen: false,
  selectedTileIndex: null,
  rolledDoubles: false,
  pendingGymChallenge: false,
  cardMessage: null,
  gameLogs: [],
  winner: null,

  addLog: (msg: string) => set(state => ({ gameLogs: [...state.gameLogs.slice(-49), msg] })),

  toggleStorageModal: () => set(state => ({ storageModalOpen: !state.storageModalOpen })),
  selectTile: (index) => set({ selectedTileIndex: index }),

  powerUpTile: (spaceIndex) => set((state) => {
    if (mpIntercept('powerUpTile', [spaceIndex])) return state;
    const space = BOARD_SPACES[spaceIndex];
    if (!space.groupId || !space.speciesId) return state;

    const player = { ...state.players[state.currentPlayerIndex] };
    const boardOwnership = { ...state.boardOwnership };
    const ownership = boardOwnership[spaceIndex];
    if (!ownership || ownership.ownerId !== player.id) return state;

    // Must own ALL tiles in group to power up
    const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId && s.type === 'Creature');
    const ownsAll = groupSpaces.every(s => boardOwnership[s.index]?.ownerId === player.id);
    if (!ownsAll) return state;

    // Enforce uniform power-up: current tile cannot be more than 1 ahead of any sibling
    const minTierInGroup = Math.min(...groupSpaces.map(s => boardOwnership[s.index]?.powerUpTier ?? 0));
    if (ownership.powerUpTier >= minTierInGroup + 1) return state;

    if (ownership.powerUpTier >= 5) return state;

    // Cost: GROUP_HOUSE_COST per tile in the group (flat per tier)
    const cost = (GROUP_HOUSE_COST[space.groupId] ?? 100) * groupSpaces.length;
    if (player.tp < cost) return state;

    player.tp -= cost;

    // Boost creature stats by 10% of base form stats per tier
    const players = [...state.players];
    const species = CREATURES[space.speciesId];
    const creatureInParty = player.party.findIndex(c => c.id === ownership.creatureId);
    const creatureInStorage = player.storage.findIndex(c => c.id === ownership.creatureId);

    const boostCreature = (c: ActiveCreature) => ({
      ...c,
      stats: {
        hp: c.stats.hp + Math.floor(species.baseForm.stats.hp * 0.1) || 1,
        atk: c.stats.atk + Math.floor(species.baseForm.stats.atk * 0.1) || 1,
        def: c.stats.def + Math.floor(species.baseForm.stats.def * 0.1) || 1,
        spd: c.stats.spd + Math.floor(species.baseForm.stats.spd * 0.1) || 1,
      }
    });

    if (creatureInParty !== -1) {
      player.party[creatureInParty] = boostCreature(player.party[creatureInParty]);
    } else if (creatureInStorage !== -1) {
      player.storage[creatureInStorage] = boostCreature(player.storage[creatureInStorage]);
    }

    boardOwnership[spaceIndex] = { ...ownership, powerUpTier: ownership.powerUpTier + 1 };
    players[state.currentPlayerIndex] = player;

    const newTier = boardOwnership[spaceIndex].powerUpTier;
    const newRent = species.baseRent + (GROUP_RENT_PER_TIER[space.groupId] ?? 50) * newTier;
    const tierLabel = newTier >= 5 ? '🏨 Sanctum' : `Tier ${newTier}`;
    const newLogs = [...state.gameLogs.slice(-49), `⚡ ${player.name} powered up ${species.baseForm.name} to ${tierLabel}! New rent: ${newRent} TP`];

    return { players, boardOwnership, gameLogs: newLogs };
  }),
  
  swapStorageCreature: (partyId: string, storageId: string) => set(state => {
    if (mpIntercept('swapStorageCreature', [partyId, storageId])) return state;
    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex] };
    
    const pIndex = player.party.findIndex(c => c.id === partyId);
    const sIndex = player.storage.findIndex(c => c.id === storageId);
    
    if (pIndex !== -1 && sIndex !== -1) {
      const pCreature = player.party[pIndex];
      const sCreature = player.storage[sIndex];
      player.party[pIndex] = sCreature;
      player.storage[sIndex] = pCreature;
      players[state.currentPlayerIndex] = player;
    }
    return { players };
  }),

  sellPowerUp: (spaceIndex) => set((state) => {
    if (mpIntercept('sellPowerUp', [spaceIndex])) return state;
    const space = BOARD_SPACES[spaceIndex];
    if (!space.speciesId || !space.groupId) return state;

    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex] };
    const boardOwnership = { ...state.boardOwnership };
    const ownership = boardOwnership[spaceIndex];
    if (!ownership || ownership.ownerId !== player.id || ownership.powerUpTier === 0) return state;

    const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId && s.type === 'Creature');
    const maxTierInGroup = Math.max(...groupSpaces.map(s => boardOwnership[s.index]?.powerUpTier ?? 0));
    if (ownership.powerUpTier < maxTierInGroup) return state;

    const species = CREATURES[space.speciesId];
    const tierCost = (GROUP_HOUSE_COST[space.groupId] ?? 100) * groupSpaces.length;
    const refund = Math.floor(tierCost / 2);

    player.tp += refund;
    boardOwnership[spaceIndex] = { ...ownership, powerUpTier: ownership.powerUpTier - 1 };

    const creatureInParty = player.party.findIndex(c => c.id === ownership.creatureId);
    const creatureInStorage = player.storage.findIndex(c => c.id === ownership.creatureId);
    const deBoost = (c: ActiveCreature) => ({
      ...c,
      stats: {
        hp: Math.max(1, c.stats.hp - (Math.floor(species.baseForm.stats.hp * 0.1) || 1)),
        atk: Math.max(1, c.stats.atk - (Math.floor(species.baseForm.stats.atk * 0.1) || 1)),
        def: Math.max(1, c.stats.def - (Math.floor(species.baseForm.stats.def * 0.1) || 1)),
        spd: Math.max(1, c.stats.spd - (Math.floor(species.baseForm.stats.spd * 0.1) || 1)),
      }
    });
    if (creatureInParty !== -1) player.party[creatureInParty] = deBoost(player.party[creatureInParty]);
    else if (creatureInStorage !== -1) player.storage[creatureInStorage] = deBoost(player.storage[creatureInStorage]);

    players[state.currentPlayerIndex] = player;
    const stillNegative = player.tp < 0;
    const newPhase = !stillNegative && state.phase === 'BANKRUPTCY' ? 'END_TURN' : state.phase;
    const newLogs = [...state.gameLogs.slice(-49), `💸 ${player.name} sold a Power Up on ${species.baseForm.name} for ${refund} TP.`];
    return { players, boardOwnership, phase: newPhase, gameLogs: newLogs };
  }),

  declareBankruptcy: () => set((state) => {
    if (mpIntercept('declareBankruptcy', [])) return state;
    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex], isBankrupt: true, party: [], storage: [] };
    const boardOwnership = { ...state.boardOwnership };
    Object.keys(boardOwnership).forEach(key => {
      if (boardOwnership[Number(key)].ownerId === player.id) delete boardOwnership[Number(key)];
    });
    players[state.currentPlayerIndex] = player;

    const activePlayers = players.filter(p => !p.isBankrupt);
    if (activePlayers.length === 1) {
      const newLogs = [...state.gameLogs.slice(-49), `💀 ${player.name} has gone bankrupt!`, `🏆 ${activePlayers[0].name} is the last trainer standing!`];
      return { players, boardOwnership, phase: 'GAME_OVER', winner: activePlayers[0].name, gameLogs: newLogs };
    }

    let nextIndex = (state.currentPlayerIndex + 1) % players.length;
    let attempts = 0;
    while (players[nextIndex]?.isBankrupt && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    const newLogs = [...state.gameLogs.slice(-49), `💀 ${player.name} has gone bankrupt and left the game!`];
    return { players, boardOwnership, phase: 'ROLL', currentPlayerIndex: nextIndex, gameLogs: newLogs };
  }),

  clearCardMessage: () => {
    if (mpIntercept('clearCardMessage', [])) return;
    set({ cardMessage: null });
  },
  clearWildEncounter: () => {
    if (mpIntercept('clearWildEncounter', [])) return;
    set({ wildEncounter: null });
  },

  addPlayer: (name, color, isCpu) => set((state) => ({
    players: [
      ...state.players,
      {
        id: generateId(),
        name,
        tp: 1500,
        position: 0,
        party: [],
        storage: [],
        badges: [],
        inJail: false,
        jailTurns: 0,
        color,
        isCpu,
        isBankrupt: false,
        consecutiveDoubles: 0,
        inAdventure: false,
      }
    ]
  })),

  addCpuPlayers: (count?: number) => set((state) => {
    const cpuColors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#14b8a6', '#a855f7', '#f97316', '#ec4899'];
    const names = ['Rival Gary', 'Rival Blue', 'Rival Silver', 'Rival Wally', 'Rival Kris', 'Rival Ethan'];

    const maxToAdd = 6 - state.players.length;
    const toAdd = count !== undefined ? Math.min(count, maxToAdd) : maxToAdd;
    if (toAdd <= 0) return state;

    const newPlayers = [];
    for (let i = 0; i < toAdd; i++) {
      const idx = state.players.length + i;
      newPlayers.push({
        id: generateId(),
        name: names[idx] || `CPU ${idx}`,
        tp: 1500,
        position: 0,
        party: [],
        storage: [],
        badges: [],
        inJail: false,
        jailTurns: 0,
        color: cpuColors[idx] || '#ffffff',
        isCpu: true,
        isBankrupt: false,
        consecutiveDoubles: 0,
        inAdventure: false,
      });
    }
    return { players: [...state.players, ...newPlayers] };
  }),

  quitToMenu: () => set({ players: [], phase: 'MENU', boardOwnership: {}, currentPlayerIndex: 0, battleState: null, winner: null }),

  startGame: () => set({ phase: 'ROLL', currentPlayerIndex: 0 }),

  rollDice: () => set((state) => {
    if (mpIntercept('rollDice', [])) return state;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const totalRoll = d1 + d2;
    const isDoubles = d1 === d2;

    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex] };

    // --- Doubles tracking ---
    const newConsecutiveDoubles = isDoubles ? player.consecutiveDoubles + 1 : 0;
    player.consecutiveDoubles = newConsecutiveDoubles;

    // 3rd consecutive double → Lost in Adventure (index 30)
    if (isDoubles && newConsecutiveDoubles >= 3) {
      player.position = 30;
      player.consecutiveDoubles = 0;
      player.inAdventure = true;
      players[state.currentPlayerIndex] = player;
      const newLogs = [...state.gameLogs.slice(-49),
        `🎲 ${player.name} rolled doubles 3 times in a row and got Lost in Adventure!`];
      return { dice: [d1, d2], players, phase: 'END_TURN', rolledDoubles: false, gameLogs: newLogs };
    }

    // --- Normal movement ---
    let newPos = player.position + totalRoll;
    const passedHealingCenter = newPos >= 40;
    if (passedHealingCenter) newPos = newPos - 40;
    const landedOnHealingCenter = newPos === 0;

    // TP for passing / landing on Healing Center
    if (landedOnHealingCenter) {
      player.tp += 300;
    } else if (passedHealingCenter) {
      player.tp += 200;
    }

    player.position = newPos;

    // EXP for party on passing or landing on Healing Center
    if (passedHealingCenter && player.party.length > 0) {
      const expGain = landedOnHealingCenter ? 30 : 20;
      player.party = player.party.map(c => applyExp(c, expGain));
      if (landedOnHealingCenter) {
        player.party = player.party.map(c => ({ ...c, currentHp: c.stats.hp }));
      }
    }

    players[state.currentPlayerIndex] = player;

    const space = BOARD_SPACES[newPos];
    let wildEncounter = null;
    if (space.type === 'Wild') {
      const wildSpecies = ['aerozor', 'toxeon', 'steelodon', 'mythicor'];
      const randomSpecies = wildSpecies[Math.floor(Math.random() * wildSpecies.length)];
      wildEncounter = { speciesId: randomSpecies };
    }

    const suffix = landedOnHealingCenter
      ? ' — Landed on Healing Center! (+300 TP, healed, party +30 EXP)'
      : passedHealingCenter
      ? ' — Passed Go! (+200 TP, party +20 EXP)'
      : '';
    const doublesNote = isDoubles ? ' 🎲 DOUBLES — roll again!' : '';
    const logMsg = `${player.name} rolled ${totalRoll} (${d1}+${d2}) and moved to ${space.name}${suffix}${doublesNote}`;
    const newLogs = [...state.gameLogs.slice(-49), logMsg];

    return { dice: [d1, d2], players, phase: 'ACTION', wildEncounter, rolledDoubles: isDoubles, gameLogs: newLogs };
  }),

  endTurn: () => set((state) => {
    if (mpIntercept('endTurn', [])) return state;
    // If the player rolled doubles this turn, they roll again (same player, reset flag)
    if (state.rolledDoubles) {
      return { phase: 'ROLL', battleState: null, rolledDoubles: false };
    }
    // Reset consecutive doubles on actual turn change
    const players = [...state.players];
    players[state.currentPlayerIndex] = { ...players[state.currentPlayerIndex], consecutiveDoubles: 0 };
    let nextIndex = state.currentPlayerIndex + 1;
    if (nextIndex >= players.length) nextIndex = 0;
    let attempts = 0;
    while (players[nextIndex]?.isBankrupt && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    const nextPhase = players[nextIndex]?.inAdventure ? 'ADVENTURE' : 'ROLL';
    return { players, currentPlayerIndex: nextIndex, phase: nextPhase, battleState: null, rolledDoubles: false, pendingGymChallenge: false };
  }),

  captureTile: (spaceIndex) => set((state) => {
    if (mpIntercept('captureTile', [spaceIndex])) return state;
    const space = BOARD_SPACES[spaceIndex];
    if (space.type !== 'Creature' || !space.speciesId) return state;
    
    const species = CREATURES[space.speciesId];
    const player = { ...state.players[state.currentPlayerIndex] };
    
    const inParty = player.party.find(c => CREATURES[c.speciesId].groupId === space.groupId);
    const inStorage = player.storage.find(c => CREATURES[c.speciesId].groupId === space.groupId);
    const alreadyHasSpecies = !!(inParty || inStorage);
    
    if (player.tp < species.captureCost) return state;
    // Block purchase if it would leave player with 0 or negative TP when they have no other assets
    if (player.tp - species.captureCost < 0) return state;

    player.tp -= species.captureCost;

    let newCreatureId = '';

    if (!alreadyHasSpecies) {
      const newCreature: ActiveCreature = {
        id: generateId(),
        speciesId: species.id,
        currentHp: species.baseForm.stats.hp,
        level: 1,
        exp: 0,
        currentStage: 0,
        stats: { ...species.baseForm.stats }
      };
      
      if (player.party.length < 6) {
        player.party = [...player.party, newCreature];
      } else {
        player.storage = [...player.storage, newCreature];
      }
      newCreatureId = newCreature.id;
    } else {
      newCreatureId = inParty ? inParty.id : inStorage!.id;
    }
    
    const boardOwnership = { ...state.boardOwnership, [spaceIndex]: { ownerId: player.id, powerUpTier: 0, creatureId: newCreatureId } };

    // Evolution Check
    const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId);
    const ownedInGroup = groupSpaces.filter(s => boardOwnership[s.index]?.ownerId === player.id);
    
    let targetStage = 0;
    if (groupSpaces.length === 3) {
      if (ownedInGroup.length === 2) targetStage = 1;
      else if (ownedInGroup.length === 3) targetStage = 2;
    } else if (groupSpaces.length === 2) {
      if (ownedInGroup.length === 2) targetStage = 1;
    }
    
    const evolutionLogs: string[] = [];
    if (targetStage > 0) {
      const evolveList = (list: ActiveCreature[]) => list.map(c => {
        if (CREATURES[c.speciesId].groupId === space.groupId && c.currentStage < targetStage) {
          const speciesData = CREATURES[c.speciesId];
          let newForm = null;
          if (targetStage === 1) newForm = speciesData.stage1Form;
          else if (targetStage === 2) newForm = speciesData.stage2Form || speciesData.stage1Form;

          if (newForm) {
            // Stage 1 of a 3-stage line gets 10%; everything else (stage-1-only or stage 2) gets 20%
            const multiplier = targetStage === 1 && speciesData.stage2Form ? 0.1 : 0.2;
            const boostedStats = {
              hp:  newForm.stats.hp  + Math.max(1, Math.floor(newForm.stats.hp  * multiplier)),
              atk: newForm.stats.atk + Math.max(1, Math.floor(newForm.stats.atk * multiplier)),
              def: newForm.stats.def + Math.max(1, Math.floor(newForm.stats.def * multiplier)),
              spd: newForm.stats.spd + Math.max(1, Math.floor(newForm.stats.spd * multiplier)),
            };
            evolutionLogs.push(`🌟 ${player.name}'s ${speciesData.baseForm.name} evolved into ${newForm.name}! (Stage ${targetStage})`);
            return {
              ...c,
              currentStage: targetStage as 1 | 2,
              stats: boostedStats,
              currentHp: boostedStats.hp
            };
          }
        }
        return c;
      });

      player.party = evolveList(player.party);
      player.storage = evolveList(player.storage);
    }

    const players = [...state.players];
    players[state.currentPlayerIndex] = player;

    const capturedName = species.baseForm.name;
    const newLogs = [
      ...state.gameLogs.slice(-(49 - evolutionLogs.length)),
      `${player.name} captured ${capturedName}! (-${species.captureCost} TP)`,
      ...evolutionLogs,
    ];

    return { players, boardOwnership, phase: 'END_TURN', gameLogs: newLogs };
  }),

  captureWildCreature: () => set((state) => {
    if (mpIntercept('captureWildCreature', [])) return state;
    if (!state.wildEncounter) return state;
    
    const species = CREATURES[state.wildEncounter.speciesId];
    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex] };
    
    if (player.tp < species.captureCost) return state;

    const partyIndex = player.party.findIndex(c => c.speciesId === species.id);
    const storageIndex = player.storage.findIndex(c => c.speciesId === species.id);
    const existingIndex = partyIndex !== -1 ? partyIndex : storageIndex;
    const isStored = partyIndex === -1 && storageIndex !== -1;
    
    player.tp -= species.captureCost;

    if (existingIndex !== -1) {
      // Evolve existing
      const c = isStored ? player.storage[existingIndex] : player.party[existingIndex];
      let newStage = c.currentStage;
      let newForm = null;
      if (c.currentStage === 0 && species.stage1Form) {
        newStage = 1;
        newForm = species.stage1Form;
      } else if (c.currentStage === 1 && species.stage2Form) {
        newStage = 2;
        newForm = species.stage2Form;
      }
      
      if (newForm) {
        // Stage 1 of a 3-stage line gets 10%; stage-1-only or stage 2 gets 20%
        const multiplier = newStage === 1 && species.stage2Form ? 0.1 : 0.2;
        const boostedStats = {
          hp:  newForm.stats.hp  + Math.max(1, Math.floor(newForm.stats.hp  * multiplier)),
          atk: newForm.stats.atk + Math.max(1, Math.floor(newForm.stats.atk * multiplier)),
          def: newForm.stats.def + Math.max(1, Math.floor(newForm.stats.def * multiplier)),
          spd: newForm.stats.spd + Math.max(1, Math.floor(newForm.stats.spd * multiplier)),
        };
        const updated = {
          ...c,
          currentStage: newStage as 1 | 2,
          stats: boostedStats,
          currentHp: boostedStats.hp
        };
        if (isStored) {
          player.storage[existingIndex] = updated;
        } else {
          player.party[existingIndex] = updated;
        }
      }
    } else {
      // Add new
      const newCreature: ActiveCreature = {
        id: generateId(),
        speciesId: species.id,
        currentHp: species.baseForm.stats.hp,
        level: 1,
        exp: 0,
        currentStage: 0,
        stats: { ...species.baseForm.stats }
      };
      if (player.party.length < 6) {
        player.party = [...player.party, newCreature];
      } else {
        player.storage = [...player.storage, newCreature];
      }
    }
    
    players[state.currentPlayerIndex] = player;
    return { players, wildEncounter: null, phase: 'END_TURN' };
  }),

  releaseCreature: (creatureId) => set((state) => {
    if (mpIntercept('releaseCreature', [creatureId])) return state;
    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex] };
    
    // Search party first, then storage
    let creature = player.party.find(c => c.id === creatureId);
    const inParty = !!creature;
    if (!creature) creature = player.storage.find(c => c.id === creatureId);
    if (!creature) return state;

    const species = CREATURES[creature.speciesId];
    
    // Remove from party or storage
    if (inParty) {
      player.party = player.party.filter(c => c.id !== creatureId);
    } else {
      player.storage = player.storage.filter(c => c.id !== creatureId);
    }
    // Refund TP (half the capture cost, ignoring any evolutions)
    player.tp += Math.floor(species.captureCost / 2);
    
    // Remove ALL ownership entries pointing to this creature (group tiles share same creatureId)
    const boardOwnership = { ...state.boardOwnership };
    Object.keys(boardOwnership).forEach(key => {
      if (boardOwnership[Number(key)].creatureId === creatureId) delete boardOwnership[Number(key)];
    });

    players[state.currentPlayerIndex] = player;
    
    // After release, check if they're still negative — if not, exit bankruptcy
    const stillNegative = player.tp < 0;
    const newPhase = !stillNegative && state.phase === 'BANKRUPTCY' ? 'END_TURN' : state.phase;
    const newLogs = [...state.gameLogs.slice(-49), `${player.name} released ${species.baseForm.name} for ${Math.floor(species.captureCost / 2)} TP.`];
    return { players, boardOwnership, phase: newPhase, gameLogs: newLogs };
  }),

  payRent: (spaceIndex) => set((state) => {
    if (mpIntercept('payRent', [spaceIndex])) return state;
    const ownership = state.boardOwnership[spaceIndex];
    if (!ownership) return state;

    const space = BOARD_SPACES[spaceIndex];
    const species = CREATURES[space.speciesId!];

    const players = [...state.players];
    const fromPlayer = { ...players[state.currentPlayerIndex] };
    const toPlayerIndex = players.findIndex(p => p.id === ownership.ownerId);

    if (toPlayerIndex === -1 || fromPlayer.id === ownership.ownerId) return state;

    const rentAmount = species.baseRent + (GROUP_RENT_PER_TIER[space.groupId!] ?? 50) * ownership.powerUpTier;
    fromPlayer.tp -= rentAmount;
    players[toPlayerIndex].tp += rentAmount;
    players[state.currentPlayerIndex] = fromPlayer;

    const toPlayer = players[toPlayerIndex];
    const newLogs = [...state.gameLogs.slice(-49), `${fromPlayer.name} paid ${rentAmount} TP rent to ${toPlayer.name}.`];
    
    // Check for bankruptcy
    if (fromPlayer.tp < 0) {
      return { players, gameLogs: newLogs, phase: 'BANKRUPTCY' };
    }
    return { players, phase: 'END_TURN', gameLogs: newLogs };
  }),

  startChampionBattle: () => set((state) => {
    if (mpIntercept('startChampionBattle', [])) return state;
    const player = state.players[state.currentPlayerIndex];
    if (player.badges.length < 8) return state;
    if (BOARD_SPACES[player.position].index !== 20) return state;
    const champCreature = CHAMPION.party[Math.floor(Math.random() * CHAMPION.party.length)];
    return {
      phase: 'BATTLE',
      battleState: {
        isActive: true,
        type: 'CHAMPION',
        challengerId: player.id,
        defenderId: 'CHAMPION',
        defenderCreatureTemp: champCreature,
        round: 1,
        logs: [`${player.name} challenges ${CHAMPION.name}! Face ${champCreature.name}!`]
      }
    };
  }),

  startBattle: (spaceIndex, isGym) => set((state) => {
    if (mpIntercept('startBattle', [spaceIndex, isGym])) return state;
    const player = state.players[state.currentPlayerIndex];

    if (isGym) {
      const space = BOARD_SPACES[spaceIndex];
      const gymData = GYM_LEADERS[space.gymTier!];
      return {
        phase: 'BATTLE',
        pendingGymChallenge: false,
        battleState: {
          isActive: true,
          type: 'GYM',
          challengerId: player.id,
          defenderId: 'GYM',
          defenderCreatureTemp: gymData.creature,
          round: 1,
          logs: [`You challenged ${gymData.name}!`]
        }
      };
    } else {
      const ownership = state.boardOwnership[spaceIndex];
      return {
        phase: 'BATTLE',
        battleState: {
          isActive: true,
          type: 'TILE',
          challengerId: player.id,
          defenderId: ownership.ownerId,
          defenderCreatureId: ownership.creatureId,
          round: 1,
          logs: [`Tile battle initiated against ${ownership.ownerId}!`]
        }
      };
    }
  }),

  selectBattleCreature: (creatureId) => set((state) => {
    if (mpIntercept('selectBattleCreature', [creatureId])) return state;
    if (!state.battleState) return state;
    return {
      battleState: {
        ...state.battleState,
        challengerCreatureId: creatureId,
        logs: [...state.battleState.logs, `Sent out creature!`]
      }
    };
  }),

  executeBattleRound: () => set((state) => {
    if (mpIntercept('executeBattleRound', [])) return state;
    if (!state.battleState || !state.battleState.challengerCreatureId) return state;
    
    const players = [...state.players];
    const challenger = players.find(p => p.id === state.battleState!.challengerId);
    let chalCreature = challenger?.party.find(c => c.id === state.battleState!.challengerCreatureId);
    
    if (!challenger || !chalCreature) return state;

    let defStats;
    let defType;
    let defName;

    if (state.battleState.type === 'GYM' || state.battleState.type === 'CHAMPION') {
      const form = state.battleState.defenderCreatureTemp!;
      defStats = form.stats;
      defType = form.type;
      defName = form.name;
    } else {
      const defender = players.find(p => p.id === state.battleState!.defenderId);
      // Search party first, then storage (fixes CPU vs CPU hang when creature is in storage)
      const defCreatureObj = defender?.party.find(c => c.id === state.battleState!.defenderCreatureId)
        ?? defender?.storage.find(c => c.id === state.battleState!.defenderCreatureId);
      if (!defCreatureObj) {
        // Defender has no creature at all — challenger wins by forfeit
        const defIdx = players.findIndex(p => p.id === state.battleState!.defenderId);
        const space = BOARD_SPACES[challenger.position];
        const tileSpecies = CREATURES[space.speciesId!];
        if (tileSpecies) {
          const forfeitOwnership = state.boardOwnership[challenger.position];
          const forfeitFullRent = tileSpecies.baseRent + (GROUP_RENT_PER_TIER[space.groupId ?? ''] ?? 50) * (forfeitOwnership?.powerUpTier ?? 0);
          const rentAmount = Math.floor(forfeitFullRent / 2);
          players[players.findIndex(p => p.id === challenger.id)].tp -= rentAmount;
          if (defIdx !== -1) players[defIdx].tp += rentAmount;
        }
        const newLogs = [...state.gameLogs.slice(-49), `${challenger.name} won by forfeit!`];
        return { players, battleState: { ...state.battleState, isActive: false, logs: [...state.battleState.logs, 'Defender has no creature — challenger wins by forfeit!'] }, gameLogs: newLogs };
      }
      const defSpecies = CREATURES[defCreatureObj.speciesId];
      const form = defCreatureObj.currentStage === 0 ? defSpecies.baseForm
        : defCreatureObj.currentStage === 1 ? (defSpecies.stage1Form || defSpecies.baseForm)
        : (defSpecies.stage2Form || defSpecies.stage1Form || defSpecies.baseForm);
      defStats = defCreatureObj.stats;
      defType = form!.type;
      defName = form!.name;
    }

    const chalSpecies = CREATURES[chalCreature.speciesId];
    const chalForm = chalCreature.currentStage === 0 ? chalSpecies.baseForm
      : chalCreature.currentStage === 1 ? (chalSpecies.stage1Form || chalSpecies.baseForm)
      : (chalSpecies.stage2Form || chalSpecies.stage1Form || chalSpecies.baseForm);
    const chalType = chalForm!.type;

    const damageToDef = calculateDamage(chalCreature.stats, chalType, defStats, defType);
    const damageToChal = calculateDamage(defStats, defType, chalCreature.stats, chalType);

    const logs = [...state.battleState.logs, `Round ${state.battleState.round}:`];
    logs.push(`${chalForm.name} deals ${damageToDef} dmg!`);
    logs.push(`${defName} deals ${damageToChal} dmg!`);

    const chalWins = damageToDef >= damageToChal;
    
    logs.push(chalWins ? 'Challenger won the battle!' : 'Defender won the battle!');

    const chalIndex = players.findIndex(p => p.id === challenger.id);
    const chalCreatureIndex = players[chalIndex].party.findIndex(c => c.id === chalCreature.id);
    
    const gymBadgeAlreadyOwned = state.battleState.type === 'GYM' && chalWins && (() => {
      const space = BOARD_SPACES[challenger.position];
      const gymData = GYM_LEADERS[space.gymTier!];
      return gymData ? players[chalIndex].badges.includes(gymData.badgeReward) : false;
    })();
    const chalExpGain = chalWins ? (state.battleState.type === 'GYM' ? (gymBadgeAlreadyOwned ? 20 : 100) : 50) : 20;
    const oldLevel = players[chalIndex].party[chalCreatureIndex].level;
    players[chalIndex].party[chalCreatureIndex] = applyExp(players[chalIndex].party[chalCreatureIndex], chalExpGain);
    logs.push(`${chalForm.name} gained ${chalExpGain} EXP!`);
    if (players[chalIndex].party[chalCreatureIndex].level > oldLevel) {
      logs.push(`${chalForm.name} leveled up to Level ${players[chalIndex].party[chalCreatureIndex].level}!`);
    }

    if (state.battleState.type === 'TILE') {
      const space = BOARD_SPACES[challenger.position];
      const species = CREATURES[space.speciesId!];
      const tileOwnership = state.boardOwnership[challenger.position];
      const fullRent = species.baseRent + (GROUP_RENT_PER_TIER[space.groupId!] ?? 50) * (tileOwnership?.powerUpTier ?? 0);
      const rentAmount = chalWins ? Math.floor(fullRent / 2) : Math.floor(fullRent * 1.3);
      logs.push(chalWins ? `Challenger pays HALF rent (${rentAmount} TP of ${fullRent} TP)!` : `Challenger pays 30% MORE rent (${rentAmount} TP of ${fullRent} TP)!`);
      
      const defIndex = players.findIndex(p => p.id === state.battleState!.defenderId);
      players[chalIndex].tp -= rentAmount;
      players[defIndex].tp += rentAmount;

      // Defender EXP
      const defCreatureObj = players[defIndex].party.find(c => c.id === state.battleState!.defenderCreatureId);
      if (defCreatureObj) {
        const defCreatureIndex = players[defIndex].party.findIndex(c => c.id === defCreatureObj.id);
        const defExpGain = chalWins ? 20 : 50;
        const oldDefLevel = players[defIndex].party[defCreatureIndex].level;
        players[defIndex].party[defCreatureIndex] = applyExp(players[defIndex].party[defCreatureIndex], defExpGain);
        logs.push(`${defName} gained ${defExpGain} EXP!`);
        if (players[defIndex].party[defCreatureIndex].level > oldDefLevel) {
          logs.push(`${defName} leveled up to Level ${players[defIndex].party[defCreatureIndex].level}!`);
        }
      }

    } else if (state.battleState.type === 'GYM') {
      if (chalWins) {
        const space = BOARD_SPACES[challenger.position];
        const gymData = GYM_LEADERS[space.gymTier!];
        if (gymData && !players[chalIndex].badges.includes(gymData.badgeReward)) {
          players[chalIndex].badges.push(gymData.badgeReward);
          players[chalIndex].tp += 500;
          logs.push('Earned a Gym Badge and 500 TP!');
        } else {
          players[chalIndex].tp += 50;
          logs.push('Repeat victory! Earned 50 TP.');
        }
      } else {
        logs.push('Lost the Gym Battle. Try again later!');
      }
    } else if (state.battleState.type === 'CHAMPION') {
      if (chalWins) {
        logs.push(`${challenger.name} defeated ${CHAMPION.name} and became Champion!`);
      } else {
        logs.push(`${challenger.name} lost to ${CHAMPION.name}! Better train harder…`);
      }
    }

    const championWon = state.battleState.type === 'CHAMPION' && chalWins;

    const newGameLogs = [
      ...state.gameLogs.slice(-45),
      `⚔️ ${challenger.name}'s ${chalForm!.name} vs ${defName} — ${chalWins ? challenger.name + ' wins!' : 'Challenger loses!'}`,
      ...logs.filter(l => l.includes('leveled up') || l.includes('EXP') || l.includes('Badge') || l.includes('rent'))
    ];

    return {
      players,
      gameLogs: newGameLogs,
      winner: championWon ? players[chalIndex].name : state.winner,
      battleState: {
        ...state.battleState,
        isActive: false,
        logs
      }
    };
  }),

  endBattle: () => set((state) => {
    if (mpIntercept('endBattle', [])) return state;
    const player = state.players[state.currentPlayerIndex];
    const newPhase = player.tp < 0 ? 'BANKRUPTCY' : 'END_TURN';
    return { phase: newPhase, battleState: null };
  }),

  drawCard: (deckType: string) => set((state) => {
    if (mpIntercept('drawCard', [deckType])) return state;
    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex] };

    const gymPositions = [5, 9, 15, 19, 25, 29, 35, 39];
    const nearestGym = gymPositions.find(g => g > player.position) ?? gymPositions[0];

    const healAndExpParty = (p: typeof player, exp: number) => ({
      ...p,
      position: 0,
      tp: p.tp + 300,
      party: p.party.map(c => ({ ...applyExp(c, exp), currentHp: applyExp(c, exp).stats.hp })),
    });

    // Move to a gym, awarding passing-Go bonus if the destination wraps past position 0
    const moveToGym = (dest: number) => {
      const passedGo = dest <= player.position;
      if (passedGo) {
        player.tp += 200;
        if (player.party.length > 0) {
          player.party = player.party.map(c => applyExp(c, 20));
        }
      }
      player.position = dest;
    };

    let msg = '';
    let movedToGym = false;
    const rand = Math.random();

    const creatureSpaces = BOARD_SPACES.filter(s => s.type === 'Creature');

    if (deckType === 'Scout') {
      if (rand < 1 / 11) {
        msg = 'Found a hidden item! Gain 100 TP.';
        player.tp += 100;
      } else if (rand < 2 / 11) {
        msg = 'Scouted a shortcut. Advance 3 spaces.';
        player.position = (player.position + 3) % 40;
      } else if (rand < 3 / 11) {
        msg = 'Ambushed by wild creatures! Lose 50 TP.';
        player.tp -= 50;
      } else if (rand < 4 / 11) {
        msg = 'Found a trail back to the Healing Center! +300 TP, party healed & gained 30 EXP.';
        const healed = healAndExpParty(player, 30);
        player.position = healed.position;
        player.tp = healed.tp;
        player.party = healed.party;
      } else if (rand < 5 / 11) {
        msg = 'Spotted a gym nearby! Challenge the nearest gym.';
        moveToGym(nearestGym);
        movedToGym = true;
      } else if (rand < 6 / 11) {
        msg = 'Received orders to report to Gym 1! Challenge the gym leader.';
        moveToGym(5);
        movedToGym = true;
      } else if (rand < 7 / 11) {
        msg = 'Lost in the wilderness! Go directly to Lost in Adventure — do not collect TP.';
        player.position = 30;
        player.inAdventure = true;
      } else if (rand < 8 / 11) {
        // Collect 50 TP from each other player
        const perPlayer = 50;
        let collected = 0;
        state.players.forEach((p, idx) => {
          if (idx !== state.currentPlayerIndex && !p.isBankrupt) {
            players[idx] = { ...players[idx], tp: players[idx].tp - perPlayer };
            collected += perPlayer;
          }
        });
        player.tp += collected;
        msg = `Scout Network! Collected ${perPlayer} TP from each rival trainer (+${collected} TP total).`;
      } else if (rand < 9 / 11) {
        msg = 'Found a little TP on the trail! +50 TP.';
        player.tp += 50;
      } else if (rand < 10 / 11) {
        // Move to a random tile on the board
        const dest = Math.floor(Math.random() * 40);
        const passedGo = dest < player.position;
        if (passedGo) player.tp += 200;
        player.position = dest;
        msg = `Your scout map leads you to space ${dest}!${passedGo ? ' Passed Go — collect 200 TP.' : ''}`;
      } else {
        // Move to a random unowned creature tile; if all owned, random tile
        const unownedSpaces = creatureSpaces.filter(s => !state.boardOwnership[s.index]);
        if (unownedSpaces.length > 0) {
          const dest = unownedSpaces[Math.floor(Math.random() * unownedSpaces.length)];
          const passedGo = dest.index < player.position;
          if (passedGo) player.tp += 200;
          player.position = dest.index;
          msg = `Scouted an unclaimed territory — head to ${dest.name}!${passedGo ? ' Passed Go — collect 200 TP.' : ''}`;
        } else {
          const dest = Math.floor(Math.random() * 40);
          const passedGo = dest < player.position;
          if (passedGo) player.tp += 200;
          player.position = dest;
          msg = `All territories claimed! Scout redirects you to space ${dest}.${passedGo ? ' Passed Go — collect 200 TP.' : ''}`;
        }
      }
    } else {
      if (rand < 1 / 10) {
        msg = 'Read up on battling techniques. Gain 200 TP.';
        player.tp += 200;
      } else if (rand < 2 / 10) {
        msg = 'Bought new supplies. Pay 100 TP.';
        player.tp -= 100;
      } else if (rand < 3 / 10) {
        msg = 'Your journal led you back to the Healing Center! +300 TP, party healed & gained 30 EXP.';
        const healed = healAndExpParty(player, 30);
        player.position = healed.position;
        player.tp = healed.tp;
        player.party = healed.party;
      } else if (rand < 4 / 10) {
        msg = 'Your notes pointed to a nearby gym! Challenge the gym leader.';
        moveToGym(nearestGym);
        movedToGym = true;
      } else if (rand < 5 / 10) {
        msg = 'Your journal says to start from the top — head to Gym 1! Challenge the gym leader.';
        moveToGym(5);
        movedToGym = true;
      } else if (rand < 6 / 10) {
        msg = 'Got lost reading old notes! Go directly to Lost in Adventure — do not collect TP.';
        player.position = 30;
        player.inAdventure = true;
      } else if (rand < 7 / 10) {
        // Pay 50 TP to each other player
        const perPlayer = 50;
        let paid = 0;
        state.players.forEach((p, idx) => {
          if (idx !== state.currentPlayerIndex && !p.isBankrupt) {
            players[idx] = { ...players[idx], tp: players[idx].tp + perPlayer };
            paid += perPlayer;
          }
        });
        player.tp -= paid;
        msg = `Trainer Convention! Pay ${perPlayer} TP to each rival trainer (-${paid} TP total).`;
      } else if (rand < 8 / 10) {
        msg = 'Won a regional contest! +300 TP.';
        player.tp += 300;
      } else if (rand < 9 / 10) {
        // Street Repairs: pay 25 TP per power-up tier, 100 TP per Sanctum
        let repairCost = 0;
        Object.entries(state.boardOwnership).forEach(([, own]) => {
          if (own.ownerId === player.id && own.powerUpTier > 0) {
            repairCost += own.powerUpTier >= 5 ? 100 : own.powerUpTier * 25;
          }
        });
        player.tp -= repairCost;
        msg = repairCost === 0
          ? 'Street Repairs — no power-ups owned, no charge!'
          : `Street Repairs! Pay ${repairCost} TP (25 TP/power-up tier, 100 TP/Sanctum).`;
      } else {
        // Move to one of your own tiles; if none, no effect
        const ownedSpaces = creatureSpaces.filter(s => state.boardOwnership[s.index]?.ownerId === player.id);
        if (ownedSpaces.length > 0) {
          const dest = ownedSpaces[Math.floor(Math.random() * ownedSpaces.length)];
          const passedGo = dest.index < player.position;
          if (passedGo) player.tp += 200;
          player.position = dest.index;
          msg = `Journeyed back to your own territory — ${dest.name}!${passedGo ? ' Passed Go — collect 200 TP.' : ''}`;
        } else {
          msg = 'Wanted to visit your own territory, but you own none yet. Stay put.';
        }
      }
    }

    players[state.currentPlayerIndex] = player;
    const newLogs = [...state.gameLogs.slice(-49), `🃏 ${player.name} drew a card: ${msg}`];
    if (player.tp < 0) {
      return { players, cardMessage: msg, phase: 'BANKRUPTCY', gameLogs: newLogs };
    }

    // Determine the correct phase for where the player landed
    const landedSpace = BOARD_SPACES[player.position];
    let landingPhase: GamePhase = 'END_TURN';
    let landingWildEncounter: { speciesId: string } | null = null;

    if (!movedToGym && !player.inAdventure) {
      if (landedSpace.type === 'Creature' || landedSpace.type === 'Event' || landedSpace.type === 'Tax') {
        landingPhase = 'ACTION';
      } else if (landedSpace.type === 'Wild') {
        landingPhase = 'ACTION';
        const wildSpecies = ['aerozor', 'toxeon', 'steelodon', 'mythicor'];
        landingWildEncounter = { speciesId: wildSpecies[Math.floor(Math.random() * wildSpecies.length)] };
      } else if (landedSpace.type === 'Gym') {
        landingPhase = 'ACTION';
      }
      // Start / Corner → END_TURN (no action needed)
    }

    return { players, cardMessage: msg, phase: landingPhase, pendingGymChallenge: movedToGym, wildEncounter: landingWildEncounter, gameLogs: newLogs };
  }),

  payTax: (amount: number) => set((state) => {
    if (mpIntercept('payTax', [amount])) return state;
    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex] };
    player.tp -= amount;
    players[state.currentPlayerIndex] = player;
    const newLogs = [...state.gameLogs.slice(-49), `💰 ${player.name} paid ${amount} TP in taxes.`];
    if (player.tp < 0) {
      return { players, phase: 'BANKRUPTCY', gameLogs: newLogs };
    }
    return { players, phase: 'END_TURN', gameLogs: newLogs };
  }),

  initiateTrade: (targetId) => set((state) => {
    if (mpIntercept('initiateTrade', [targetId])) return state;
    const initiatorId = state.players[state.currentPlayerIndex].id;
    return {
      tradeState: {
        status: 'DRAFTING',
        initiatorId,
        targetId,
        responderId: targetId,
        offeredTp: 0,
        offeredCreatureIds: [],
        requestedTp: 0,
        requestedCreatureIds: []
      }
    };
  }),

  updateTradeOffer: (offer) => set((state) => {
    if (mpIntercept('updateTradeOffer', [offer])) return state;
    if (!state.tradeState) return state;
    return { tradeState: { ...state.tradeState, ...offer } };
  }),

  proposeTrade: () => set((state) => {
    if (mpIntercept('proposeTrade', [])) return state;
    if (!state.tradeState) return state;
    const targetPlayer = state.players.find(p => p.id === state.tradeState!.targetId);
    if (targetPlayer?.isCpu) {
      return { tradeState: null, cardMessage: `${targetPlayer.name} is not interested in trading right now.` };
    }
    return { tradeState: { ...state.tradeState, status: 'PROPOSED', responderId: state.tradeState.targetId } };
  }),

  negotiateTrade: () => set((state) => {
    if (mpIntercept('negotiateTrade', [])) return state;
    if (!state.tradeState) return state;
    const trade = state.tradeState;
    // Flip who responds: current responder becomes the new drafter, the other side waits
    const newResponderId = trade.responderId === trade.targetId ? trade.initiatorId : trade.targetId;
    return { tradeState: { ...trade, status: 'COUNTER', responderId: newResponderId } };
  }),

  acceptTrade: () => set((state) => {
    if (mpIntercept('acceptTrade', [])) return state;
    if (!state.tradeState) return state;
    const trade = state.tradeState;
    const players = [...state.players];
    const initIdx = players.findIndex(p => p.id === trade.initiatorId);
    const targetIdx = players.findIndex(p => p.id === trade.targetId);
    if (initIdx === -1 || targetIdx === -1) return state;

    const initPlayer = { ...players[initIdx], party: [...players[initIdx].party], storage: [...players[initIdx].storage] };
    const targetPlayer = { ...players[targetIdx], party: [...players[targetIdx].party], storage: [...players[targetIdx].storage] };

    // ── Validation ──────────────────────────────────────────────────────────────
    // Block if the trade leaves either player with negative TP
    const initTpAfter = initPlayer.tp - trade.offeredTp + trade.requestedTp;
    const targetTpAfter = targetPlayer.tp - trade.requestedTp + trade.offeredTp;
    if (initTpAfter < 0 || targetTpAfter < 0) return state;

    // Block if either player would be left with ZERO creatures (party + storage combined)
    const initTotalCreatures = initPlayer.party.length + initPlayer.storage.length;
    const targetTotalCreatures = targetPlayer.party.length + targetPlayer.storage.length;
    if (trade.offeredCreatureIds.length >= initTotalCreatures && trade.requestedCreatureIds.length === 0) return state;
    if (trade.requestedCreatureIds.length >= targetTotalCreatures && trade.offeredCreatureIds.length === 0) return state;
    // ─────────────────────────────────────────────────────────────────────────────

    initPlayer.tp = initTpAfter;
    targetPlayer.tp = targetTpAfter;

    const offeredCreatures = [...initPlayer.party, ...initPlayer.storage].filter(c => trade.offeredCreatureIds.includes(c.id));
    const requestedCreatures = [...targetPlayer.party, ...targetPlayer.storage].filter(c => trade.requestedCreatureIds.includes(c.id));

    // Remove traded creatures from their original owners (party and storage)
    initPlayer.party = initPlayer.party.filter(c => !trade.offeredCreatureIds.includes(c.id));
    initPlayer.storage = initPlayer.storage.filter(c => !trade.offeredCreatureIds.includes(c.id));
    targetPlayer.party = targetPlayer.party.filter(c => !trade.requestedCreatureIds.includes(c.id));
    targetPlayer.storage = targetPlayer.storage.filter(c => !trade.requestedCreatureIds.includes(c.id));

    // Merge an incoming creature into a receiver's party/storage.
    // If the receiver already has a creature of the same groupId, merge them:
    // keep the one with the higher level (exp as tiebreak), using the existing creature's ID
    // so boardOwnership refs remain valid. Returns the surviving creature ID.
    const mergeIntoPlayer = (
      receiver: typeof initPlayer,
      incoming: ActiveCreature,
    ): string => {
      const incomingGroup = CREATURES[incoming.speciesId].groupId;
      const existingInParty = receiver.party.find(c => CREATURES[c.speciesId].groupId === incomingGroup);
      const existingInStorage = existingInParty ? null : receiver.storage.find(c => CREATURES[c.speciesId].groupId === incomingGroup);
      const existing = existingInParty ?? existingInStorage;

      if (existing) {
        // Pick the creature with more progress (level first, then exp)
        const incomingWins = incoming.level > existing.level ||
          (incoming.level === existing.level && incoming.exp > existing.exp);

        if (incomingWins) {
          // Incoming has better stats — overwrite existing slot but keep existing.id
          // so all boardOwnership entries keep pointing to the right creature
          const merged: ActiveCreature = { ...incoming, id: existing.id };
          if (existingInParty) {
            const idx = receiver.party.findIndex(c => c.id === existing.id);
            receiver.party = [...receiver.party];
            receiver.party[idx] = merged;
          } else {
            const idx = receiver.storage.findIndex(c => c.id === existing.id);
            receiver.storage = [...receiver.storage];
            receiver.storage[idx] = merged;
          }
        }
        // Either way the surviving ID is existing.id
        return existing.id;
      }

      // No duplicate — add normally
      if (receiver.party.length < 6) {
        receiver.party = [...receiver.party, incoming];
      } else {
        receiver.storage = [...receiver.storage, incoming];
      }
      return incoming.id;
    };

    // idRemap: original traded creature ID -> surviving creature ID in receiver
    const idRemap: Record<string, string> = {};
    for (const c of offeredCreatures) {
      idRemap[c.id] = mergeIntoPlayer(targetPlayer, c);
    }
    for (const c of requestedCreatures) {
      idRemap[c.id] = mergeIntoPlayer(initPlayer, c);
    }

    // Transfer board ownership, remapping creature IDs to survivors
    const boardOwnership = { ...state.boardOwnership };
    Object.keys(boardOwnership).forEach(key => {
      const spaceIdx = Number(key);
      const ownership = boardOwnership[spaceIdx];
      if (trade.offeredCreatureIds.includes(ownership.creatureId)) {
        boardOwnership[spaceIdx] = { ...ownership, ownerId: trade.targetId, creatureId: idRemap[ownership.creatureId] ?? ownership.creatureId };
      } else if (trade.requestedCreatureIds.includes(ownership.creatureId)) {
        boardOwnership[spaceIdx] = { ...ownership, ownerId: trade.initiatorId, creatureId: idRemap[ownership.creatureId] ?? ownership.creatureId };
      }
    });

    // Trigger evolution for both players now that ownership has changed
    const triggerEvolutions = (p: typeof initPlayer, playerId: string) => {
      const groupOwned: Record<string, number> = {};
      const groupTotal: Record<string, number> = {};
      BOARD_SPACES.forEach(space => {
        if (space.type !== 'Creature' || !space.groupId) return;
        groupTotal[space.groupId] = (groupTotal[space.groupId] ?? 0) + 1;
        if (boardOwnership[space.index]?.ownerId === playerId) {
          groupOwned[space.groupId] = (groupOwned[space.groupId] ?? 0) + 1;
        }
      });

      Object.keys(groupTotal).forEach(groupId => {
        const owned = groupOwned[groupId] ?? 0;
        const total = groupTotal[groupId];
        let targetStage = 0;
        if (total === 3) {
          if (owned === 2) targetStage = 1;
          else if (owned === 3) targetStage = 2;
        } else if (total === 2 && owned === 2) {
          targetStage = 1;
        }
        if (targetStage === 0) return;

        const evolveList = (list: ActiveCreature[]) => list.map(c => {
          const speciesData = CREATURES[c.speciesId];
          if (speciesData.groupId !== groupId || c.currentStage >= targetStage) return c;
          const newForm = targetStage === 1 ? speciesData.stage1Form
            : (speciesData.stage2Form ?? speciesData.stage1Form);
          if (!newForm) return c;
          const multiplier = targetStage === 1 && speciesData.stage2Form ? 0.1 : 0.2;
          const boostedStats = {
            hp:  newForm.stats.hp  + Math.max(1, Math.floor(newForm.stats.hp  * multiplier)),
            atk: newForm.stats.atk + Math.max(1, Math.floor(newForm.stats.atk * multiplier)),
            def: newForm.stats.def + Math.max(1, Math.floor(newForm.stats.def * multiplier)),
            spd: newForm.stats.spd + Math.max(1, Math.floor(newForm.stats.spd * multiplier)),
          };
          return { ...c, currentStage: targetStage as 1 | 2, stats: boostedStats, currentHp: boostedStats.hp };
        });
        p.party = evolveList(p.party);
        p.storage = evolveList(p.storage);
      });
    };

    triggerEvolutions(initPlayer, trade.initiatorId);
    triggerEvolutions(targetPlayer, trade.targetId);

    if (initPlayer.party.length > 6 || targetPlayer.party.length > 6) {
      alert("Trade failed: A player cannot exceed 6 creatures in their party!");
      return state;
    }

    players[initIdx] = initPlayer;
    players[targetIdx] = targetPlayer;

    return { players, boardOwnership, tradeState: null, cardMessage: 'Trade completed successfully!' };
  }),

  declineTrade: () => {
    if (mpIntercept('declineTrade', [])) return;
    set({ tradeState: null, cardMessage: 'Trade declined.' });
  },
  cancelTrade: () => {
    if (mpIntercept('cancelTrade', [])) return;
    set({ tradeState: null });
  },

  payAdventureFine: () => set((state) => {
    if (mpIntercept('payAdventureFine', [])) return state;
    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex] };
    player.tp -= 50;
    player.inAdventure = false;
    players[state.currentPlayerIndex] = player;
    const newLogs = [...state.gameLogs.slice(-49), `${player.name} paid 50 TP to escape Lost in Adventure!`];
    if (player.tp < 0) {
      return { players, phase: 'BANKRUPTCY', gameLogs: newLogs };
    }
    return { players, phase: 'ROLL', gameLogs: newLogs };
  }),

  loseAdventureTurn: () => set((state) => {
    if (mpIntercept('loseAdventureTurn', [])) return state;
    const players = [...state.players];
    const player = { ...players[state.currentPlayerIndex], inAdventure: false };
    players[state.currentPlayerIndex] = player;
    let nextIndex = (state.currentPlayerIndex + 1) % players.length;
    let attempts = 0;
    while (players[nextIndex]?.isBankrupt && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    const newLogs = [...state.gameLogs.slice(-49), `${player.name} lost their turn in Lost in Adventure.`];
    return { players, currentPlayerIndex: nextIndex, phase: 'ROLL', gameLogs: newLogs };
  }),

  playCpuAction: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player.isCpu) return;

    if (state.phase === 'ROLL') {
      setTimeout(() => get().rollDice(), 1000);
    }
    else if (state.phase === 'ADVENTURE') {
      setTimeout(() => {
        const p = get().players[get().currentPlayerIndex];
        if (p.tp >= 50) {
          get().payAdventureFine();
        } else {
          get().loseAdventureTurn();
        }
      }, 1000);
    } 
    else if (state.phase === 'ACTION') {
      const spaceIndex = player.position;
      const space = BOARD_SPACES[spaceIndex];
      
      setTimeout(() => {
        // Champion's Arena with all 8 badges
        if (space.index === 20 && player.badges.length >= 8 && player.party.length > 0) {
          get().startChampionBattle();
          return;
        }

        if (space.type === 'Creature') {
          const ownership = state.boardOwnership[spaceIndex];
          if (!ownership) {
            const species = CREATURES[space.speciesId!];
            // CPU captures if it has enough TP. It will go to storage if party is full and not already owned.
            if (player.tp >= species.captureCost + 100) {
              get().captureTile(spaceIndex);
            } else {
              get().endTurn();
            }
          } else if (ownership.ownerId !== player.id) {
            // Pay rent or battle
            if (player.party.length > 0) {
              get().startBattle(spaceIndex, false);
            } else {
              get().payRent(spaceIndex);
            }
          } else {
            get().endTurn();
          }
        } else if (space.type === 'Gym') {
          if (player.party.length > 0) {
            get().startBattle(spaceIndex, true);
          } else {
            get().endTurn();
          }
        } else if (space.type === 'Event') {
          get().drawCard(space.eventDeck!);
        } else if (space.type === 'Tax') {
          get().payTax(space.taxAmount!);
        } else if (space.type === 'Wild' && state.wildEncounter) {
          const encSpecies = CREATURES[state.wildEncounter.speciesId];
          const hasSpecies = player.party.some(c => c.speciesId === encSpecies.id);
          // CPU tries to capture if it has enough TP, and either has space or is evolving
          if (player.tp >= encSpecies.captureCost + 200 && (player.party.length < 6 || hasSpecies)) {
            get().captureWildCreature();
          } else {
            get().endTurn();
          }
        } else {
          get().endTurn();
        }
      }, 1000);
    }
    else if (state.phase === 'BATTLE' && state.battleState) {
      setTimeout(() => {
        if (!state.battleState!.challengerCreatureId) {
          get().selectBattleCreature(player.party[0].id);
        } else if (state.battleState!.isActive) {
          get().executeBattleRound();
        } else {
          get().endBattle();
        }
      }, 1000);
    }
    else if (state.phase === 'BANKRUPTCY') {
      setTimeout(() => {
        const currentState = get();
        const p = currentState.players[currentState.currentPlayerIndex];

        // Try selling a power-up first (keeps creatures for combat)
        const boardOwnership = currentState.boardOwnership;
        const ownedPoweredTile = Object.keys(boardOwnership).find(key => {
          const o = boardOwnership[Number(key)];
          if (o.ownerId !== p.id || o.powerUpTier === 0) return false;
          const space = BOARD_SPACES[Number(key)];
          const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId && s.type === 'Creature');
          const maxTier = Math.max(...groupSpaces.map(s => boardOwnership[s.index]?.powerUpTier ?? 0));
          return o.powerUpTier >= maxTier;
        });

        if (ownedPoweredTile !== undefined) {
          get().sellPowerUp(Number(ownedPoweredTile));
          // Phase may still be BANKRUPTCY — schedule next cycle manually
          setTimeout(() => get().playCpuAction(), 1000);
          return;
        }

        // Try releasing the cheapest creature
        const allCreatures = [...p.party, ...p.storage];
        if (allCreatures.length > 0) {
          const cheapest = allCreatures.reduce((a, b) =>
            CREATURES[a.speciesId].captureCost <= CREATURES[b.speciesId].captureCost ? a : b
          );
          get().releaseCreature(cheapest.id);
          // Phase may still be BANKRUPTCY — schedule next cycle manually
          setTimeout(() => get().playCpuAction(), 1000);
          return;
        }

        // Nothing left to sell — declare bankruptcy
        get().declareBankruptcy();
      }, 1000);
    }
    else if (state.phase === 'END_TURN') {
      setTimeout(() => {
        const currentState = get();
        const p = currentState.players[currentState.currentPlayerIndex];
        const boardOwnership = currentState.boardOwnership;

        // If landed on a gym via a card, challenge it once
        const currentSpace = BOARD_SPACES[p.position];
        if (currentSpace.type === 'Gym' && currentState.pendingGymChallenge) {
          if (p.party.length > 0) {
            get().startBattle(p.position, true); // clears pendingGymChallenge
          } else {
            // No creatures — clear flag and fall through to end turn
            get().endTurn();
          }
          return;
        }

        // Try to buy a power-up on a complete set the CPU owns
        const powerUpTarget = BOARD_SPACES.find(space => {
          if (space.type !== 'Creature' || !space.groupId) return false;
          const ownership = boardOwnership[space.index];
          if (!ownership || ownership.ownerId !== p.id) return false;
          if (ownership.powerUpTier >= 5) return false;

          // Must own all tiles in group
          const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId && s.type === 'Creature');
          const ownsAll = groupSpaces.every(s => boardOwnership[s.index]?.ownerId === p.id);
          if (!ownsAll) return false;

          // Enforce uniform advancement: tile tier must equal min tier in group
          const minTier = Math.min(...groupSpaces.map(s => boardOwnership[s.index]?.powerUpTier ?? 0));
          if (ownership.powerUpTier > minTier) return false;

          // Must be able to afford it (flat per-tier cost)
          const cost = (GROUP_HOUSE_COST[space.groupId!] ?? 100) * groupSpaces.length;
          return p.tp >= cost + 200; // keep a 200 TP buffer
        });

        if (powerUpTarget) {
          get().powerUpTile(powerUpTarget.index);
          // Phase stays END_TURN so useEffect won't re-fire — schedule another cycle manually
          setTimeout(() => get().playCpuAction(), 1000);
        } else {
          get().endTurn();
        }
      }, 1000);
    }
  }
}));
