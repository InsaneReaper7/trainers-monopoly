/**
 * Pure reducer functions — identical logic to gameStore.ts but as plain
 * functions that take a GameState and return a Partial<GameState>.
 * GameRoom calls these and merges the result into the authoritative state.
 */

import { BOARD_SPACES, GROUP_HOUSE_COST, GROUP_RENT_PER_TIER } from './data/board';
import { CREATURES } from './data/creatures';
import { GYM_LEADERS, CHAMPION } from './data/gyms';
import { calculateDamage } from './utils/combat';
import type { ActiveCreature, GameState, GamePhase } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const applyExp = (c: ActiveCreature, expGain: number): ActiveCreature => {
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
    } else break;
  }
  return { ...c, exp: newExp, level: newLevel, stats: newStats, currentHp: newHp };
};

const log = (state: GameState, msg: string) =>
  [...state.gameLogs.slice(-49), msg];

// ─── Initial state factory ───────────────────────────────────────────────────

export function createInitialGameState(
  humanPlayers: { id: string; name: string; color: string; isCpu: boolean }[],
  settings: { startingTp: 500 | 1000 | 1500; taxPot: boolean } = { startingTp: 1500, taxPot: false }
): GameState {
  const players = humanPlayers.map(p => ({
    id: p.id,
    name: p.name,
    tp: settings.startingTp,
    position: 0,
    party: [],
    storage: [],
    badges: [],
    inJail: false,
    jailTurns: 0,
    color: p.color,
    isCpu: p.isCpu,
    isBankrupt: false,
    consecutiveDoubles: 0,
    inAdventure: false,
  }));
  return {
    players,
    currentPlayerIndex: 0,
    phase: 'TURN_ORDER_ROLL',
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
    gameLogs: ['Everyone rolls to determine who goes first!'],
    turnOrderRolls: {},
    turnOrderPending: players.map(p => p.id),
    settings,
    taxPotBalance: settings.taxPot
      ? Object.fromEntries(BOARD_SPACES.filter(s => s.type === 'Tax').map(s => [s.index, 0]))
      : {},
  };
}

// ─── Reducers ────────────────────────────────────────────────────────────────

export function reducerRollForTurnOrder(state: GameState): Partial<GameState> {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const player = state.players[state.currentPlayerIndex];

  const turnOrderRolls = { ...state.turnOrderRolls, [player.id]: [d1, d2] as [number, number] };
  const turnOrderPending = state.turnOrderPending.filter(id => id !== player.id);
  const newLogs = log(state, `🎲 ${player.name} rolled ${d1 + d2} (${d1}+${d2}) for turn order!`);

  if (turnOrderPending.length > 0) {
    const nextIdx = state.players.findIndex(p => p.id === turnOrderPending[0]);
    return { turnOrderRolls, turnOrderPending, dice: [d1, d2], currentPlayerIndex: nextIdx, gameLogs: newLogs };
  }

  // All rolled — sort players highest to lowest, random tiebreak
  const ranked = state.players
    .map(p => ({ player: p, total: (turnOrderRolls[p.id] ?? [0, 0] as [number, number]).reduce((a: number, b: number) => a + b, 0), tiebreak: Math.random() }))
    .sort((a, b) => b.total - a.total || b.tiebreak - a.tiebreak);

  const sortedPlayers = ranked.map(r => r.player);
  const orderLog = ranked.map((r, i) => `${i + 1}. ${r.player.name} (${r.total})`).join(' → ');
  const finalLogs = [...newLogs, `🏆 Turn order: ${orderLog}`];
  return { players: sortedPlayers, turnOrderRolls: {}, turnOrderPending: [], dice: [d1, d2], currentPlayerIndex: 0, phase: 'ROLL', gameLogs: finalLogs };
}

export function reducerRollDice(state: GameState): Partial<GameState> {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const totalRoll = d1 + d2;
  const isDoubles = d1 === d2;

  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };

  const newConsecutiveDoubles = isDoubles ? player.consecutiveDoubles + 1 : 0;
  player.consecutiveDoubles = newConsecutiveDoubles;

  if (isDoubles && newConsecutiveDoubles >= 3) {
    player.position = 30;
    player.consecutiveDoubles = 0;
    player.inAdventure = true;
    players[state.currentPlayerIndex] = player;
    return {
      dice: [d1, d2],
      players,
      phase: 'END_TURN',
      rolledDoubles: false,
      gameLogs: log(state, `🎲 ${player.name} rolled doubles 3 times in a row and got Lost in Adventure!`),
    };
  }

  let newPos = player.position + totalRoll;
  const passedHealingCenter = newPos >= 40;
  if (passedHealingCenter) newPos = newPos - 40;
  const landedOnHealingCenter = newPos === 0;

  if (landedOnHealingCenter) player.tp += 300;
  else if (passedHealingCenter) player.tp += 200;

  player.position = newPos;

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
    wildEncounter = { speciesId: wildSpecies[Math.floor(Math.random() * wildSpecies.length)] };
  }

  const suffix = landedOnHealingCenter
    ? ' — Landed on Healing Center! (+300 TP, healed, party +30 EXP)'
    : passedHealingCenter
    ? ' — Passed Go! (+200 TP, party +20 EXP)'
    : '';
  const doublesNote = isDoubles ? ' 🎲 DOUBLES — roll again!' : '';
  let baseLog = log(state, `${player.name} rolled ${totalRoll} (${d1}+${d2}) and moved to ${space.name}${suffix}${doublesNote}`);

  // Tax Pot: collect when landing on "Just Adventuring" (index 10)
  let taxPotBalance = state.taxPotBalance ?? {};
  if (state.settings?.taxPot && newPos === 10) {
    const pot = taxPotBalance[10] ?? 0;
    if (pot > 0) {
      player.tp += pot;
      players[state.currentPlayerIndex] = player;
      taxPotBalance = { ...taxPotBalance, [10]: 0 };
      baseLog = [...baseLog, `🏆 ${player.name} landed on Just Adventuring and collected ${pot} TP from the tax pot!`];
    }
  }

  return { dice: [d1, d2], players, phase: 'ACTION', wildEncounter, rolledDoubles: isDoubles, gameLogs: baseLog, taxPotBalance };
}

export function reducerEndTurn(state: GameState): Partial<GameState> {
  if (state.rolledDoubles) {
    return { phase: 'ROLL', battleState: null, rolledDoubles: false };
  }
  const players = [...state.players];
  players[state.currentPlayerIndex] = { ...players[state.currentPlayerIndex], consecutiveDoubles: 0 };
  let nextIndex = state.currentPlayerIndex + 1;
  if (nextIndex >= players.length) nextIndex = 0;
  let attempts = 0;
  while (players[nextIndex]?.isBankrupt && attempts < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }
  const nextPhase: GamePhase = players[nextIndex]?.inAdventure ? 'ADVENTURE' : 'ROLL';
  return { players, currentPlayerIndex: nextIndex, phase: nextPhase, battleState: null, rolledDoubles: false, pendingGymChallenge: false };
}

export function reducerPowerUpTile(state: GameState, spaceIndex: number): Partial<GameState> {
  const space = BOARD_SPACES[spaceIndex];
  if (!space.groupId || !space.speciesId) return {};
  const player = { ...state.players[state.currentPlayerIndex] };
  const boardOwnership = { ...state.boardOwnership };
  const ownership = boardOwnership[spaceIndex];
  if (!ownership || ownership.ownerId !== player.id) return {};
  const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId && s.type === 'Creature');
  const ownsAll = groupSpaces.every(s => boardOwnership[s.index]?.ownerId === player.id);
  if (!ownsAll) return {};
  const minTierInGroup = Math.min(...groupSpaces.map(s => boardOwnership[s.index]?.powerUpTier ?? 0));
  if (ownership.powerUpTier >= minTierInGroup + 1 || ownership.powerUpTier >= 5) return {};
  const cost = (GROUP_HOUSE_COST[space.groupId] ?? 100) * groupSpaces.length;
  if (player.tp < cost) return {};
  player.tp -= cost;
  const players = [...state.players];
  const species = CREATURES[space.speciesId];
  const boostCreature = (c: ActiveCreature) => ({
    ...c,
    stats: {
      hp:  c.stats.hp  + (Math.floor(species.baseForm.stats.hp  * 0.1) || 1),
      atk: c.stats.atk + (Math.floor(species.baseForm.stats.atk * 0.1) || 1),
      def: c.stats.def + (Math.floor(species.baseForm.stats.def * 0.1) || 1),
      spd: c.stats.spd + (Math.floor(species.baseForm.stats.spd * 0.1) || 1),
    },
  });
  const ci = player.party.findIndex(c => c.id === ownership.creatureId);
  const si = player.storage.findIndex(c => c.id === ownership.creatureId);
  if (ci !== -1) player.party[ci] = boostCreature(player.party[ci]);
  else if (si !== -1) player.storage[si] = boostCreature(player.storage[si]);
  boardOwnership[spaceIndex] = { ...ownership, powerUpTier: ownership.powerUpTier + 1 };
  players[state.currentPlayerIndex] = player;
  const newRent = species.baseRent + (GROUP_RENT_PER_TIER[space.groupId] ?? 50) * boardOwnership[spaceIndex].powerUpTier;
  return {
    players,
    boardOwnership,
    gameLogs: log(state, `⚡ ${player.name} powered up ${species.baseForm.name} to Tier ${boardOwnership[spaceIndex].powerUpTier}! New rent: ${newRent} TP`),
  };
}

export function reducerSellPowerUp(state: GameState, spaceIndex: number): Partial<GameState> {
  const space = BOARD_SPACES[spaceIndex];
  if (!space.speciesId || !space.groupId) return {};
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };
  const boardOwnership = { ...state.boardOwnership };
  const ownership = boardOwnership[spaceIndex];
  if (!ownership || ownership.ownerId !== player.id || ownership.powerUpTier === 0) return {};
  const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId && s.type === 'Creature');
  const maxTierInGroup = Math.max(...groupSpaces.map(s => boardOwnership[s.index]?.powerUpTier ?? 0));
  if (ownership.powerUpTier < maxTierInGroup) return {};
  const species = CREATURES[space.speciesId];
  const refund = Math.floor((GROUP_HOUSE_COST[space.groupId] ?? 100) * groupSpaces.length / 2);
  player.tp += refund;
  boardOwnership[spaceIndex] = { ...ownership, powerUpTier: ownership.powerUpTier - 1 };
  const deBoost = (c: ActiveCreature) => ({
    ...c,
    stats: {
      hp:  Math.max(1, c.stats.hp  - (Math.floor(species.baseForm.stats.hp  * 0.1) || 1)),
      atk: Math.max(1, c.stats.atk - (Math.floor(species.baseForm.stats.atk * 0.1) || 1)),
      def: Math.max(1, c.stats.def - (Math.floor(species.baseForm.stats.def * 0.1) || 1)),
      spd: Math.max(1, c.stats.spd - (Math.floor(species.baseForm.stats.spd * 0.1) || 1)),
    },
  });
  const ci = player.party.findIndex(c => c.id === ownership.creatureId);
  const si = player.storage.findIndex(c => c.id === ownership.creatureId);
  if (ci !== -1) player.party[ci] = deBoost(player.party[ci]);
  else if (si !== -1) player.storage[si] = deBoost(player.storage[si]);
  players[state.currentPlayerIndex] = player;
  const stillNegative = player.tp < 0;
  const newPhase: GamePhase = !stillNegative && state.phase === 'BANKRUPTCY' ? 'END_TURN' : state.phase;
  return { players, boardOwnership, phase: newPhase, gameLogs: log(state, `💸 ${player.name} sold a Power Up on ${species.baseForm.name} for ${refund} TP.`) };
}

export function reducerSwapStorageCreature(state: GameState, partyId: string, storageId: string): Partial<GameState> {
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };
  const pi = player.party.findIndex(c => c.id === partyId);
  const si = player.storage.findIndex(c => c.id === storageId);
  if (pi !== -1 && si !== -1) {
    const tmp = player.party[pi];
    player.party[pi] = player.storage[si];
    player.storage[si] = tmp;
    players[state.currentPlayerIndex] = player;
  }
  return { players };
}

export function reducerDeclareBankruptcy(state: GameState): Partial<GameState> {
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex], isBankrupt: true, party: [], storage: [] };
  const boardOwnership = { ...state.boardOwnership };
  Object.keys(boardOwnership).forEach(k => {
    if (boardOwnership[Number(k)].ownerId === player.id) delete boardOwnership[Number(k)];
  });
  players[state.currentPlayerIndex] = player;

  const activePlayers = players.filter(p => !p.isBankrupt);
  if (activePlayers.length === 1) {
    return {
      players,
      boardOwnership,
      phase: 'GAME_OVER' as GamePhase,
      winner: activePlayers[0].name,
      gameLogs: [...state.gameLogs.slice(-49), `💀 ${player.name} has gone bankrupt!`, `🏆 ${activePlayers[0].name} is the last trainer standing!`],
    } as Partial<GameState>;
  }

  let nextIndex = (state.currentPlayerIndex + 1) % players.length;
  let attempts = 0;
  while (players[nextIndex]?.isBankrupt && attempts < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }
  return {
    players,
    boardOwnership,
    phase: 'ROLL',
    currentPlayerIndex: nextIndex,
    gameLogs: log(state, `💀 ${player.name} has gone bankrupt and left the game!`),
  };
}

export function reducerCaptureTile(state: GameState, spaceIndex: number): Partial<GameState> {
  const space = BOARD_SPACES[spaceIndex];
  if (space.type !== 'Creature' || !space.speciesId) return {};
  const species = CREATURES[space.speciesId];
  const player = { ...state.players[state.currentPlayerIndex] };
  if (player.tp < species.captureCost) return {};
  if (player.tp - species.captureCost < 0) return {};

  const inParty = player.party.find(c => CREATURES[c.speciesId].groupId === space.groupId);
  const inStorage = player.storage.find(c => CREATURES[c.speciesId].groupId === space.groupId);
  const alreadyHasSpecies = !!(inParty || inStorage);

  player.tp -= species.captureCost;
  let newCreatureId = '';

  if (!alreadyHasSpecies) {
    const newCreature: ActiveCreature = {
      id: generateId(),
      speciesId: species.id,
      currentHp: species.baseForm.stats.hp,
      level: 1, exp: 0, currentStage: 0,
      stats: { ...species.baseForm.stats },
    };
    if (player.party.length < 6) player.party = [...player.party, newCreature];
    else player.storage = [...player.storage, newCreature];
    newCreatureId = newCreature.id;
  } else {
    newCreatureId = inParty ? inParty.id : inStorage!.id;
  }

  const boardOwnership = { ...state.boardOwnership, [spaceIndex]: { ownerId: player.id, powerUpTier: 0, creatureId: newCreatureId } };

  const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId);
  const ownedInGroup = groupSpaces.filter(s => boardOwnership[s.index]?.ownerId === player.id);
  let targetStage = 0;
  if (groupSpaces.length === 3) {
    if (ownedInGroup.length === 2) targetStage = 1;
    else if (ownedInGroup.length === 3) targetStage = 2;
  } else if (groupSpaces.length === 2 && ownedInGroup.length === 2) {
    targetStage = 1;
  }

  const evolutionLogs: string[] = [];
  if (targetStage > 0) {
    const evolveList = (list: ActiveCreature[]) => list.map(c => {
      if (CREATURES[c.speciesId].groupId !== space.groupId || c.currentStage >= targetStage) return c;
      const speciesData = CREATURES[c.speciesId];
      const newForm = targetStage === 1 ? speciesData.stage1Form : (speciesData.stage2Form ?? speciesData.stage1Form);
      if (!newForm) return c;
      const multiplier = targetStage === 1 && speciesData.stage2Form ? 0.1 : 0.2;
      const boostedStats = {
        hp:  newForm.stats.hp  + Math.max(1, Math.floor(newForm.stats.hp  * multiplier)),
        atk: newForm.stats.atk + Math.max(1, Math.floor(newForm.stats.atk * multiplier)),
        def: newForm.stats.def + Math.max(1, Math.floor(newForm.stats.def * multiplier)),
        spd: newForm.stats.spd + Math.max(1, Math.floor(newForm.stats.spd * multiplier)),
      };
      evolutionLogs.push(`🌟 ${player.name}'s ${speciesData.baseForm.name} evolved into ${newForm.name}! (Stage ${targetStage})`);
      return { ...c, currentStage: targetStage as 1 | 2, stats: boostedStats, currentHp: boostedStats.hp };
    });
    player.party = evolveList(player.party);
    player.storage = evolveList(player.storage);
  }

  const players = [...state.players];
  players[state.currentPlayerIndex] = player;
  const newLogs = [
    ...state.gameLogs.slice(-(49 - evolutionLogs.length)),
    `${player.name} captured ${species.baseForm.name}! (-${species.captureCost} TP)`,
    ...evolutionLogs,
  ];
  return { players, boardOwnership, phase: 'END_TURN', gameLogs: newLogs };
}

export function reducerCaptureWildCreature(state: GameState): Partial<GameState> {
  if (!state.wildEncounter) return {};
  const species = CREATURES[state.wildEncounter.speciesId];
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };
  if (player.tp < species.captureCost) return {};

  const partyIndex = player.party.findIndex(c => c.speciesId === species.id);
  const storageIndex = player.storage.findIndex(c => c.speciesId === species.id);
  const existingIndex = partyIndex !== -1 ? partyIndex : storageIndex;
  const isStored = partyIndex === -1 && storageIndex !== -1;
  player.tp -= species.captureCost;

  if (existingIndex !== -1) {
    const c = isStored ? player.storage[existingIndex] : player.party[existingIndex];
    let newStage = c.currentStage;
    let newForm = null;
    if (c.currentStage === 0 && species.stage1Form) { newStage = 1; newForm = species.stage1Form; }
    else if (c.currentStage === 1 && species.stage2Form) { newStage = 2; newForm = species.stage2Form; }
    if (newForm) {
      const multiplier = newStage === 1 && species.stage2Form ? 0.1 : 0.2;
      const boostedStats = {
        hp:  newForm.stats.hp  + Math.max(1, Math.floor(newForm.stats.hp  * multiplier)),
        atk: newForm.stats.atk + Math.max(1, Math.floor(newForm.stats.atk * multiplier)),
        def: newForm.stats.def + Math.max(1, Math.floor(newForm.stats.def * multiplier)),
        spd: newForm.stats.spd + Math.max(1, Math.floor(newForm.stats.spd * multiplier)),
      };
      const updated = { ...c, currentStage: newStage as 1 | 2, stats: boostedStats, currentHp: boostedStats.hp };
      if (isStored) player.storage[existingIndex] = updated;
      else player.party[existingIndex] = updated;
    }
  } else {
    const newCreature: ActiveCreature = {
      id: generateId(), speciesId: species.id,
      currentHp: species.baseForm.stats.hp, level: 1, exp: 0, currentStage: 0,
      stats: { ...species.baseForm.stats },
    };
    if (player.party.length < 6) player.party = [...player.party, newCreature];
    else player.storage = [...player.storage, newCreature];
  }
  players[state.currentPlayerIndex] = player;
  return { players, wildEncounter: null, phase: 'END_TURN' };
}

export function reducerReleaseCreature(state: GameState, creatureId: string): Partial<GameState> {
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };
  let creature = player.party.find(c => c.id === creatureId);
  const inParty = !!creature;
  if (!creature) creature = player.storage.find(c => c.id === creatureId);
  if (!creature) return {};
  const species = CREATURES[creature.speciesId];
  if (inParty) player.party = player.party.filter(c => c.id !== creatureId);
  else player.storage = player.storage.filter(c => c.id !== creatureId);
  player.tp += Math.floor(species.captureCost / 2);
  const boardOwnership = { ...state.boardOwnership };
  Object.keys(boardOwnership).forEach(k => {
    if (boardOwnership[Number(k)].creatureId === creatureId) delete boardOwnership[Number(k)];
  });
  players[state.currentPlayerIndex] = player;
  const stillNegative = player.tp < 0;
  const newPhase: GamePhase = !stillNegative && state.phase === 'BANKRUPTCY' ? 'END_TURN' : state.phase;
  return { players, boardOwnership, phase: newPhase, gameLogs: log(state, `${player.name} released ${species.baseForm.name} for ${Math.floor(species.captureCost / 2)} TP.`) };
}

export function reducerPayRent(state: GameState, spaceIndex: number): Partial<GameState> {
  const ownership = state.boardOwnership[spaceIndex];
  if (!ownership) return {};
  const space = BOARD_SPACES[spaceIndex];
  const species = CREATURES[space.speciesId!];
  const players = [...state.players];
  const fromPlayer = { ...players[state.currentPlayerIndex] };
  const toPlayerIndex = players.findIndex(p => p.id === ownership.ownerId);
  if (toPlayerIndex === -1 || fromPlayer.id === ownership.ownerId) return {};
  const rentAmount = species.baseRent + (GROUP_RENT_PER_TIER[space.groupId!] ?? 50) * ownership.powerUpTier;
  fromPlayer.tp -= rentAmount;
  players[toPlayerIndex] = { ...players[toPlayerIndex], tp: players[toPlayerIndex].tp + rentAmount };
  players[state.currentPlayerIndex] = fromPlayer;
  const newLogs = log(state, `${fromPlayer.name} paid ${rentAmount} TP rent to ${players[toPlayerIndex].name}.`);
  if (fromPlayer.tp < 0) return { players, gameLogs: newLogs, phase: 'BANKRUPTCY' };
  return { players, phase: 'END_TURN', gameLogs: newLogs };
}

export function reducerStartChampionBattle(state: GameState): Partial<GameState> {
  const player = state.players[state.currentPlayerIndex];
  if (player.badges.length < 8) return {};
  if (BOARD_SPACES[player.position].index !== 20) return {};
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
      logs: [`${player.name} challenges ${CHAMPION.name}! Face ${champCreature.name}!`],
    },
  };
}

export function reducerStartBattle(state: GameState, spaceIndex: number, isGym: boolean): Partial<GameState> {
  const player = state.players[state.currentPlayerIndex];
  if (isGym) {
    const space = BOARD_SPACES[spaceIndex];
    const gymData = GYM_LEADERS[space.gymTier!];
    return {
      phase: 'BATTLE',
      pendingGymChallenge: false,
      battleState: {
        isActive: true, type: 'GYM',
        challengerId: player.id, defenderId: 'GYM',
        defenderCreatureTemp: gymData.creature,
        round: 1, logs: [`You challenged ${gymData.name}!`],
      },
    };
  }
  const ownership = state.boardOwnership[spaceIndex];
  return {
    phase: 'BATTLE',
    battleState: {
      isActive: true, type: 'TILE',
      challengerId: player.id,
      defenderId: ownership.ownerId,
      defenderCreatureId: ownership.creatureId,
      round: 1, logs: [`Tile battle initiated!`],
    },
  };
}

export function reducerSelectBattleCreature(state: GameState, creatureId: string): Partial<GameState> {
  if (!state.battleState) return {};
  return {
    battleState: { ...state.battleState, challengerCreatureId: creatureId, logs: [...state.battleState.logs, 'Sent out creature!'] },
  };
}

export function reducerExecuteBattleRound(state: GameState): Partial<GameState> {
  if (!state.battleState || !state.battleState.challengerCreatureId) return {};
  const players = [...state.players];
  const challenger = players.find(p => p.id === state.battleState!.challengerId);
  const chalCreature = challenger?.party.find(c => c.id === state.battleState!.challengerCreatureId);
  if (!challenger || !chalCreature) return {};

  let defStats: typeof chalCreature.stats;
  let defType: string;
  let defName: string;

  if (state.battleState.type === 'GYM' || state.battleState.type === 'CHAMPION') {
    const form = state.battleState.defenderCreatureTemp!;
    defStats = form.stats; defType = form.type; defName = form.name;
  } else {
    const defender = players.find(p => p.id === state.battleState!.defenderId);
    const defCreatureObj = defender?.party.find(c => c.id === state.battleState!.defenderCreatureId)
      ?? defender?.storage.find(c => c.id === state.battleState!.defenderCreatureId);
    if (!defCreatureObj) {
      // Forfeit
      const defIdx = players.findIndex(p => p.id === state.battleState!.defenderId);
      const space = BOARD_SPACES[challenger.position];
      const tileSpecies = CREATURES[space.speciesId!];
      if (tileSpecies) {
        const fo = state.boardOwnership[challenger.position];
        const forfeitSpace = BOARD_SPACES[challenger.position];
        const fullRent = tileSpecies.baseRent + (GROUP_RENT_PER_TIER[forfeitSpace.groupId ?? ''] ?? 50) * (fo?.powerUpTier ?? 0);
        const rentAmount = Math.floor(fullRent / 2);
        players[players.findIndex(p => p.id === challenger.id)].tp -= rentAmount;
        if (defIdx !== -1) players[defIdx].tp += rentAmount;
      }
      return {
        players,
        gameLogs: log(state, `${challenger.name} won by forfeit!`),
        battleState: { ...state.battleState, isActive: false, logs: [...state.battleState.logs, 'Defender has no creature — challenger wins by forfeit!'] },
      };
    }
    const defSpecies = CREATURES[defCreatureObj.speciesId];
    const form = defCreatureObj.currentStage === 0 ? defSpecies.baseForm
      : defCreatureObj.currentStage === 1 ? (defSpecies.stage1Form ?? defSpecies.baseForm)
      : (defSpecies.stage2Form ?? defSpecies.stage1Form ?? defSpecies.baseForm);
    defStats = defCreatureObj.stats; defType = form!.type; defName = form!.name;
  }

  const chalSpecies = CREATURES[chalCreature.speciesId];
  const chalForm = chalCreature.currentStage === 0 ? chalSpecies.baseForm
    : chalCreature.currentStage === 1 ? (chalSpecies.stage1Form ?? chalSpecies.baseForm)
    : (chalSpecies.stage2Form ?? chalSpecies.stage1Form ?? chalSpecies.baseForm);
  const chalType = chalForm!.type;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const damageToDef = calculateDamage(chalCreature.stats, chalType as any, defStats, defType as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const damageToChal = calculateDamage(defStats, defType as any, chalCreature.stats, chalType as any);
  const chalWins = damageToDef >= damageToChal;

  const logs = [...state.battleState.logs, `Round ${state.battleState.round}:`];
  logs.push(`${chalForm!.name} deals ${damageToDef} dmg!`);
  logs.push(`${defName} deals ${damageToChal} dmg!`);
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
  players[chalIndex] = { ...players[chalIndex], party: [...players[chalIndex].party] };
  players[chalIndex].party[chalCreatureIndex] = applyExp(players[chalIndex].party[chalCreatureIndex], chalExpGain);
  logs.push(`${chalForm!.name} gained ${chalExpGain} EXP!`);
  if (players[chalIndex].party[chalCreatureIndex].level > oldLevel) {
    logs.push(`${chalForm!.name} leveled up to Level ${players[chalIndex].party[chalCreatureIndex].level}!`);
  }

  if (state.battleState.type === 'TILE') {
    const space = BOARD_SPACES[challenger.position];
    const tileSp = CREATURES[space.speciesId!];
    const tileOwnership = state.boardOwnership[challenger.position];
    const fullRent = tileSp.baseRent + (GROUP_RENT_PER_TIER[space.groupId!] ?? 50) * (tileOwnership?.powerUpTier ?? 0);
    const rentAmount = chalWins ? Math.floor(fullRent / 2) : Math.floor(fullRent * 1.3);
    logs.push(chalWins ? `Challenger pays HALF rent (${rentAmount} TP of ${fullRent} TP)!` : `Challenger pays 30% MORE rent (${rentAmount} TP of ${fullRent} TP)!`);
    const defIndex = players.findIndex(p => p.id === state.battleState!.defenderId);
    players[chalIndex].tp -= rentAmount;
    players[defIndex] = { ...players[defIndex], tp: players[defIndex].tp + rentAmount };
    const defCreatureObj = players[defIndex].party.find(c => c.id === state.battleState!.defenderCreatureId);
    if (defCreatureObj) {
      const dci = players[defIndex].party.findIndex(c => c.id === defCreatureObj.id);
      const defExpGain = chalWins ? 20 : 50;
      const oldDefLevel = players[defIndex].party[dci].level;
      players[defIndex] = { ...players[defIndex], party: [...players[defIndex].party] };
      players[defIndex].party[dci] = applyExp(players[defIndex].party[dci], defExpGain);
      logs.push(`${defName} gained ${defExpGain} EXP!`);
      if (players[defIndex].party[dci].level > oldDefLevel) logs.push(`${defName} leveled up!`);
    }
  } else if (state.battleState.type === 'GYM') {
    if (chalWins) {
      const space = BOARD_SPACES[challenger.position];
      const gymData = GYM_LEADERS[space.gymTier!];
      if (gymData && !players[chalIndex].badges.includes(gymData.badgeReward)) {
        players[chalIndex] = { ...players[chalIndex], badges: [...players[chalIndex].badges, gymData.badgeReward], tp: players[chalIndex].tp + 500 };
        logs.push('Earned a Gym Badge and 500 TP!');
      } else {
        players[chalIndex] = { ...players[chalIndex], tp: players[chalIndex].tp + 50 };
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
    ...logs.filter(l => l.includes('leveled up') || l.includes('EXP') || l.includes('Badge') || l.includes('rent')),
  ];
  return {
    players,
    gameLogs: newGameLogs,
    winner: championWon ? players[chalIndex].name : (state as GameState & { winner?: string }).winner ?? null,
    battleState: { ...state.battleState, isActive: false, logs },
  };
}

export function reducerEndBattle(state: GameState): Partial<GameState> {
  const player = state.players[state.currentPlayerIndex];
  const newPhase: GamePhase = player.tp < 0 ? 'BANKRUPTCY' : 'END_TURN';
  return { phase: newPhase, battleState: null };
}

export function reducerDrawCard(state: GameState, deckType: string): Partial<GameState> {
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };
  const gymPositions = [5, 9, 15, 19, 25, 29, 35, 39];
  const nearestGym = gymPositions.find(g => g > player.position) ?? gymPositions[0];

  const healAndExpParty = (p: typeof player, exp: number) => ({
    ...p, position: 0, tp: p.tp + 300,
    party: p.party.map(c => ({ ...applyExp(c, exp), currentHp: applyExp(c, exp).stats.hp })),
  });

  const moveToGym = (dest: number) => {
    if (dest <= player.position) {
      player.tp += 200;
      if (player.party.length > 0) player.party = player.party.map(c => applyExp(c, 20));
    }
    player.position = dest;
  };

  let msg = '';
  let movedToGym = false;
  const rand = Math.random();
  const originalPosition = player.position;

  const creatureSpaces = BOARD_SPACES.filter(s => s.type === 'Creature');

  if (deckType === 'Scout') {
    if (rand < 1 / 11) { msg = 'Found a hidden item! Gain 100 TP.'; player.tp += 100; }
    else if (rand < 2 / 11) { msg = 'Scouted a shortcut. Advance 3 spaces.'; player.position = (player.position + 3) % 40; }
    else if (rand < 3 / 11) { msg = 'Ambushed by wild creatures! Lose 50 TP.'; player.tp -= 50; }
    else if (rand < 4 / 11) {
      msg = 'Found a trail back to the Healing Center! +300 TP, party healed & gained 30 EXP.';
      const h = healAndExpParty(player, 30); player.position = h.position; player.tp = h.tp; player.party = h.party;
    } else if (rand < 5 / 11) {
      msg = 'Spotted a gym nearby! Challenge the nearest gym.'; moveToGym(nearestGym); movedToGym = true;
    } else if (rand < 6 / 11) {
      msg = 'Received orders to report to Gym 1! Challenge the gym leader.'; moveToGym(5); movedToGym = true;
    } else if (rand < 7 / 11) {
      msg = 'Lost in the wilderness! Go directly to Lost in Adventure — do not collect TP.';
      player.position = 30; player.inAdventure = true;
    } else if (rand < 8 / 11) {
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
      msg = 'Found a little TP on the trail! +50 TP.'; player.tp += 50;
    } else if (rand < 10 / 11) {
      const dest = Math.floor(Math.random() * 40);
      const passedGo = dest < player.position;
      if (passedGo) player.tp += 200;
      player.position = dest;
      msg = `Your scout map leads you to space ${dest}!${passedGo ? ' Passed Go — collect 200 TP.' : ''}`;
    } else {
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
    if (rand < 1 / 10) { msg = 'Read up on battling techniques. Gain 200 TP.'; player.tp += 200; }
    else if (rand < 2 / 10) { msg = 'Bought new supplies. Pay 100 TP.'; player.tp -= 100; }
    else if (rand < 3 / 10) {
      msg = 'Your journal led you back to the Healing Center! +300 TP, party healed & gained 30 EXP.';
      const h = healAndExpParty(player, 30); player.position = h.position; player.tp = h.tp; player.party = h.party;
    } else if (rand < 4 / 10) {
      msg = 'Your notes pointed to a nearby gym! Challenge the gym leader.'; moveToGym(nearestGym); movedToGym = true;
    } else if (rand < 5 / 10) {
      msg = 'Your journal says to start from the top — head to Gym 1! Challenge the gym leader.'; moveToGym(5); movedToGym = true;
    } else if (rand < 6 / 10) {
      msg = 'Got lost reading old notes! Go directly to Lost in Adventure — do not collect TP.';
      player.position = 30; player.inAdventure = true;
    } else if (rand < 7 / 10) {
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
      msg = 'Won a regional contest! +300 TP.'; player.tp += 300;
    } else if (rand < 9 / 10) {
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
  const newLogs = log(state, `🃏 ${player.name} drew a card: ${msg}`);
  if (player.tp < 0) return { players, cardMessage: msg, phase: 'BANKRUPTCY', gameLogs: newLogs };

  const landedSpace = BOARD_SPACES[player.position];
  let landingPhase: GamePhase = 'END_TURN';
  let landingWildEncounter: { speciesId: string } | null = null;

  const playerMoved = player.position !== originalPosition;
  if (!movedToGym && !player.inAdventure && playerMoved) {
    if (landedSpace.type === 'Creature' || landedSpace.type === 'Event' || landedSpace.type === 'Tax') {
      landingPhase = 'ACTION';
    } else if (landedSpace.type === 'Wild') {
      landingPhase = 'ACTION';
      const wildSpecies = ['aerozor', 'toxeon', 'steelodon', 'mythicor'];
      landingWildEncounter = { speciesId: wildSpecies[Math.floor(Math.random() * wildSpecies.length)] };
    } else if (landedSpace.type === 'Gym') {
      landingPhase = 'ACTION';
    }
  }

  return { players, cardMessage: msg, phase: landingPhase, pendingGymChallenge: movedToGym, wildEncounter: landingWildEncounter, gameLogs: newLogs };
}

export function reducerPayTax(state: GameState, amount: number): Partial<GameState> {
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };
  const spaceIndex = player.position;

  const TAX_POT_SPACE = 10; // "Just Adventuring" corner
  if (state.settings?.taxPot) {
    const currentPot = state.taxPotBalance[TAX_POT_SPACE] ?? 0;
    player.tp -= amount;
    players[state.currentPlayerIndex] = player;
    const newPot = currentPot + amount;
    const newLogs = log(state, `💰 ${player.name} paid ${amount} TP tax — Just Adventuring pot grows to ${newPot} TP!`);
    if (player.tp < 0) return { players, taxPotBalance: { ...state.taxPotBalance, [TAX_POT_SPACE]: newPot }, phase: 'BANKRUPTCY', gameLogs: newLogs };
    return { players, taxPotBalance: { ...state.taxPotBalance, [TAX_POT_SPACE]: newPot }, phase: 'END_TURN', gameLogs: newLogs };
  }

  player.tp -= amount;
  players[state.currentPlayerIndex] = player;
  const newLogs = log(state, `💰 ${player.name} paid ${amount} TP in taxes.`);
  if (player.tp < 0) return { players, phase: 'BANKRUPTCY', gameLogs: newLogs };
  return { players, phase: 'END_TURN', gameLogs: newLogs };
}

export function reducerPayAdventureFine(state: GameState): Partial<GameState> {
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };
  player.tp -= 50;
  player.inAdventure = false;
  players[state.currentPlayerIndex] = player;
  const newLogs = log(state, `${player.name} paid 50 TP to escape Lost in Adventure!`);
  if (player.tp < 0) return { players, phase: 'BANKRUPTCY', gameLogs: newLogs };
  return { players, phase: 'ROLL', gameLogs: newLogs };
}

export function reducerLoseAdventureTurn(state: GameState): Partial<GameState> {
  const players = [...state.players];
  players[state.currentPlayerIndex] = { ...players[state.currentPlayerIndex], inAdventure: false };
  let nextIndex = (state.currentPlayerIndex + 1) % players.length;
  let attempts = 0;
  while (players[nextIndex]?.isBankrupt && attempts < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }
  return {
    players,
    currentPlayerIndex: nextIndex,
    phase: 'ROLL',
    gameLogs: log(state, `${players[state.currentPlayerIndex].name} lost their turn in Lost in Adventure.`),
  };
}

export function reducerAcceptTrade(state: GameState): Partial<GameState> {
  if (!state.tradeState) return {};
  const trade = state.tradeState;
  const players = [...state.players];
  const initIdx = players.findIndex(p => p.id === trade.initiatorId);
  const targetIdx = players.findIndex(p => p.id === trade.targetId);
  if (initIdx === -1 || targetIdx === -1) return {};

  const initPlayer = { ...players[initIdx], party: [...players[initIdx].party], storage: [...players[initIdx].storage] };
  const targetPlayer = { ...players[targetIdx], party: [...players[targetIdx].party], storage: [...players[targetIdx].storage] };

  // ── Validation ──────────────────────────────────────────────────────────────
  const initTpAfter = initPlayer.tp - trade.offeredTp + trade.requestedTp;
  const targetTpAfter = targetPlayer.tp - trade.requestedTp + trade.offeredTp;
  if (initTpAfter < 0 || targetTpAfter < 0) return {};

  const initTotal   = initPlayer.party.length   + initPlayer.storage.length;
  const targetTotal = targetPlayer.party.length  + targetPlayer.storage.length;
  if (trade.offeredCreatureIds.length >= initTotal   && trade.requestedCreatureIds.length === 0) return {};
  if (trade.requestedCreatureIds.length >= targetTotal && trade.offeredCreatureIds.length === 0)   return {};
  // ─────────────────────────────────────────────────────────────────────────────

  initPlayer.tp   = initTpAfter;
  targetPlayer.tp = targetTpAfter;

  const offeredCreatures = [...initPlayer.party, ...initPlayer.storage].filter(c => trade.offeredCreatureIds.includes(c.id));
  const requestedCreatures = [...targetPlayer.party, ...targetPlayer.storage].filter(c => trade.requestedCreatureIds.includes(c.id));

  initPlayer.party = initPlayer.party.filter(c => !trade.offeredCreatureIds.includes(c.id));
  initPlayer.storage = initPlayer.storage.filter(c => !trade.offeredCreatureIds.includes(c.id));
  targetPlayer.party = targetPlayer.party.filter(c => !trade.requestedCreatureIds.includes(c.id));
  targetPlayer.storage = targetPlayer.storage.filter(c => !trade.requestedCreatureIds.includes(c.id));

  const idRemap: Record<string, string> = {};

  const mergeInto = (receiver: typeof initPlayer, incoming: ActiveCreature): string => {
    const incomingGroup = CREATURES[incoming.speciesId].groupId;
    const existingInParty = receiver.party.find(c => CREATURES[c.speciesId].groupId === incomingGroup);
    const existingInStorage = existingInParty ? null : receiver.storage.find(c => CREATURES[c.speciesId].groupId === incomingGroup);
    const existing = existingInParty ?? existingInStorage;
    if (existing) {
      const incomingWins = incoming.level > existing.level || (incoming.level === existing.level && incoming.exp > existing.exp);
      if (incomingWins) {
        const merged = { ...incoming, id: existing.id };
        if (existingInParty) { const i = receiver.party.findIndex(c => c.id === existing.id); receiver.party = [...receiver.party]; receiver.party[i] = merged; }
        else { const i = receiver.storage.findIndex(c => c.id === existing.id); receiver.storage = [...receiver.storage]; receiver.storage[i] = merged; }
      }
      return existing.id;
    }
    if (receiver.party.length < 6) receiver.party = [...receiver.party, incoming];
    else receiver.storage = [...receiver.storage, incoming];
    return incoming.id;
  };

  for (const c of offeredCreatures) idRemap[c.id] = mergeInto(targetPlayer, c);
  for (const c of requestedCreatures) idRemap[c.id] = mergeInto(initPlayer, c);

  const boardOwnership = { ...state.boardOwnership };
  Object.keys(boardOwnership).forEach(key => {
    const idx = Number(key);
    const o = boardOwnership[idx];
    if (trade.offeredCreatureIds.includes(o.creatureId)) boardOwnership[idx] = { ...o, ownerId: trade.targetId, creatureId: idRemap[o.creatureId] ?? o.creatureId };
    else if (trade.requestedCreatureIds.includes(o.creatureId)) boardOwnership[idx] = { ...o, ownerId: trade.initiatorId, creatureId: idRemap[o.creatureId] ?? o.creatureId };
  });

  const triggerEvolutions = (p: typeof initPlayer, playerId: string) => {
    const groupOwned: Record<string, number> = {};
    const groupTotal: Record<string, number> = {};
    BOARD_SPACES.forEach(space => {
      if (space.type !== 'Creature' || !space.groupId) return;
      groupTotal[space.groupId] = (groupTotal[space.groupId] ?? 0) + 1;
      if (boardOwnership[space.index]?.ownerId === playerId) groupOwned[space.groupId] = (groupOwned[space.groupId] ?? 0) + 1;
    });
    Object.keys(groupTotal).forEach(groupId => {
      const owned = groupOwned[groupId] ?? 0;
      const total = groupTotal[groupId];
      let targetStage = 0;
      if (total === 3) { if (owned === 2) targetStage = 1; else if (owned === 3) targetStage = 2; }
      else if (total === 2 && owned === 2) targetStage = 1;
      if (targetStage === 0) return;
      const evolveList = (list: ActiveCreature[]) => list.map(c => {
        const sd = CREATURES[c.speciesId];
        if (sd.groupId !== groupId || c.currentStage >= targetStage) return c;
        const newForm = targetStage === 1 ? sd.stage1Form : (sd.stage2Form ?? sd.stage1Form);
        if (!newForm) return c;
        const mult = targetStage === 1 && sd.stage2Form ? 0.1 : 0.2;
        const bs = {
          hp:  newForm.stats.hp  + Math.max(1, Math.floor(newForm.stats.hp  * mult)),
          atk: newForm.stats.atk + Math.max(1, Math.floor(newForm.stats.atk * mult)),
          def: newForm.stats.def + Math.max(1, Math.floor(newForm.stats.def * mult)),
          spd: newForm.stats.spd + Math.max(1, Math.floor(newForm.stats.spd * mult)),
        };
        return { ...c, currentStage: targetStage as 1 | 2, stats: bs, currentHp: bs.hp };
      });
      p.party = evolveList(p.party);
      p.storage = evolveList(p.storage);
    });
  };

  triggerEvolutions(initPlayer, trade.initiatorId);
  triggerEvolutions(targetPlayer, trade.targetId);

  if (initPlayer.party.length > 6 || targetPlayer.party.length > 6) return {};

  players[initIdx] = initPlayer;
  players[targetIdx] = targetPlayer;
  return { players, boardOwnership, tradeState: null, cardMessage: 'Trade completed successfully!' };
}

export function reducerInitiateTrade(state: GameState, targetId: string): Partial<GameState> {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return {};
  return {
    tradeState: {
      status: 'DRAFTING',
      initiatorId: player.id,
      targetId,
      responderId: targetId,
      offeredTp: 0,
      offeredCreatureIds: [],
      requestedTp: 0,
      requestedCreatureIds: [],
    },
  };
}

export function reducerUpdateTradeOffer(
  state: GameState,
  updates: Partial<{ offeredTp: number; offeredCreatureIds: string[]; requestedTp: number; requestedCreatureIds: string[] }>
): Partial<GameState> {
  if (!state.tradeState) return {};
  return { tradeState: { ...state.tradeState, ...updates } };
}

export function reducerProposeTrade(state: GameState): Partial<GameState> {
  if (!state.tradeState) return {};
  return { tradeState: { ...state.tradeState, status: 'PROPOSED', responderId: state.tradeState.targetId } };
}

export function reducerNegotiateTrade(state: GameState): Partial<GameState> {
  if (!state.tradeState) return {};
  const trade = state.tradeState;
  // Flip the responder — the one who just declined to accept now edits their counter
  const newResponderId = trade.responderId === trade.targetId ? trade.initiatorId : trade.targetId;
  return { tradeState: { ...trade, status: 'COUNTER', responderId: newResponderId } };
}

export function reducerDeclineTrade(state: GameState): Partial<GameState> {
  return { tradeState: null };
}

export function reducerCancelTrade(state: GameState): Partial<GameState> {
  return { tradeState: null };
}

export function reducerClearWildEncounter(state: GameState): Partial<GameState> {
  return { wildEncounter: null, phase: 'END_TURN', gameLogs: log(state, `${state.players[state.currentPlayerIndex]?.name ?? 'Player'} fled from the wild encounter.`) };
}

export function reducerSelectTile(state: GameState, index: number | null): Partial<GameState> {
  return { selectedTileIndex: index };
}

export function reducerToggleStorageModal(state: GameState): Partial<GameState> {
  return { storageModalOpen: !state.storageModalOpen };
}

export function reducerClearCardMessage(state: GameState): Partial<GameState> {
  return { cardMessage: null };
}
