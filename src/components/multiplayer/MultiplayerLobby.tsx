import React, { useState } from 'react';
import { useMultiplayerStore } from '../../multiplayer/multiplayerStore';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308'];
const COLOR_NAMES = ['Blue', 'Red', 'Green', 'Yellow'];

interface MultiplayerLobbyProps {
  onBack: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onBack }) => {
  const { createRoom, joinRoom, error, clearError, mpPhase } = useMultiplayerStore();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [colorIndex, setColorIndex] = useState(0);

  const isConnecting = mpPhase === 'CONNECTING';

  const handleCreate = () => {
    if (!playerName.trim()) return;
    createRoom(playerName.trim(), COLORS[colorIndex]);
  };

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.trim(), playerName.trim(), COLORS[colorIndex]);
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', width: '420px', margin: 'auto', marginTop: '10vh' }}>
      <h1 className="heading text-gradient" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
        TRAINER'S MONOPOLY
      </h1>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#94a3b8', fontSize: '1rem' }}>Online Multiplayer</h2>

      {error && (
        <div style={{ background: '#ef444433', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', color: '#fca5a5', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
        {(['create', 'join'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer',
              background: tab === t ? '#6366f1' : 'transparent',
              color: tab === t ? '#fff' : '#94a3b8',
              fontWeight: tab === t ? 700 : 400,
              fontSize: '0.9rem',
              transition: 'all 0.15s',
            }}
          >
            {t === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <input
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          placeholder="Your Trainer Name"
          maxLength={20}
          style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: '0.95rem' }}
        />

        {tab === 'join' && (
          <input
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Room Code (e.g. ABC123)"
            maxLength={6}
            style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: '0.95rem', fontFamily: 'monospace', letterSpacing: '0.15em' }}
          />
        )}

        {/* Color picker */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginRight: '0.25rem' }}>Color:</span>
          {COLORS.map((c, i) => (
            <button
              key={c}
              onClick={() => setColorIndex(i)}
              title={COLOR_NAMES[i]}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                outline: colorIndex === i ? '3px solid #f1f5f9' : '2px solid transparent',
                outlineOffset: '2px',
                transition: 'outline 0.1s',
              }}
            />
          ))}
          <span style={{ color: COLORS[colorIndex], fontWeight: 600, fontSize: '0.85rem' }}>{COLOR_NAMES[colorIndex]}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn-primary" onClick={onBack} style={{ flex: 1, background: '#475569' }}>
          Back
        </button>
        <button
          className="btn-primary"
          onClick={tab === 'create' ? handleCreate : handleJoin}
          disabled={isConnecting || !playerName.trim() || (tab === 'join' && !roomCode.trim())}
          style={{ flex: 2 }}
        >
          {isConnecting ? 'Connecting…' : tab === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </div>
    </div>
  );
};
