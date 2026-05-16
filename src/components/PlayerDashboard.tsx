import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useMultiplayerStore } from '../multiplayer/multiplayerStore';
import { useIsMyTurn } from '../multiplayer/hooks/useIsMyTurn';
import { BOARD_SPACES, GROUP_RENT_PER_TIER } from '../data/board';
import { CREATURES } from '../data/creatures';
import { GYM_LEADERS } from '../data/gyms';
import type { ActiveCreature } from '../types';
import { CreatureDetailsModal } from './CreatureDetailsModal';
import './PlayerDashboard.css';

export const PlayerDashboard: React.FC = () => {
  const {
    players, currentPlayerIndex, phase, dice, boardOwnership, battleState, cardMessage, rolledDoubles, pendingGymChallenge,
    turnOrderRolls, turnOrderPending, settings, taxPotBalance,
    rollDice, rollForTurnOrder, endTurn, captureTile, payRent, startBattle, startChampionBattle, selectBattleCreature, executeBattleRound, endBattle,
    releaseCreature, drawCard, payTax, clearCardMessage, playCpuAction, declareBankruptcy,
    payAdventureFine, loseAdventureTurn,
  } = useGameStore();

  const { mpPhase, disconnectedPlayers } = useMultiplayerStore();
  const isMyTurn = useIsMyTurn();
  const isOnline = mpPhase === 'PLAYING';

  const [selectedCreature, setSelectedCreature] = useState<ActiveCreature | null>(null);

  const playerPosition = players[currentPlayerIndex]?.position;
  useEffect(() => {
    // In online mode the server drives CPU turns — don't run playCpuAction locally
    if (isOnline) return;
    const currentPlayer = useGameStore.getState().players[currentPlayerIndex];
    if (currentPlayer?.isCpu) {
      playCpuAction();
    }
  }, [phase, currentPlayerIndex, playerPosition, battleState, playCpuAction, isOnline]);

  if (players.length === 0) return null;

  const currentPlayer = players[currentPlayerIndex];
  const currentSpace = BOARD_SPACES[currentPlayer.position];
  const spaceOwnership = boardOwnership[currentPlayer.position];
  const isOwnedByMe = spaceOwnership?.ownerId === currentPlayer.id;
  const isOwnedByOther = spaceOwnership && !isOwnedByMe;

  const renderActionPanel = () => {
    // In online mode, show a waiting indicator when it's not the local player's turn
    if (isOnline && !isMyTurn) {
      return <div style={{ color: '#fbbf24', fontStyle: 'italic' }}>{currentPlayer.name} is thinking…</div>;
    }

    if (!isOnline && currentPlayer.isCpu) {
      return <div style={{ color: '#fbbf24', fontStyle: 'italic' }}>CPU is thinking...</div>;
    }

    if (phase === 'TURN_ORDER_ROLL') {
      const myRoll = turnOrderRolls[currentPlayer.id];
      const alreadyRolled = !!myRoll;
      const isMyTurnToRoll = turnOrderPending[0] === currentPlayer.id;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '1rem' }}>Rolling for Turn Order</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.5rem' }}>
            {players.map(p => {
              const roll = turnOrderRolls[p.id];
              return (
                <div key={p.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span style={{ color: p.id === currentPlayer.id ? '#f1f5f9' : '#94a3b8', flex: 1 }}>{p.name}</span>
                  <span style={{ color: roll ? '#fbbf24' : '#475569', fontWeight: roll ? 700 : 400 }}>
                    {roll ? `${roll[0] + roll[1]} (${roll[0]}+${roll[1]})` : turnOrderPending.includes(p.id) ? '—' : '...'}
                  </span>
                </div>
              );
            })}
          </div>
          {isMyTurnToRoll && !alreadyRolled && (
            <button className="btn-primary" onClick={rollForTurnOrder} style={{ width: '100%' }}>
              Roll for Turn Order!
            </button>
          )}
          {!isMyTurnToRoll && (
            <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Waiting for {players.find(p => p.id === turnOrderPending[0])?.name ?? '...'}…
            </div>
          )}
        </div>
      );
    }

    if (phase === 'ADVENTURE') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>Lost in Adventure!</div>
          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Pay 50 TP to escape and roll this turn, or lose your turn.</div>
          <button className="btn-primary" onClick={payAdventureFine} disabled={currentPlayer.tp < 50}>
            Pay 50 TP & Escape
          </button>
          <button className="btn-primary" style={{ background: '#6b7280' }} onClick={loseAdventureTurn}>
            Lose Turn
          </button>
        </div>
      );
    }

    if (phase === 'ROLL') {
      return <button className="btn-primary" onClick={rollDice}>Roll Dice</button>;
    }

    if (phase === 'BATTLE' && battleState) {
      if (!battleState.challengerCreatureId) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>Choose a creature to battle!</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {currentPlayer.party.map(c => {
                const s = CREATURES[c.speciesId];
                const stageName = c.currentStage === 0 ? s.baseForm.name
                  : c.currentStage === 1 ? (s.stage1Form?.name ?? s.baseForm.name)
                  : (s.stage2Form?.name ?? s.stage1Form?.name ?? s.baseForm.name);
                return (
                  <button key={c.id} className="btn-primary" onClick={() => selectBattleCreature(c.id)} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                    {stageName} (Lv.{c.level})
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      if (battleState.isActive) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', maxHeight: '100px', overflowY: 'auto' }}>
              {battleState.logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
            <button className="btn-primary" onClick={executeBattleRound}>Attack / Next Round</button>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', maxHeight: '100px', overflowY: 'auto' }}>
            {battleState.logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
          <button className="btn-primary" onClick={endBattle}>Finish Battle</button>
        </div>
      );
    }

    if (phase === 'ACTION') {
      if (currentSpace.type === 'Creature') {
        const species = CREATURES[currentSpace.speciesId!];
        if (!spaceOwnership) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>Wild {species.baseForm.name} appeared!</div>
              <img src={`/assets/creatures/${species.id}.png`} alt={species.id} style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0 auto' }} />
              <button 
                className="btn-primary" 
                onClick={() => captureTile(currentPlayer.position)}
                disabled={currentPlayer.tp < species.captureCost}
              >
                Capture ({species.captureCost} TP)
              </button>
              <button className="btn-primary" onClick={endTurn}>Pass</button>
            </div>
          );
        } else if (isOwnedByOther) {
          const owner = players.find(p => p.id === spaceOwnership.ownerId);
          const rentAmount = species.baseRent + (GROUP_RENT_PER_TIER[currentSpace.groupId!] ?? 50) * (spaceOwnership.powerUpTier ?? 0);
          const lossRent = Math.floor(rentAmount * 1.3);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: '#ef4444' }}>Owned by {owner?.name}</div>
              <button className="btn-primary" onClick={() => payRent(currentPlayer.position)}>
                Pay Rent ({rentAmount} TP)
              </button>
              <button className="btn-primary" onClick={() => startBattle(currentPlayer.position, false)} disabled={currentPlayer.party.length === 0}>
                Challenge ({Math.floor(rentAmount / 2)} TP win / {lossRent} TP loss)
              </button>
            </div>
          );
        } else {
           return (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <div style={{ fontSize: '0.9rem', color: '#22c55e' }}>Your Tile</div>
               <button className="btn-primary" onClick={endTurn}>End Turn</button>
             </div>
           );
        }
      }

      if (currentSpace.type === 'Gym') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>Gym: {currentSpace.name}</div>
            <button className="btn-primary" onClick={() => startBattle(currentPlayer.position, true)} disabled={currentPlayer.party.length === 0}>
              Challenge Gym Leader
            </button>
            <button className="btn-primary" onClick={endTurn}>Pass</button>
          </div>
        );
      }

      if (currentSpace.type === 'Event') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>Event: {currentSpace.name}</div>
            <button className="btn-primary" onClick={() => drawCard(currentSpace.eventDeck!)}>
              Draw Card
            </button>
          </div>
        );
      }

      if (currentSpace.type === 'Tax') {
        const pot = taxPotBalance[10] ?? 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#ef4444' }}>Tax: {currentSpace.name}</div>
            {settings.taxPot && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>💰 Just Adventuring pot: {pot} TP</div>}
            <button className="btn-primary" onClick={() => payTax(currentSpace.taxAmount!)}>
              Pay {currentSpace.taxAmount} TP
            </button>
          </div>
        );
      }

      if (currentSpace.type === 'Wild' && useGameStore.getState().wildEncounter) {
        const enc = useGameStore.getState().wildEncounter!;
        const speciesData = CREATURES[enc.speciesId];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>Wild Encounter!</div>
            <img src={`/assets/creatures/${enc.speciesId}.png`} alt={enc.speciesId} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{speciesData.baseForm.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Type: {speciesData.baseForm.type}</div>
            <div style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '0.5rem' }}>
              HP: {speciesData.baseForm.stats.hp} | ATK: {speciesData.baseForm.stats.atk} | DEF: {speciesData.baseForm.stats.def}
            </div>
            
            <button 
              className="btn-primary" 
              onClick={() => useGameStore.getState().captureWildCreature()}
              disabled={currentPlayer.tp < speciesData.captureCost}
            >
              Capture ({speciesData.captureCost} TP)
            </button>
            <button className="btn-primary" onClick={endTurn}>Flee</button>
          </div>
        );
      }

      // Champion's Arena with 8 badges
      if (currentSpace.index === 20 && currentPlayer.badges.length >= 8) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>🏆 Champion's Arena!</div>
            <div style={{ fontSize: '0.8rem', color: '#22c55e' }}>You have all 8 badges — challenge the Champion!</div>
            <button
              className="btn-primary"
              onClick={startChampionBattle}
              disabled={currentPlayer.party.length === 0}
              style={{ background: '#7c3aed' }}
            >
              ⚔️ Challenge Champion Lance!
            </button>
            <button className="btn-primary" onClick={endTurn}>Skip</button>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>Landed on: {currentSpace.name}</div>
           <button className="btn-primary" onClick={endTurn}>End Turn</button>
        </div>
      );
    }

    if (phase === 'END_TURN') {
      const onGym = currentSpace.type === 'Gym';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {cardMessage && (
            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.9rem' }}>
              {cardMessage}
            </div>
          )}
          {rolledDoubles && (
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem' }}>
              🎲 Doubles! Roll again.
            </div>
          )}
          {onGym && pendingGymChallenge && (
            <button
              className="btn-primary"
              disabled={currentPlayer.party.length === 0}
              onClick={() => startBattle(currentPlayer.position, true)}
            >
              Challenge {currentSpace.name}
            </button>
          )}
          <button className="btn-primary" onClick={() => { clearCardMessage(); endTurn(); }}>
            {rolledDoubles ? 'Roll Again!' : 'End Turn'}
          </button>
        </div>
      );
    }

    if (phase === 'BANKRUPTCY') {
      const hasCreatures = currentPlayer.party.length > 0 || currentPlayer.storage.length > 0;
      const hasPoweredTiles = Object.values(boardOwnership).some(
        o => o.ownerId === currentPlayer.id && o.powerUpTier > 0
      );
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>
            IN DEBT: {Math.abs(currentPlayer.tp)} TP owed
          </div>
          <div style={{ fontSize: '0.8rem', color: '#fbbf24', lineHeight: '1.4' }}>
            {hasCreatures
              ? 'Release a creature below to recover TP, or sell a power-up by clicking an owned tile on the board.'
              : hasPoweredTiles
              ? 'Sell a power-up by clicking an owned tile on the board.'
              : 'You have no assets left to sell.'}
          </div>
          {!hasCreatures && !hasPoweredTiles && (
            <button
              className="btn-primary"
              style={{ background: '#ef4444' }}
              onClick={declareBankruptcy}
            >
              Declare Bankruptcy
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="dashboard glass-panel">
      <div className="active-player-header" style={{ borderBottomColor: currentPlayer.color }}>
        <h2 className="heading">{currentPlayer.name}'s Turn {currentPlayer.isCpu && '(CPU)'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {currentPlayer.badges.length > 0 && (
            <div style={{ fontSize: '1.2rem' }} title="Gym Badges">
              {'🏅'.repeat(currentPlayer.badges.length)}
            </div>
          )}
          <div className="tp-display">{currentPlayer.tp} TP</div>
        </div>
      </div>

      <div className="controls">
        <div className="dice-display">
          <span>🎲 {dice[0]}</span>
          <span>🎲 {dice[1]}</span>
        </div>
        
        <div className="action-buttons" style={{ width: '100%', flex: 1, marginLeft: '1rem' }}>
          {renderActionPanel()}
        </div>
      </div>

      <div className="other-players">
        {players.map((p, idx) => {
          if (idx === currentPlayerIndex) return null;
          const disconnectedInfo = disconnectedPlayers.find(d => d.playerId === p.id);
          const isDisconnected = !!disconnectedInfo;
          return (
            <div key={p.id} className="mini-player" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: isDisconnected ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '0.5rem', border: isDisconnected ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent' }}>
              <div style={{ opacity: isDisconnected ? 0.6 : 1 }}>
                <span className="dot" style={{ backgroundColor: p.color }}></span>
                {p.name} {p.isCpu && '(CPU)'}: {p.tp} TP
                {p.badges.length > 0 && <span style={{ marginLeft: '0.5rem' }}>{'🏅'.repeat(p.badges.length)}</span>}
                {isDisconnected && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#f87171', fontStyle: 'italic' }}>
                    📡 disconnected ({Math.max(0, Math.ceil((disconnectedInfo.reconnectDeadline - Date.now()) / 1000))}s)
                  </span>
                )}
              </div>
              {!currentPlayer.isCpu && !isDisconnected && (
                <button
                  onClick={() => useGameStore.getState().initiateTrade(p.id)}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  Trade
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Badge tracker */}
      <div style={{ padding: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badges ({currentPlayer.badges.length}/8)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {Object.values(GYM_LEADERS).map(gym => {
            const has = currentPlayer.badges.includes(gym.badgeReward);
            return (
              <span
                key={gym.badgeReward}
                title={gym.badgeReward}
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: has ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                  color: has ? '#22c55e' : '#6b7280',
                  border: `1px solid ${has ? '#22c55e' : '#374151'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {has ? '✓' : '✗'} {gym.badgeReward}
              </span>
            );
          })}
        </div>
      </div>

      <div className="party-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 className="heading" style={{ margin: 0 }}>Party ({currentPlayer.party.length}/6)</h3>
          {!currentPlayer.isCpu && (
            <button 
              className="btn-primary" 
              onClick={() => useGameStore.getState().toggleStorageModal()}
              style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#3b82f6' }}
            >
              Storage ({currentPlayer.storage?.length || 0})
            </button>
          )}
        </div>
        <div className="party-grid" style={{ gridTemplateColumns: '1fr', maxHeight: '400px', overflowY: 'auto' }}>
          {currentPlayer.party.map((creature) => {
            const speciesData = CREATURES[creature.speciesId];
            return (
              <div 
                key={creature.id} 
                className="creature-card glass-panel" 
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', cursor: 'pointer' }}
                onClick={() => setSelectedCreature(creature)}
              >
                <img src={`/assets/creatures/${creature.speciesId}.png`} alt={creature.speciesId} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div className="creature-name" style={{ margin: 0 }}>
                    {creature.currentStage === 0
                      ? speciesData.baseForm.name
                      : creature.currentStage === 1
                      ? (speciesData.stage1Form?.name ?? speciesData.baseForm.name)
                      : (speciesData.stage2Form?.name ?? speciesData.stage1Form?.name ?? speciesData.baseForm.name)}
                    {creature.currentStage > 0 && <span style={{ color: '#fbbf24', marginLeft: '4px' }}>{'★'.repeat(creature.currentStage)}</span>}
                    <span style={{ fontSize: '0.7rem', color: '#ccc', marginLeft: '4px' }}>Lv.{creature.level}</span>
                  </div>
                  <div className="creature-hp" style={{ fontSize: '0.8rem' }}>HP: {creature.currentHp}/{creature.stats.hp}</div>
                </div>
                {!currentPlayer.isCpu && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); releaseCreature(creature.id); }}
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                  >
                    Release (+{Math.floor(speciesData.captureCost / 2)} TP)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedCreature && (
        <CreatureDetailsModal 
          creature={selectedCreature} 
          onClose={() => setSelectedCreature(null)} 
        />
      )}
    </div>
  );
};
