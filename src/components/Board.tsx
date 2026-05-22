import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import './Board.css';

const getGridPosition = (index: number) => {
  // 11x11 grid (1-based index for CSS grid)
  if (index >= 0 && index <= 10) {
    // Bottom row (Go to Jail)
    return { gridRow: 11, gridColumn: 11 - index };
  } else if (index >= 11 && index <= 20) {
    // Left column
    return { gridRow: 11 - (index - 10), gridColumn: 1 };
  } else if (index >= 21 && index <= 30) {
    // Top row
    return { gridRow: 1, gridColumn: 1 + (index - 20) };
  } else {
    // Right column
    return { gridRow: 1 + (index - 30), gridColumn: 11 };
  }
};

const groupColors: Record<string, string> = {
  brown: '#8B4513',
  lightBlue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#FF0000',
  yellow: '#FFD700',
  green: '#008000',
  darkBlue: '#00008B'
};

export const Board: React.FC = () => {
  const { board, players, boardOwnership, gameLogs, selectTile, settings, taxPotBalance } = useGameStore();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLogs]);

  return (
    <div className="board-container">
      <div className="board">
        {board.map((space) => {
          const { gridRow, gridColumn } = getGridPosition(space.index);
          const ownership = boardOwnership[space.index];
          const owner = ownership ? players.find(p => p.id === ownership.ownerId) : null;
          
          return (
            <div 
              key={space.index} 
              className={`space ${space.type.toLowerCase()}${space.type === 'Creature' ? ' clickable-tile' : ''}${ownership?.powerUpTier >= 5 ? ' hotel-maxed' : ''}`}
              style={{ gridRow, gridColumn }}
              onClick={() => space.type === 'Creature' ? selectTile(space.index) : undefined}
            >
              {space.groupId && (
                <div 
                  className="color-bar" 
                  style={{ backgroundColor: groupColors[space.groupId] }} 
                />
              )}
              <div className="space-content">
                <span className="space-name">{space.name}</span>
                {owner && <span className="owner-badge" style={{ backgroundColor: owner.color }}>{owner.name}</span>}
                {ownership && ownership.powerUpTier > 0 && (
                  <span className={`power-pips${ownership.powerUpTier >= 5 ? ' hotel-icon' : ''}`}>
                    {ownership.powerUpTier >= 5 ? '🏨' : '⚡'.repeat(ownership.powerUpTier)}
                  </span>
                )}
                {settings.taxPot && space.index === 10 && (taxPotBalance[10] ?? 0) > 0 && (
                  <span className="tax-pot-badge">💰{taxPotBalance[10]}</span>
                )}
              </div>
              
              {/* Render Players on this space */}
              <div className="players-on-space">
                {players.filter(p => p.position === space.index && !p.isBankrupt).map(p => (
                  <div
                    key={p.id}
                    className="player-token"
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {/* Center of the board */}
        <div className="board-center glass-panel">
          <h1 className="heading text-gradient title">TRAINER'S MONOPOLY</h1>
          <div className="game-log" ref={logRef}>
            {gameLogs.length === 0 && (
              <div className="log-entry log-empty">Game starting... Roll the dice!</div>
            )}
            {gameLogs.map((log, i) => (
              <div key={i} className="log-entry">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
