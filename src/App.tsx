import { useState, useEffect } from 'react';
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
import type { Player } from './store/gameStore';
import { useMultiplayerStore } from './multiplayer/multiplayerStore';
import { useAuthStore } from './store/authStore';
import { CampaignSelectModal } from './components/CampaignSelectModal';
import { AdBanner } from './components/AdBanner';
import './App.css';

type AppScreen = 'MENU' | 'SP_SETUP' | 'MP_LOBBY' | 'GAME';

function App() {
  const { phase, addPlayer, addCpuPlayers, startGame, startCampaignGame, players, quitToMenu, winner, settings, updateSettings } = useGameStore();
  const { mpPhase, leaveRoom, myPlayerId } = useMultiplayerStore();
  const { unlockCreature } = useAuthStore();
  const [screen, setScreen] = useState<AppScreen>('MENU');
  const [playerName, setPlayerName] = useState('');
  const [cpuCount, setCpuCount] = useState(1);
  const [isCampaignSelectOpen, setIsCampaignSelectOpen] = useState(false);

  // Initialize auth session
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  // Track captures and evolutions for Creaturedex unlocks
  useEffect(() => {
    if (players.length === 0) return;

    let targetPlayers: Player[] = [];
    if (mpPhase === 'PLAYING' || mpPhase === 'DISCONNECTED') {
      if (myPlayerId) {
        const me = players.find(p => p.id === myPlayerId);
        if (me) targetPlayers = [me];
      }
    } else {
      targetPlayers = players.filter(p => !p.isCpu);
    }

    for (const player of targetPlayers) {
      const allCreatures = [...player.party, ...player.storage];
      for (const c of allCreatures) {
        unlockCreature(c.speciesId, c.currentStage as 0 | 1 | 2);
      }
    }
  }, [players, mpPhase, myPlayerId, unlockCreature]);

  // Multiplayer playing — let the server drive the game state
  if (mpPhase === 'PLAYING' || mpPhase === 'DISCONNECTED') {
    return (
      <div style={{ display: 'flex', width: '100vw', justifyContent: 'center', alignItems: 'center', padding: '2rem', position: 'relative', gap: '2rem' }}>
        <button
          className="btn-primary"
          onClick={() => { leaveRoom(); setScreen('MENU'); }}
          style={{ position: 'absolute', top: '1rem', left: '1rem', background: '#ef4444' }}
        >
          Quit to Main Menu
        </button>

        {/* Left Sidebar Ad */}
        <AdBanner type="vertical" fallbackText="Beast Tycoon - Capture Them All!" />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <Board />
            <PlayerDashboard />
          </div>
          {/* Bottom Horizontal Ad */}
          <AdBanner type="horizontal" fallbackText="Sponsor: Play Online Multiplayer Now!" />
        </div>

        {/* Right Sidebar Ad */}
        <AdBanner type="vertical" fallbackText="Upgrade Your Sanctums Today!" />

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
      <>
        <MainMenu
          onStartSinglePlayer={() => {
            useGameStore.setState({ phase: 'SETUP' });
            setScreen('SP_SETUP');
          }}
          onStartMultiplayer={() => setScreen('MP_LOBBY')}
          onStartCampaign={() => setIsCampaignSelectOpen(true)}
        />
        <CampaignSelectModal
          isOpen={isCampaignSelectOpen}
          onClose={() => setIsCampaignSelectOpen(false)}
          onStartCampaignGame={(chapter) => {
            const savedName = localStorage.getItem('trainers_monopoly_trainer_name') || 'Red';
            startCampaignGame(chapter, savedName);
            setScreen('GAME');
          }}
        />
      </>
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

        {/* Game Settings */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.75rem', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Game Settings</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Starting Currency</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {([500, 1000, 1500] as const).map(v => (
                <button
                  key={v}
                  className="btn-primary"
                  onClick={() => updateSettings({ startingTp: v })}
                  style={{ padding: '4px 10px', fontSize: '0.8rem', background: settings.startingTp === v ? '#6366f1' : '#334155' }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Tax Pot</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Tax payments accumulate; landing player collects the pot</div>
            </div>
            <button
              className="btn-primary"
              onClick={() => updateSettings({ taxPot: !settings.taxPot })}
              style={{ padding: '4px 14px', fontSize: '0.85rem', background: settings.taxPot ? '#22c55e' : '#334155', flexShrink: 0, marginLeft: '0.5rem' }}
            >
              {settings.taxPot ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Random Creature Tiles</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Randomizes species & renames tiles per board type group</div>
            </div>
            <button
              className="btn-primary"
              onClick={() => updateSettings({ randomCreatureTiles: !settings.randomCreatureTiles })}
              style={{ padding: '4px 14px', fontSize: '0.85rem', background: settings.randomCreatureTiles ? '#22c55e' : '#334155', flexShrink: 0, marginLeft: '0.5rem' }}
            >
              {settings.randomCreatureTiles ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Expanded Creature Types</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Adds non-board & dual-type creatures to wild encounter pool</div>
            </div>
            <button
              className="btn-primary"
              onClick={() => updateSettings({ expandedCreatureTypes: !settings.expandedCreatureTypes })}
              style={{ padding: '4px 14px', fontSize: '0.85rem', background: settings.expandedCreatureTypes ? '#22c55e' : '#334155', flexShrink: 0, marginLeft: '0.5rem' }}
            >
              {settings.expandedCreatureTypes ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

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
    <div style={{ display: 'flex', width: '100vw', justifyContent: 'center', alignItems: 'center', padding: '2rem', position: 'relative', gap: '2rem' }}>
      <button
        className="btn-primary"
        onClick={() => { quitToMenu(); setScreen('MENU'); }}
        style={{ position: 'absolute', top: '1rem', left: '1rem', background: '#ef4444' }}
      >
        Quit to Main Menu
      </button>

      {/* Left Sidebar Ad */}
      <AdBanner type="vertical" fallbackText="Beast Tycoon - Capture Them All!" />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <Board />
          <PlayerDashboard />
        </div>
        {/* Bottom Horizontal Ad */}
        <AdBanner type="horizontal" fallbackText="Sponsor: Play Online Multiplayer Now!" />
      </div>

      {/* Right Sidebar Ad */}
      <AdBanner type="vertical" fallbackText="Upgrade Your Sanctums Today!" />

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
