import { io, Socket } from 'socket.io-client';

// These event types mirror server/src/types.ts but are inlined here
// to avoid a cross-package import.
export interface LobbyPlayer {
  slotIndex: number;
  playerId: string;
  displayName: string;
  color: string;
  connected: boolean;
  isHost: boolean;
}

export type ActionName = string;

export interface ServerToClientEvents {
  'room:created': (data: { roomCode: string; slotIndex: number; playerId: string; reconnectToken: string }) => void;
  'room:joined': (data: { roomCode: string; slotIndex: number; playerId: string; reconnectToken: string; lobbyPlayers: LobbyPlayer[] }) => void;
  'room:join_error': (data: { reason: string }) => void;
  'room:reconnected': (data: { slotIndex: number; playerId: string; gameState: unknown }) => void;
  'room:reconnect_error': (data: { reason: string }) => void;
  'lobby:state_update': (data: { lobbyPlayers: LobbyPlayer[]; hostSlotIndex: number }) => void;
  'game:state_update': (state: unknown) => void;
  'game:action_error': (data: { reason: string }) => void;
  'game:player_disconnected': (data: { slotIndex: number; playerId: string; name: string }) => void;
  'game:player_reconnected': (data: { slotIndex: number; playerId: string; name: string }) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: { playerName: string; color: string }) => void;
  'room:join': (data: { roomCode: string; playerName: string; color: string }) => void;
  'room:reconnect': (data: { roomCode: string; reconnectToken: string }) => void;
  'room:leave': () => void;
  'lobby:start_game': () => void;
  'game:action': (data: { action: ActionName; args: unknown[] }) => void;
}

let _socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!_socket) {
    _socket = io('/', {
      autoConnect: false,
      // Include polling so Cloudflare proxied connections can upgrade gracefully
      transports: ['websocket', 'polling'],
    });
  }
  return _socket;
}

export function connectSocket(): void {
  getSocket().connect();
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}
