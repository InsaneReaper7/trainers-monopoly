import React from 'react';
import { useGameStore } from '../store/gameStore';
import { BOARD_SPACES, GROUP_HOUSE_COST, GROUP_RENT_PER_TIER } from '../data/board';
import { CREATURES } from '../data/creatures';
import './TileInfoModal.css';

const POWER_COST = (groupId: string, groupSize: number) => (GROUP_HOUSE_COST[groupId] ?? 100) * groupSize;
const TIER_STARS = ['○', '★', '★★', '★★★', '★★★★', '🏨'];

export const TileInfoModal: React.FC = () => {
  const { selectedTileIndex, selectTile, boardOwnership, players, currentPlayerIndex, powerUpTile, sellPowerUp, phase } = useGameStore();

  if (selectedTileIndex === null) return null;

  const space = BOARD_SPACES[selectedTileIndex];
  if (!space.speciesId || space.type !== 'Creature') return null;

  const species = CREATURES[space.speciesId];
  const ownership = boardOwnership[selectedTileIndex];
  const currentPlayer = players[currentPlayerIndex];
  const isOwner = ownership?.ownerId === currentPlayer.id;
  const owner = ownership ? players.find(p => p.id === ownership.ownerId) : null;
  const powerUpTier = ownership?.powerUpTier ?? 0;

  // Check if player owns all tiles in group
  const groupSpaces = BOARD_SPACES.filter(s => s.groupId === space.groupId && s.type === 'Creature');
  const ownsAll = groupSpaces.every(s => boardOwnership[s.index]?.ownerId === currentPlayer.id);

  // Uniform tier enforcement: this tile can only be powered up if all siblings are at same or higher tier
  const minGroupTier = ownsAll
    ? Math.min(...groupSpaces.map(s => boardOwnership[s.index]?.powerUpTier ?? 0))
    : 0;
  const canPowerUp = isOwner && ownsAll && powerUpTier < 5 && powerUpTier <= minGroupTier;
  const nextCost = POWER_COST(space.groupId!, groupSpaces.length);
  const canAfford = currentPlayer.tp >= nextCost;

  const rentPerTier = GROUP_RENT_PER_TIER[space.groupId!] ?? 50;
  // Rent at each tier
  const currentRent = species.baseRent + rentPerTier * powerUpTier;
  const nextRent = species.baseRent + rentPerTier * (powerUpTier + 1);

  const isPlayerTurn = !currentPlayer.isCpu && (phase === 'ROLL' || phase === 'END_TURN' || phase === 'BANKRUPTCY');

  // Resolve the actual creature owned on this tile so we show evolved name/stats
  const ownedCreature = owner
    ? ([...owner.party, ...owner.storage].find(c => c.id === ownership?.creatureId) ?? null)
    : null;
  const displayStage = ownedCreature?.currentStage ?? 0;
  const displayStats = ownedCreature?.stats ?? species.baseForm.stats;
  const displayName = displayStage === 0
    ? species.baseForm.name
    : displayStage === 1
    ? (species.stage1Form?.name ?? species.baseForm.name)
    : (species.stage2Form?.name ?? species.stage1Form?.name ?? species.baseForm.name);

  const maxTierInGroup = ownsAll
    ? Math.max(...groupSpaces.map(s => boardOwnership[s.index]?.powerUpTier ?? 0))
    : 0;
  const canSell = isOwner && powerUpTier > 0 && powerUpTier >= maxTierInGroup;
  const sellRefund = Math.floor(POWER_COST(space.groupId!, groupSpaces.length) / 2);

  return (
    <div className="modal-overlay" onClick={() => selectTile(null)}>
      <div className="tile-info-modal glass-panel" onClick={e => e.stopPropagation()}>
        <button className="tile-close-btn" onClick={() => selectTile(null)}>✕</button>

        {/* Header */}
        <div className="tile-modal-header">
          <img
            src={`/assets/creatures/${species.id}.png`}
            alt={displayName}
            className="tile-creature-img"
          />
          <div className="tile-header-info">
            <h2 className="text-gradient">
              {displayName}
              {displayStage > 0 && <span style={{ color: '#fbbf24', marginLeft: '0.4rem' }}>{'★'.repeat(displayStage)}</span>}
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>{space.name}</div>
            <div className="tile-type-row">
              <span className="type-chip" style={{ backgroundColor: '#6b7280' }}>{species.baseForm.type}</span>
              <span className="tier-chip">Tier {TIER_STARS[powerUpTier]}</span>
            </div>
            <div className="tile-owner-row">
              {ownership ? (
                <span style={{ color: owner?.color }}>Owned by {owner?.name}</span>
              ) : (
                <span style={{ color: '#22c55e' }}>Unowned — {species.captureCost} TP to capture</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="tile-stats-grid">
          <div className="tile-stat-block">
            <div className="stat-label">Base Rent</div>
            <div className="stat-value">{species.baseRent} TP</div>
          </div>
          <div className="tile-stat-block highlight">
            <div className="stat-label">Current Rent</div>
            <div className="stat-value">{currentRent} TP</div>
          </div>
          <div className="tile-stat-block">
            <div className="stat-label">ATK</div>
            <div className="stat-value">{displayStats.atk}</div>
          </div>
          <div className="tile-stat-block">
            <div className="stat-label">DEF</div>
            <div className="stat-value">{displayStats.def}</div>
          </div>
        </div>
        {/* Rent schedule */}
        <div style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {[0,1,2,3,4,5].map(t => (
            <span key={t} style={{ background: t === powerUpTier ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: t === powerUpTier ? '#fbbf24' : t === 5 ? '#a855f7' : '#9ca3af' }}>
              {t === 0 ? 'Base' : t === 5 ? '🏨' : `T${t}`}: {species.baseRent + rentPerTier * t} TP
            </span>
          ))}
        </div>

        {/* Evolutions */}
        <div className="tile-evolutions">
          <div className="tile-evo-label">Evolution Chain</div>
          <div className="tile-evo-row">
            <div className="tile-evo-stage">
              <div className="evo-name">{species.baseForm.name}</div>
              <div className="evo-sub">Base</div>
            </div>
            {species.stage1Form && (
              <>
                <div className="evo-arrow">→</div>
                <div className="tile-evo-stage">
                  <div className="evo-name">{species.stage1Form.name}</div>
                  <div className="evo-sub">Stage 1 ★</div>
                </div>
              </>
            )}
            {species.stage2Form && (
              <>
                <div className="evo-arrow">→</div>
                <div className="tile-evo-stage">
                  <div className="evo-name">{species.stage2Form.name}</div>
                  <div className="evo-sub">Stage 2 ★★</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Power Up Panel */}
        {isOwner && ownsAll && isPlayerTurn && (
          <div className="tile-powerup-panel">
            <div className="powerup-tiers">
              {[0,1,2,3,4,5].map(t => (
                <div key={t} className={`powerup-pip ${t < powerUpTier ? 'filled' : t === powerUpTier ? 'current' : 'empty'}${t === 5 ? ' hotel-pip' : ''}`} />
              ))}
            </div>
            {powerUpTier < 5 && phase !== 'BANKRUPTCY' ? (
              <div className="powerup-info">
                <div className="powerup-cost-row">
                  <span>Cost: <strong>{nextCost} TP</strong></span>
                  <span>→ Rent becomes <strong>{nextRent} TP</strong></span>
                </div>
                {!ownsAll && (
                  <div className="powerup-warning">Own all {groupSpaces.length} tiles in this set to power up!</div>
                )}
                <button
                  className="btn-primary powerup-btn"
                  disabled={!canPowerUp || !canAfford}
                  onClick={() => { powerUpTile(selectedTileIndex); }}
                >
                  {!canAfford ? `Need ${nextCost} TP` : powerUpTier === 4 ? `🏨 Build Hotel` : `⚡ Power Up (Tier ${powerUpTier + 1})`}
                </button>
                {powerUpTier > 0 && !canPowerUp && (
                  <div className="powerup-warning">Upgrade your other tiles to Tier {powerUpTier} first!</div>
                )}
              </div>
            ) : powerUpTier >= 5 && phase !== 'BANKRUPTCY' ? (
              <div className="powerup-maxed">🏨 HOTEL — MAXED OUT</div>
            ) : null}
            {canSell && (
              <button
                className="btn-primary powerup-btn"
                style={{ background: '#ef4444', marginTop: '0.5rem' }}
                onClick={() => { sellPowerUp(selectedTileIndex); selectTile(null); }}
              >
                Sell Power Up (Tier {powerUpTier} → {powerUpTier - 1}) +{sellRefund} TP
              </button>
            )}
          </div>
        )}
        {isOwner && !ownsAll && (
          <div className="tile-powerup-panel">
            <div className="powerup-warning">Collect all {groupSpaces.length} tiles in this set to unlock Power Up!</div>
          </div>
        )}
      </div>
    </div>
  );
};
