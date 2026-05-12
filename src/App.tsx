import { useState } from 'react';
import { Board } from './components/Board';
import { PlayerDashboard } from './components/PlayerDashboard';
import { MainMenu } from './components/MainMenu';
import { TradeModal } from './components/TradeModal';
import { StorageModal } from './components/StorageModal';
import { TileInfoModal } from './components/TileInfoModal';
import { MultiplayerLobby } from './components/multiplayer/MultiplayerLobby';
import { WaitingRoom } from './components/multiplayer/WaitingRoom';
import { DisconnectedOverlay } from './components/multiplayer/DisconnectedOverlay';
import { useGameStore } from './store/gameStore';
import { useMultiplayerStore } from './multiplayer/multiplayerStore';
import './App.css';

type AppScreen = 'MENU' | 'SP_SETUP' | 'MP_LOBBY' | 'GAME';

function App() {
  const { phase, addPlayer, addCpuPlayers, startGame, players, quitToMenu, winner } = useGameStore();
  const { mpPhase, leaveRoom } = useMultiplayerStore();
  const [screen, setScreen] = useState<AppScreen>('MENU');
  const [playerName, setPlayerName] = useState('');
  const [cpuCount, setCpuCount] = useState(1);

  // Multiplayer playing — let the server drive the game state
  if (mpPhase === 'PLAYING' || mpPhase === 'DISCONNECTED') {
    return (
      <div style={{ display: 'flex', width: '100vw', justifyContent: 'center', padding: '2rem', position: 'relative', gap: '2rem' }}>
        <button
          className="btn-primary"
          onClick={() => { leaveRoom(); setScreen('MENU'); }}
          style={{ position: 'absolute', top: '1rem', left: '1rem', background: '#ef4444' }}
        >
          Quit to Main Menu
        </button>
        <Board />
        <PlayerDashboard />
        <TradeModal />
        <StorageModal />
        <TileInfoModal />
        <DisconnectedOverlay />
        {winner && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '480px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
              <h1 className="heading text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>VICTORY!</h1>
              <p style={{ color: '#fbbf24', fontSize: '1.4rem', marginBottom: '2rem', fontWeight: 'bold' }}>{winner} wins the game!</p>
              <button className="btn-primary" onClick={() => { leaveRoom(); setScreen('MENU'); }} style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>Back to Menu</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Multiplayer waiting room
  if (mpPhase === 'WAITING_ROOM' || mpPhase === 'CONNECTING') {
    if (mpPhase === 'CONNECTING') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: '1.1rem' }}>
          Connecting…
        </div>
      );
    }
    return <WaitingRoom />;
  }

  // Multiplayer lobby (create/join room)
  if (screen === 'MP_LOBBY') {
    return <MultiplayerLobby onBack={() => setScreen('MENU')} />;
  }

  // Main menu
  if (screen === 'MENU' || phase === 'MENU') {
    return (
      <MainMenu
        onStartSinglePlayer={() => {
          useGameStore.setState({ phase: 'SETUP' });
          setScreen('SP_SETUP');
        }}
        onStartMultiplayer={() => setScreen('MP_LOBBY')}
      />
    );
  }

  // Single-player setup
  if (phase === 'SETUP' || screen === 'SP_SETUP') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', width: '400px', margin: 'auto', marginTop: '10vh' }}>
        <h1 className="heading text-gradient" style={{ marginBottom: '1rem' }}>TRAINER'S MONOPOLY</h1>
        <div style={{ marginBottom: '2rem' }}>
          {players.map((p) => (
            <div key={p.id} style={{ color: p.color, margin: '0.5rem 0' }}>{p.name} joined!</div>
          ))}
        </div>

        {players.length < 6 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Your Name"
              style={{ padding: '0.5rem', borderRadius: '4px', border: 'none', flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={() => {
                if (playerName) {
                  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#14b8a6', '#a855f7', '#f97316', '#ec4899'];
                  addPlayer(playerName, colors[players.length], false);
                  setPlayerName('');
                }
              }}
            >
              Add Player
            </button>
          </div>
        )}

        {players.length > 0 && players.length < 6 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Add CPU Rivals:</span>
              <button
                className="btn-primary"
                onClick={() => setCpuCount(c => Math.max(1, c - 1))}
                style={{ padding: '4px 10px', background: '#4b5563' }}
                disabled={cpuCount <= 1}
              >−</button>
              <span style={{ color: '#fbbf24', fontWeight: 'bold', minWidth: '1.5rem', textAlign: 'center' }}>{cpuCount}</span>
              <button
                className="btn-primary"
                onClick={() => setCpuCount(c => Math.min(6 - players.length, c + 1))}
                style={{ padding: '4px 10px', background: '#4b5563' }}
                disabled={cpuCount >= 6 - players.length}
              >+</button>
              <button
                className="btn-primary"
                onClick={() => addCpuPlayers(cpuCount)}
                style={{ background: '#fbbf24', color: '#000', flex: 1 }}
              >
                Add {cpuCount} CPU{cpuCount > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="btn-primary"
            onClick={() => { quitToMenu(); setScreen('MENU'); }}
            style={{ flex: 1, background: '#ef4444' }}
          >
            Back
          </button>
          <button
            className="btn-primary"
            disabled={players.length < 2 || players.length > 6}
            onClick={() => { startGame(); setScreen('GAME'); }}
            style={{ flex: 1 }}
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // In-game (single player)
  return (
    <div style={{ display: 'flex', width: '100vw', justifyContent: 'center', padding: '2rem', position: 'relative', gap: '2rem' }}>
      <button
        className="btn-primary"
        onClick={() => { quitToMenu(); setScreen('MENU'); }}
        style={{ position: 'absolute', top: '1rem', left: '1rem', background: '#ef4444' }}
      >
        Quit to Main Menu
      </button>
      <Board />
      <PlayerDashboard />
      <TradeModal />
      <StorageModal />
      <TileInfoModal />
      {winner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '480px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
            <h1 className="heading text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>VICTORY!</h1>
            <p style={{ color: '#fbbf24', fontSize: '1.4rem', marginBottom: '2rem', fontWeight: 'bold' }}>{winner} wins the game!</p>
            <button className="btn-primary" onClick={() => { quitToMenu(); setScreen('MENU'); }} style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>Back to Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
