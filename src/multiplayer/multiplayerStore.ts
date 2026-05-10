import { create } from 'zustand';
import { getSocket, connectSocket, disconnectSocket, type LobbyPlayer } from './socketService';
import { setMpInterceptor } from './actionBridge';
import { useGameStore } from '../store/gameStore';

export type MultiplayerPhase = 'OFFLINE' | 'CONNECTING' | 'LOBBY' | 'WAITING_ROOM' | 'PLAYING' | 'DISCONNECTED';

interface MultiplayerState {
  mpPhase: MultiplayerPhase;
  roomCode: string | null;
  myPlayerId: string | null;
  mySlotIndex: number | null;
  reconnectToken: string | null;
  lobbyPlayers: LobbyPlayer[];
  hostSlotIndex: number;
  socketConnected: boolean;
  error: string | null;

  // Actions
  createRoom: (playerName: string, color: string) => void;
  joinRoom: (roomCode: string, playerName: string, color: string) => void;
  startGame: () => void;
  leaveRoom: () => void;
  clearError: () => void;
  initSocket: () => void;
  sendAction: (action: string, args: unknown[]) => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  mpPhase: 'OFFLINE',
  roomCode: null,
  myPlayerId: null,
  mySlotIndex: null,
  reconnectToken: null,
  lobbyPlayers: [],
  hostSlotIndex: 0,
  socketConnected: false,
  error: null,

  clearError: () => set({ error: null }),

  sendAction: (action, args) => {
    getSocket().emit('game:action', { action, args });
  },

  initSocket: () => {
    const socket = getSocket();

    // Avoid duplicate listeners
    socket.off('connect');
    socket.off('disconnect');
    socket.off('room:created');
    socket.off('room:joined');
    socket.off('room:join_error');
    socket.off('room:reconnected');
    socket.off('room:reconnect_error');
    socket.off('lobby:state_update');
    socket.off('game:state_update');
    socket.off('game:action_error');
    socket.off('game:player_disconnected');
    socket.off('game:player_reconnected');

    socket.on('connect', () => {
      set({ socketConnected: true });
    });

    socket.on('disconnect', () => {
      set({ socketConnected: false });
      if (get().mpPhase === 'PLAYING') {
        set({ mpPhase: 'DISCONNECTED' });
      }
    });

    // ── Lobby events ──
    socket.on('room:created', ({ roomCode, slotIndex, playerId, reconnectToken }) => {
      set({ roomCode, mySlotIndex: slotIndex, myPlayerId: playerId, reconnectToken, mpPhase: 'WAITING_ROOM' });
      _activateMultiplayerInterceptor();
    });

    socket.on('room:joined', ({ roomCode, slotIndex, playerId, reconnectToken, lobbyPlayers }) => {
      set({ roomCode, mySlotIndex: slotIndex, myPlayerId: playerId, reconnectToken, lobbyPlayers, mpPhase: 'WAITING_ROOM' });
      _activateMultiplayerInterceptor();
    });

    socket.on('room:join_error', ({ reason }) => {
      set({ error: reason, mpPhase: 'LOBBY' });
    });

    socket.on('room:reconnected', ({ slotIndex, playerId, gameState }) => {
      set({ mySlotIndex: slotIndex, myPlayerId: playerId, mpPhase: 'PLAYING' });
      _activateMultiplayerInterceptor();
      if (gameState) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useGameStore.setState(gameState as any);
      }
    });

    socket.on('room:reconnect_error', ({ reason }) => {
      set({ error: reason, mpPhase: 'LOBBY' });
    });

    socket.on('lobby:state_update', ({ lobbyPlayers, hostSlotIndex }) => {
      set({ lobbyPlayers, hostSlotIndex });
    });

    // ── Game events ──
    socket.on('game:state_update', (serverState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useGameStore.setState(serverState as any);
      if (get().mpPhase === 'WAITING_ROOM') {
        set({ mpPhase: 'PLAYING' });
      }
    });

    socket.on('game:action_error', ({ reason }) => {
      set({ error: reason });
    });

    socket.on('game:player_disconnected', ({ name }) => {
      set({ error: `${name} disconnected.` });
    });

    socket.on('game:player_reconnected', ({ name }) => {
      set({ error: null });
      console.log(`${name} reconnected.`);
    });
  },

  createRoom: (playerName, color) => {
    set({ mpPhase: 'CONNECTING', error: null });
    get().initSocket();
    connectSocket();
    const socket = getSocket();
    // Wait for connection before emitting
    if (socket.connected) {
      socket.emit('room:create', { playerName, color });
    } else {
      socket.once('connect', () => {
        socket.emit('room:create', { playerName, color });
      });
    }
  },

  joinRoom: (roomCode, playerName, color) => {
    set({ mpPhase: 'CONNECTING', error: null });
    get().initSocket();
    connectSocket();
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('room:join', { roomCode: roomCode.toUpperCase(), playerName, color });
    } else {
      socket.once('connect', () => {
        socket.emit('room:join', { roomCode: roomCode.toUpperCase(), playerName, color });
      });
    }
  },

  startGame: () => {
    getSocket().emit('lobby:start_game');
  },

  leaveRoom: () => {
    getSocket().emit('room:leave');
    setMpInterceptor(null);
    disconnectSocket();
    set({
      mpPhase: 'OFFLINE',
      roomCode: null,
      myPlayerId: null,
      mySlotIndex: null,
      reconnectToken: null,
      lobbyPlayers: [],
      error: null,
    });
    // Reset game state to menu
    useGameStore.setState({ phase: 'MENU', players: [], boardOwnership: {}, currentPlayerIndex: 0, battleState: null });
  },
}));

function _activateMultiplayerInterceptor(): void {
  setMpInterceptor((action, args) => {
    useMultiplayerStore.getState().sendAction(action, args);
    return true; // consumed — don't run local reducer
  });
}
