import { v4 as uuidv4 } from 'uuid';
import { GameRoom } from './GameRoom';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  // socketId → { roomCode, slotIndex }
  private socketRoomMap = new Map<string, { roomCode: string; slotIndex: number }>();

  createRoom(socketId: string, playerName: string, color: string): GameRoom {
    let roomCode: string;
    do {
      roomCode = generateRoomCode();
    } while (this.rooms.has(roomCode));

    const playerId = uuidv4();
    const reconnectToken = uuidv4();
    const room = new GameRoom(roomCode);
    room.addSlot(0, socketId, playerId, playerName, color, reconnectToken);
    this.rooms.set(roomCode, room);
    this.socketRoomMap.set(socketId, { roomCode, slotIndex: 0 });
    return room;
  }

  joinRoom(
    roomCode: string,
    socketId: string,
    playerName: string,
    color: string
  ): { room: GameRoom; slotIndex: number; playerId: string; reconnectToken: string } | { error: string } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { error: 'Room not found' };
    if (room.phase !== 'LOBBY') return { error: 'Game already in progress' };

    const slotIndex = room.nextOpenSlot();
    if (slotIndex === -1) return { error: 'Room is full' };

    const playerId = uuidv4();
    const reconnectToken = uuidv4();
    room.addSlot(slotIndex, socketId, playerId, playerName, color, reconnectToken);
    this.socketRoomMap.set(socketId, { roomCode: roomCode.toUpperCase(), slotIndex });
    return { room, slotIndex, playerId, reconnectToken };
  }

  reconnect(
    roomCode: string,
    socketId: string,
    reconnectToken: string
  ): { room: GameRoom; slotIndex: number; playerId: string } | { error: string } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { error: 'Room not found' };

    const slot = room.slots.find(s => s.reconnectToken === reconnectToken);
    if (!slot) return { error: 'Invalid reconnect token' };

    slot.socketId = socketId;
    slot.connected = true;
    room.cancelDisconnectTimer(slot.slotIndex);
    this.socketRoomMap.set(socketId, { roomCode: roomCode.toUpperCase(), slotIndex: slot.slotIndex });
    return { room, slotIndex: slot.slotIndex, playerId: slot.playerId };
  }

  getSocketInfo(socketId: string): { roomCode: string; slotIndex: number } | undefined {
    return this.socketRoomMap.get(socketId);
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  removeSocket(socketId: string): { room: GameRoom; slotIndex: number } | undefined {
    const info = this.socketRoomMap.get(socketId);
    if (!info) return undefined;
    this.socketRoomMap.delete(socketId);
    const room = this.rooms.get(info.roomCode);
    if (!room) return undefined;
    return { room, slotIndex: info.slotIndex };
  }

  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.destroy();
      this.rooms.delete(roomCode);
    }
  }
}
