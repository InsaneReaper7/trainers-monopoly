import { Server } from 'socket.io';
import {
  GameState, PlayerSlot, LobbyPlayer, LobbyPhase, ActionName,
  ServerToClientEvents, ClientToServerEvents
} from './types';
import {
  createInitialGameState,
  reducerRollDice, reducerEndTurn, reducerCaptureTile, reducerPayRent,
  reducerStartBattle, reducerSelectBattleCreature, reducerExecuteBattleRound, reducerEndBattle,
  reducerReleaseCreature, reducerDrawCard, reducerPayTax, reducerCaptureWildCreature,
  reducerClearWildEncounter,
  reducerInitiateTrade, reducerUpdateTradeOffer, reducerProposeTrade, reducerNegotiateTrade, reducerAcceptTrade,
  reducerDeclineTrade, reducerCancelTrade,
  reducerPayAdventureFine, reducerLoseAdventureTurn,
  reducerSellPowerUp, reducerDeclareBankruptcy, reducerPowerUpTile,
  reducerSwapStorageCreature, reducerSelectTile, reducerToggleStorageModal, reducerClearCardMessage,
} from './gameLogic';
import { BOARD_SPACES } from './data/board';
import { CREATURES } from './data/creatures';

const MAX_SLOTS = 6;
const DISCONNECT_TIMEOUT_MS = 30_000;
const CPU_ACTION_DELAY_MS = 1_200;

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class GameRoom {
  readonly roomCode: string;
  slots: PlayerSlot[] = [];
  phase: LobbyPhase = 'LOBBY';
  hostSlotIndex = 0;
  gameState: GameState | null = null;

  private io: IOServer | null = null;
  private disconnectTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private cpuTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
  }

  setIO(io: IOServer): void {
    this.io = io;
  }

  // ── Slot management ────────────────────────────────────────────────────────

  addSlot(
    slotIndex: number,
    socketId: string,
    playerId: string,
    displayName: string,
    color: string,
    reconnectToken: string
  ): void {
    this.slots.push({ slotIndex, socketId, playerId, displayName, color, connected: true, reconnectToken });
    this.slots.sort((a, b) => a.slotIndex - b.slotIndex);
  }

  nextOpenSlot(): number {
    const taken = new Set(this.slots.map(s => s.slotIndex));
    for (let i = 0; i < MAX_SLOTS; i++) {
      if (!taken.has(i)) return i;
    }
    return -1;
  }

  getLobbyPlayers(): LobbyPlayer[] {
    return this.slots.map(s => ({
      slotIndex: s.slotIndex,
      playerId: s.playerId,
      displayName: s.displayName,
      color: s.color,
      connected: s.connected,
      isHost: s.slotIndex === this.hostSlotIndex,
    }));
  }

  getSlotByIndex(slotIndex: number): PlayerSlot | undefined {
    return this.slots.find(s => s.slotIndex === slotIndex);
  }

  // ── Game start ─────────────────────────────────────────────────────────────

  startGame(): void {
    this.phase = 'PLAYING';
    const humanPlayers = this.slots.map(s => ({
      id: s.playerId,
      name: s.displayName,
      color: s.color,
      isCpu: false,
    }));
    this.gameState = createInitialGameState(humanPlayers);
    this.broadcast();
    this.scheduleCpuIfNeeded();
  }

  // ── Action dispatch ────────────────────────────────────────────────────────

  applyAction(action: ActionName, args: unknown[], fromPlayerId?: string): string | null {
    if (!this.gameState) return 'Game not started';

    // Authorization: only the current player may act (except observer-only actions)
    const observerActions: ActionName[] = ['selectTile', 'toggleStorageModal', 'clearCardMessage'];
    if (fromPlayerId && !observerActions.includes(action)) {
      const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
      // For trade, either party may act
      const tradeActions: ActionName[] = ['updateTradeOffer', 'proposeTrade', 'negotiateTrade', 'acceptTrade', 'declineTrade', 'cancelTrade'];
      if (tradeActions.includes(action)) {
        const ts = this.gameState.tradeState;
        if (!ts) return 'No active trade';
        if (fromPlayerId !== ts.initiatorId && fromPlayerId !== ts.targetId) return 'Not your trade';
        // For editing/sending actions, only the responder may act
        const editActions: ActionName[] = ['updateTradeOffer', 'proposeTrade', 'negotiateTrade', 'acceptTrade', 'declineTrade'];
        if (editActions.includes(action) && ts.status !== 'DRAFTING' && fromPlayerId !== ts.responderId) {
          return 'Not your turn in this trade';
        }
      } else if (fromPlayerId !== currentPlayer?.id) {
        return 'Not your turn';
      }
    }

    try {
      const partial = this.dispatch(this.gameState, action, args);
      if (partial === null) return 'Unknown action';
      this.gameState = { ...this.gameState, ...partial };
    } catch (e) {
      return (e as Error).message ?? 'Action failed';
    }

    this.broadcast();
    this.scheduleCpuIfNeeded();
    return null;
  }

  private dispatch(state: GameState, action: ActionName, args: unknown[]): Partial<GameState> | null {
    const player = state.players[state.currentPlayerIndex];
    const spaceIndex = player?.position ?? 0;
    const space = BOARD_SPACES[spaceIndex];

    switch (action) {
      case 'rollDice':
        return reducerRollDice(state);

      case 'endTurn':
        return reducerEndTurn(state);

      case 'captureTile':
        return reducerCaptureTile(state, spaceIndex);

      case 'payRent':
        return reducerPayRent(state, spaceIndex);

      case 'startBattle': {
        const isGym = space?.type === 'Gym';
        return reducerStartBattle(state, spaceIndex, isGym);
      }

      case 'selectBattleCreature':
        return reducerSelectBattleCreature(state, args[0] as string);

      case 'executeBattleRound':
        return reducerExecuteBattleRound(state);

      case 'endBattle':
        return reducerEndBattle(state);

      case 'releaseCreature':
        return reducerReleaseCreature(state, args[0] as string);

      case 'drawCard':
        return reducerDrawCard(state, space?.eventDeck ?? 'Scout');

      case 'payTax': {
        const taxAmount = space?.taxAmount ?? 0;
        return reducerPayTax(state, taxAmount);
      }

      case 'captureWildCreature':
        return reducerCaptureWildCreature(state);

      case 'clearWildEncounter':
        return reducerClearWildEncounter(state);

      case 'initiateTrade':
        return reducerInitiateTrade(state, args[0] as string);

      case 'updateTradeOffer':
        return reducerUpdateTradeOffer(
          state,
          args[0] as Partial<{ offeredTp: number; offeredCreatureIds: string[]; requestedTp: number; requestedCreatureIds: string[] }>
        );

      case 'proposeTrade':
        return reducerProposeTrade(state);

      case 'negotiateTrade':
        return reducerNegotiateTrade(state);

      case 'acceptTrade':
        return reducerAcceptTrade(state);

      case 'declineTrade':
        return reducerDeclineTrade(state);

      case 'cancelTrade':
        return reducerCancelTrade(state);

      case 'payAdventureFine':
        return reducerPayAdventureFine(state);

      case 'loseAdventureTurn':
        return reducerLoseAdventureTurn(state);

      case 'sellPowerUp':
        return reducerSellPowerUp(state, args[0] as number);

      case 'declareBankruptcy':
        return reducerDeclareBankruptcy(state);

      case 'powerUpTile':
        return reducerPowerUpTile(state, args[0] as number);

      case 'swapStorageCreature':
        return reducerSwapStorageCreature(state, args[0] as string, args[1] as string);

      case 'selectTile':
        return reducerSelectTile(state, args[0] as number | null);

      case 'toggleStorageModal':
        return reducerToggleStorageModal(state);

      case 'clearCardMessage':
        return reducerClearCardMessage(state);

      default:
        return null;
    }
  }

  // ── CPU runner ─────────────────────────────────────────────────────────────

  private scheduleCpuIfNeeded(): void {
    if (!this.gameState) return;
    const player = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!player || !player.isCpu) return;
    if (this.cpuTimer) return;

    this.cpuTimer = setTimeout(() => {
      this.cpuTimer = null;
      this.runCpuTurn();
    }, CPU_ACTION_DELAY_MS);
  }

  private runCpuTurn(): void {
    if (this.destroyed || !this.gameState) return;
    const player = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!player || !player.isCpu) return;

    const action = this.pickCpuAction(this.gameState);
    if (!action) return;

    const err = this.applyAction(action.name, action.args);
    if (err) console.error(`[CPU] Error (${action.name}):`, err);
  }

  private pickCpuAction(state: GameState): { name: ActionName; args: unknown[] } | null {
    const player = state.players[state.currentPlayerIndex];
    const { phase, battleState } = state;
    const spaceIndex = player.position;
    const space = BOARD_SPACES[spaceIndex];
    const ownership = state.boardOwnership[spaceIndex];

    if (phase === 'ADVENTURE') {
      return player.tp >= 50
        ? { name: 'payAdventureFine', args: [] }
        : { name: 'loseAdventureTurn', args: [] };
    }

    if (phase === 'ROLL') {
      return { name: 'rollDice', args: [] };
    }

    if (phase === 'BATTLE' && battleState?.isActive) {
      if (!battleState.challengerCreatureId) {
        const c = player.party[0];
        if (!c) return { name: 'endBattle', args: [] };
        return { name: 'selectBattleCreature', args: [c.id] };
      }
      if (battleState.isActive) return { name: 'executeBattleRound', args: [] };
      return { name: 'endBattle', args: [] };
    }

    if (phase === 'BATTLE' && battleState && !battleState.isActive) {
      return { name: 'endBattle', args: [] };
    }

    if (phase === 'ACTION') {
      if (state.wildEncounter) {
        if (player.party.length < 6) return { name: 'captureWildCreature', args: [] };
        return { name: 'clearWildEncounter', args: [] };
      }
      if (!ownership && space?.type === 'Creature' && space.speciesId) {
        const species = CREATURES[space.speciesId];
        if (player.tp >= species.captureCost) return { name: 'captureTile', args: [] };
      }
      if (ownership && ownership.ownerId !== player.id) return { name: 'payRent', args: [] };
      if (space?.type === 'Event') return { name: 'drawCard', args: [] };
      if (space?.type === 'Tax') return { name: 'payTax', args: [] };
      return { name: 'endTurn', args: [] };
    }

    if (phase === 'END_TURN') {
      if (state.pendingGymChallenge && player.party.length > 0) {
        return { name: 'startBattle', args: [] };
      }
      // Try power-ups if owns full set and has TP
      const ownedTiles = Object.entries(state.boardOwnership)
        .filter(([, o]) => o.ownerId === player.id)
        .map(([idx]) => parseInt(idx));
      for (const tileIdx of ownedTiles) {
        const tileSpace = BOARD_SPACES[tileIdx];
        if (!tileSpace?.groupId || !tileSpace.speciesId) continue;
        const groupSpaces = BOARD_SPACES.filter(s => s.groupId === tileSpace.groupId && s.type === 'Creature');
        const ownsAll = groupSpaces.every(s => state.boardOwnership[s.index]?.ownerId === player.id);
        if (!ownsAll) continue;
        const tileOwn = state.boardOwnership[tileIdx];
        if (!tileOwn || tileOwn.powerUpTier >= 4) continue;
        const minTier = Math.min(...groupSpaces.map(s => state.boardOwnership[s.index]?.powerUpTier ?? 0));
        if (tileOwn.powerUpTier > minTier) continue;
        const cost = 100 * (tileOwn.powerUpTier + 1) * groupSpaces.length;
        if (player.tp >= cost + 200) return { name: 'powerUpTile', args: [tileIdx] };
      }
      return { name: 'endTurn', args: [] };
    }

    if (phase === 'BANKRUPTCY') {
      const poweredTiles = Object.entries(state.boardOwnership)
        .filter(([, o]) => o.ownerId === player.id && o.powerUpTier > 0)
        .map(([idx]) => parseInt(idx));
      if (poweredTiles.length > 0) return { name: 'sellPowerUp', args: [poweredTiles[0]] };
      if (player.party.length > 0) {
        return { name: 'releaseCreature', args: [player.party[player.party.length - 1].id] };
      }
      return { name: 'declareBankruptcy', args: [] };
    }

    return null;
  }

  // ── Broadcast ──────────────────────────────────────────────────────────────

  broadcast(): void {
    if (!this.io || !this.gameState) return;
    this.io.to(this.roomCode).emit('game:state_update', this.gameState);
  }

  broadcastLobby(): void {
    if (!this.io) return;
    this.io.to(this.roomCode).emit('lobby:state_update', {
      lobbyPlayers: this.getLobbyPlayers(),
      hostSlotIndex: this.hostSlotIndex,
    });
  }

  // ── Disconnect / reconnect ─────────────────────────────────────────────────

  markDisconnected(slotIndex: number): void {
    const slot = this.getSlotByIndex(slotIndex);
    if (!slot) return;
    slot.connected = false;
    slot.socketId = null;

    this.io?.to(this.roomCode).emit('game:player_disconnected', {
      slotIndex,
      playerId: slot.playerId,
      name: slot.displayName,
    });

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(slotIndex);
      if (this.phase === 'LOBBY') {
        this.slots = this.slots.filter(s => s.slotIndex !== slotIndex);
        if (slotIndex === this.hostSlotIndex && this.slots.length > 0) {
          this.hostSlotIndex = this.slots[0].slotIndex;
        }
        this.broadcastLobby();
      }
    }, DISCONNECT_TIMEOUT_MS);

    this.disconnectTimers.set(slotIndex, timer);
  }

  cancelDisconnectTimer(slotIndex: number): void {
    const timer = this.disconnectTimers.get(slotIndex);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(slotIndex);
    }
    const slot = this.getSlotByIndex(slotIndex);
    if (slot) {
      this.io?.to(this.roomCode).emit('game:player_reconnected', {
        slotIndex,
        playerId: slot.playerId,
        name: slot.displayName,
      });
    }
  }

  get isEmpty(): boolean {
    return this.slots.every(s => !s.connected);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.cpuTimer) clearTimeout(this.cpuTimer);
    for (const t of this.disconnectTimers.values()) clearTimeout(t);
    this.disconnectTimers.clear();
  }
}
