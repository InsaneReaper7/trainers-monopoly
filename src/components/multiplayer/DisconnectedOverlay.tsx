import React, { useState } from 'react';
import { useMultiplayerStore } from '../../multiplayer/multiplayerStore';
import { getSocket, connectSocket } from '../../multiplayer/socketService';

export const DisconnectedOverlay: React.FC = () => {
  const { mpPhase, roomCode, reconnectToken, leaveRoom } = useMultiplayerStore();
  const [reconnecting, setReconnecting] = useState(false);

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

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '360px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📡</div>
        <h2 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Disconnected</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          You lost connection to the server. Your session is saved for 30 seconds.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={leaveRoom} style={{ flex: 1, background: '#475569' }}>
            Quit
          </button>
          <button
            className="btn-primary"
            onClick={handleReconnect}
            disabled={reconnecting}
            style={{ flex: 2 }}
          >
            {reconnecting ? 'Reconnecting…' : 'Reconnect'}
          </button>
        </div>
      </div>
    </div>
  );
};
