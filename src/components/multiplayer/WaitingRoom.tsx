import React from 'react';
import { useMultiplayerStore } from '../../multiplayer/multiplayerStore';

export const WaitingRoom: React.FC = () => {
  const { roomCode, lobbyPlayers, hostSlotIndex, mySlotIndex, startGame, leaveRoom } = useMultiplayerStore();

  const isHost = mySlotIndex === hostSlotIndex;
  const canStart = lobbyPlayers.length >= 2;

  return (
    <div className="glass-panel" style={{ padding: '2rem', width: '460px', margin: 'auto', marginTop: '10vh' }}>
      <h1 className="heading text-gradient" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Waiting Room</h1>

      {/* Room code display */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Share this code with friends:</p>
        <div style={{
          display: 'inline-block',
          background: '#1e293b', border: '2px solid #6366f1',
          borderRadius: '8px', padding: '0.5rem 1.5rem',
          fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700,
          color: '#a5b4fc', letterSpacing: '0.2em',
        }}>
          {roomCode}
        </div>
      </div>

      {/* Player list */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Players ({lobbyPlayers.length}/6):</p>
        {lobbyPlayers.map(p => (
          <div key={p.slotIndex} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.75rem', marginBottom: '0.4rem',
            background: '#1e293b', borderRadius: '6px',
            border: p.slotIndex === mySlotIndex ? '1px solid #6366f1' : '1px solid #334155',
          }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#f1f5f9', fontWeight: p.slotIndex === mySlotIndex ? 700 : 400 }}>
              {p.displayName}
              {p.slotIndex === mySlotIndex && <span style={{ color: '#94a3b8', fontWeight: 400 }}> (you)</span>}
            </span>
            {p.isHost && (
              <span style={{ fontSize: '0.75rem', background: '#6366f133', color: '#a5b4fc', padding: '2px 8px', borderRadius: '99px' }}>
                Host
              </span>
            )}
            {!p.connected && (
              <span style={{ fontSize: '0.75rem', color: '#f87171' }}>disconnected</span>
            )}
          </div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 6 - lobbyPlayers.length) }).map((_, i) => (
          <div key={`empty-${i}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.75rem', marginBottom: '0.4rem',
            background: '#0f172a', borderRadius: '6px',
            border: '1px dashed #334155',
          }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#334155', flexShrink: 0 }} />
            <span style={{ color: '#475569', fontStyle: 'italic' }}>Waiting for player…</span>
          </div>
        ))}
      </div>

      {isHost ? (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={leaveRoom} style={{ flex: 1, background: '#ef4444' }}>
            Leave
          </button>
          <button
            className="btn-primary"
            onClick={startGame}
            disabled={!canStart}
            style={{ flex: 2, opacity: canStart ? 1 : 0.5 }}
          >
            {canStart ? 'Start Game' : 'Need 2+ players'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={leaveRoom} style={{ flex: 1, background: '#ef4444' }}>
            Leave
          </button>
          <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            Waiting for host to start…
          </div>
        </div>
      )}
    </div>
  );
};
