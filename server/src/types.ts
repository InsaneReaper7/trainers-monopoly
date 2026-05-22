// ─── Element / Creature types (mirrors src/types.ts) ───────────────────────

export type ElementType =
  | 'Fire' | 'Water' | 'Grass' | 'Electric' | 'Psychic' | 'Dark'
  | 'Dragon' | 'Steel' | 'Normal' | 'Ground' | 'Ice' | 'Bug'
  | 'Ghost' | 'Fairy' | 'Fighting' | 'Poison' | 'Rock' | 'Flying';

export interface CreatureStats { hp: number; atk: number; def: number; spd: number; }

export interface CreatureForm {
  name: string;
  stage: 0 | 1 | 2;
  stats: CreatureStats;
  type: ElementType;
  secondaryType?: ElementType;
}

export interface CreatureSpecies {
  id: string;
  baseForm: CreatureForm;
  stage1Form?: CreatureForm;
  stage2Form?: CreatureForm;
  tier: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  captureCost: number;
  baseRent: number;
  groupId: string;
}

export interface ActiveCreature {
  id: string;
  speciesId: string;
  currentHp: number;
  level: number;
  exp: number;
  currentStage: 0 | 1 | 2;
  stats: CreatureStats;
}

export type SpaceType = 'Start' | 'Creature' | 'Gym' | 'Event' | 'Tax' | 'Corner' | 'Wild';

export interface BoardSpace {
  index: number;
  name: string;
  type: SpaceType;
  speciesId?: string;
  groupId?: string;
  gymTier?: number;
  gymElement?: ElementType;
  eventDeck?: 'Scout' | 'Journal';
  taxAmount?: number;
}

// ─── Game state types (mirrors src/store/gameStore.ts) ──────────────────────

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
  defenderId?: string;
  defenderCreatureId?: string;
  defenderCreatureTemp?: CreatureForm;
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
  responderId: string;
}

export type GamePhase =
  | 'MENU' | 'SETUP' | 'TURN_ORDER_ROLL' | 'ROLL' | 'ACTION' | 'BATTLE'
  | 'END_TURN' | 'BANKRUPTCY' | 'ADVENTURE' | 'GAME_OVER';

export interface GameState {
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
  cardMessage: string | null;
  gameLogs: string[];
  winner?: string | null;
  turnOrderRolls: Record<string, [number, number]>;
  turnOrderPending: string[];
  board: BoardSpace[];
  settings: { startingTp: 500 | 1000 | 1500; taxPot: boolean; randomCreatureTiles: boolean; expandedCreatureTypes: boolean };
  taxPotBalance: Record<number, number>;
}

// ─── Multiplayer / Room types ────────────────────────────────────────────────

export type LobbyPhase = 'LOBBY' | 'PLAYING' | 'FINISHED';

export interface PlayerSlot {
  slotIndex: number;
  socketId: string | null;
  playerId: string;
  displayName: string;
  color: string;
  connected: boolean;
  reconnectToken: string;
}

export interface LobbyPlayer {
  slotIndex: number;
  playerId: string;
  displayName: string;
  color: string;
  connected: boolean;
  isHost: boolean;
}

// ─── Socket event payloads ───────────────────────────────────────────────────

export type ActionName =
  | 'rollDice' | 'endTurn' | 'captureTile' | 'payRent'
  | 'startBattle' | 'selectBattleCreature' | 'executeBattleRound' | 'endBattle'
  | 'releaseCreature' | 'drawCard' | 'payTax' | 'captureWildCreature' | 'clearWildEncounter'
  | 'initiateTrade' | 'updateTradeOffer' | 'proposeTrade' | 'negotiateTrade' | 'acceptTrade'
  | 'declineTrade' | 'cancelTrade'
  | 'payAdventureFine' | 'loseAdventureTurn'
  | 'sellPowerUp' | 'declareBankruptcy' | 'powerUpTile'
  | 'swapStorageCreature' | 'selectTile' | 'toggleStorageModal' | 'clearCardMessage'
  | 'startChampionBattle' | 'rollForTurnOrder';

export interface ServerToClientEvents {
  'room:created': (data: { roomCode: string; slotIndex: number; playerId: string; reconnectToken: string }) => void;
  'room:joined': (data: { roomCode: string; slotIndex: number; playerId: string; reconnectToken: string; lobbyPlayers: LobbyPlayer[] }) => void;
  'room:join_error': (data: { reason: string }) => void;
  'room:reconnected': (data: { slotIndex: number; playerId: string; gameState: GameState }) => void;
  'room:reconnect_error': (data: { reason: string }) => void;
  'lobby:state_update': (data: { lobbyPlayers: LobbyPlayer[]; hostSlotIndex: number }) => void;
  'game:state_update': (state: GameState) => void;
  'game:action_error': (data: { reason: string }) => void;
  'game:player_disconnected': (data: { slotIndex: number; playerId: string; name: string }) => void;
  'game:player_reconnected': (data: { slotIndex: number; playerId: string; name: string }) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: { playerName: string; color: string }) => void;
  'room:join': (data: { roomCode: string; playerName: string; color: string }) => void;
  'room:reconnect': (data: { roomCode: string; reconnectToken: string }) => void;
  'room:leave': () => void;
  'lobby:start_game': (data?: { settings?: { startingTp: 500 | 1000 | 1500; taxPot: boolean; randomCreatureTiles: boolean; expandedCreatureTypes: boolean } }) => void;
  'game:action': (data: { action: ActionName; args: unknown[] }) => void;
}
