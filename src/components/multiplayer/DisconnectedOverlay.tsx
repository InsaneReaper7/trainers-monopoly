import React, { useState, useEffect } from 'react';
import { useMultiplayerStore } from '../../multiplayer/multiplayerStore';
import { getSocket, connectSocket } from '../../multiplayer/socketService';

const RECONNECT_WINDOW_MS = 120_000;

export const DisconnectedOverlay: React.FC = () => {
  const { mpPhase, roomCode, reconnectToken, disconnectedAt, leaveRoom } = useMultiplayerStore();
  const [reconnecting, setReconnecting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RECONNECT_WINDOW_MS / 1000);

  // Live countdown
  useEffect(() => {
    if (mpPhase !== 'DISCONNECTED' || !disconnectedAt) return;

    const tick = () => {
      const elapsed = Date.now() - disconnectedAt;
      const remaining = Math.max(0, Math.ceil((RECONNECT_WINDOW_MS - elapsed) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [mpPhase, disconnectedAt]);

  if (mpPhase !== 'DISCONNECTED') return null;

  const handleReconnect = () => {
    if (!roomCode || !reconnectToken) return;
    setReconnecting(true);
    connectSocket();
    const socket = getSocket();
    const doReconnect = () => {
      socket.emit('room:reconnect', { roomCode, reconnectToken });
      setReconnecting(false);
    };
    if (socket.connected) {
      doReconnect();
    } else {
      socket.once('connect', doReconnect);
    }
  };

  const pct = (secondsLeft / (RECONNECT_WINDOW_MS / 1000)) * 100;
  const isUrgent = secondsLeft <= 30;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.80)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '380px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📡</div>
        <h2 style={{ color: '#f1f5f9', marginBottom: '0.4rem' }}>Disconnected</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          Your session is saved. Reconnect before the timer runs out.
        </p>

        {/* Countdown ring */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{
            fontSize: '3rem', fontWeight: 700, fontFamily: 'monospace',
            color: isUrgent ? '#f87171' : '#a5b4fc',
            transition: 'color 0.5s',
          }}>
            {secondsLeft}s
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: '#1e293b', borderRadius: 99, overflow: 'hidden', marginTop: '0.5rem' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: isUrgent ? '#ef4444' : '#6366f1',
              borderRadius: 99,
              transition: 'width 0.5s linear, background 0.5s',
            }} />
          </div>
          {secondsLeft === 0 && (
            <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Session expired — you have been removed from the game.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={leaveRoom} style={{ flex: 1, background: '#475569' }}>
            Quit
          </button>
          <button
            className="btn-primary"
            onClick={handleReconnect}
            disabled={reconnecting || secondsLeft === 0}
            style={{ flex: 2, opacity: secondsLeft === 0 ? 0.4 : 1 }}
          >
            {reconnecting ? 'Reconnecting…' : 'Reconnect'}
          </button>
        </div>
      </div>
    </div>
  );
};
