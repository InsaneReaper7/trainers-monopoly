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
  const { phase, addPlayer, addCpuPlayers, startGame, players, quitToMenu } = useGameStore();
  const { mpPhase, leaveRoom } = useMultiplayerStore();
  const [screen, setScreen] = useState<AppScreen>('MENU');
  const [playerName, setPlayerName] = useState('');

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

        {players.length < 4 && (
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
                  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308'];
                  addPlayer(playerName, colors[players.length], false);
                  setPlayerName('');
                }
              }}
            >
              Add Player
            </button>
          </div>
        )}

        {players.length > 0 && players.length < 4 && (
          <button
            className="btn-primary"
            onClick={() => addCpuPlayers()}
            style={{ width: '100%', marginBottom: '1rem', background: '#fbbf24', color: '#000' }}
          >
            Fill with NPC Rivals
          </button>
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
            disabled={players.length < 2}
            onClick={startGame}
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
    </div>
  );
}

export default App;
