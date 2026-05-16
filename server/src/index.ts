import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, ActionName } from './types';
import { RoomManager } from './RoomManager';

const PORT = process.env.PORT ?? 3001;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const roomManager = new RoomManager();

// ── Static client (production) ─────────────────────────────────────────────────
// After `npm run build` the Vite output lands in the project root /dist.
// From server/dist/index.js that is two directories up.
const clientDist = path.resolve(__dirname, '../../dist');
app.use(express.static(clientDist));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Socket.io event handlers ───────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[socket] connected: ${socket.id}`);

  // ── room:create ──
  socket.on('room:create', ({ playerName, color }) => {
    const room = roomManager.createRoom(socket.id, playerName, color);
    room.setIO(io);
    socket.join(room.roomCode);

    const slot = room.slots[0];
    socket.emit('room:created', {
      roomCode: room.roomCode,
      slotIndex: slot.slotIndex,
      playerId: slot.playerId,
      reconnectToken: slot.reconnectToken,
    });
    socket.emit('lobby:state_update', {
      lobbyPlayers: room.getLobbyPlayers(),
      hostSlotIndex: room.hostSlotIndex,
    });
    console.log(`[room] created ${room.roomCode} by ${playerName}`);
  });

  // ── room:join ──
  socket.on('room:join', ({ roomCode, playerName, color }) => {
    const result = roomManager.joinRoom(roomCode, socket.id, playerName, color);
    if ('error' in result) {
      socket.emit('room:join_error', { reason: result.error });
      return;
    }
    const { room, slotIndex, playerId, reconnectToken } = result;
    room.setIO(io);
    socket.join(room.roomCode);

    socket.emit('room:joined', {
      roomCode: room.roomCode,
      slotIndex,
      playerId,
      reconnectToken,
      lobbyPlayers: room.getLobbyPlayers(),
    });
    // Notify existing members
    room.broadcastLobby();
    console.log(`[room] ${playerName} joined ${room.roomCode} as slot ${slotIndex}`);
  });

  // ── room:reconnect ──
  socket.on('room:reconnect', ({ roomCode, reconnectToken }) => {
    const result = roomManager.reconnect(roomCode, socket.id, reconnectToken);
    if ('error' in result) {
      socket.emit('room:reconnect_error', { reason: result.error });
      return;
    }
    const { room, slotIndex, playerId } = result;
    room.setIO(io);
    socket.join(room.roomCode);

    if (room.gameState) {
      socket.emit('room:reconnected', { slotIndex, playerId, gameState: room.gameState });
    }
    room.cancelDisconnectTimer(slotIndex);
    room.broadcastLobby();
    console.log(`[room] reconnected slot ${slotIndex} to ${room.roomCode}`);
  });

  // ── room:leave ──
  socket.on('room:leave', () => {
    handleDisconnect(socket.id);
  });

  // ── lobby:start_game ──
  socket.on('lobby:start_game', (data) => {
    const info = roomManager.getSocketInfo(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomCode);
    if (!room) return;
    if (room.hostSlotIndex !== info.slotIndex) return; // only host can start
    if (room.slots.length < 1) return;
    room.startGame(data?.settings);
    console.log(`[room] game started in ${info.roomCode}`);
  });

  // ── game:action ──
  socket.on('game:action', ({ action, args }) => {
    const info = roomManager.getSocketInfo(socket.id);
    if (!info) return;
    const room = roomManager.getRoom(info.roomCode);
    if (!room) return;

    const slot = room.getSlotByIndex(info.slotIndex);
    const fromPlayerId = slot?.playerId;

    const err = room.applyAction(action as ActionName, args as unknown[], fromPlayerId);
    if (err) {
      socket.emit('game:action_error', { reason: err });
    }
  });

  // ── disconnect ──
  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
    handleDisconnect(socket.id);
  });
});

function handleDisconnect(socketId: string): void {
  const result = roomManager.removeSocket(socketId);
  if (!result) return;
  const { room, slotIndex } = result;
  room.markDisconnected(slotIndex);
  if (room.isEmpty) {
    console.log(`[room] all players gone, destroying ${room.roomCode}`);
    roomManager.deleteRoom(room.roomCode);
  }
}

// ── SPA fallback (must come after all API/socket routes) ──────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), err => {
    if (err) res.status(404).send('Not found');
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] Trainer's Monopoly server listening on port ${PORT}`);
});
