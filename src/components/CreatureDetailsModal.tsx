import React from 'react';
import type { ActiveCreature } from '../types';
import { CREATURES } from '../data/creatures';
import './CreatureDetailsModal.css';

interface Props {
  creature: ActiveCreature;
  onClose: () => void;
}

export const CreatureDetailsModal: React.FC<Props> = ({ creature, onClose }) => {
  const species = CREATURES[creature.speciesId];
  const form = creature.currentStage === 0 ? species.baseForm : creature.currentStage === 1 ? species.stage1Form : (species.stage2Form || species.stage1Form);
  
  if (!form) return null;

  const expNeeded = Math.floor(100 * Math.pow(1.2, creature.level - 1));
  const expPercentage = creature.level >= 100 ? 100 : Math.min(100, Math.max(0, (creature.exp / expNeeded) * 100));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="details-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="details-header">
          <div className="details-title">
            <h2 className="heading text-gradient" style={{ margin: 0 }}>{form.name}</h2>
            {creature.currentStage > 0 && <span className="stage-stars">{'★'.repeat(creature.currentStage)}</span>}
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="details-content">
          <div className="details-image-container">
            <img src={`/assets/creatures/${creature.speciesId}.png`} alt={form.name} />
            <div className="type-badge" style={{ backgroundColor: getTypeColor(form.type) }}>
              {form.type}
            </div>
          </div>

          <div className="details-info">
            <div className="level-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.2rem' }}>
                <span className="level-text">Level {creature.level}</span>
                <span className="exp-text">{creature.level >= 100 ? 'MAX' : `${creature.exp} / ${expNeeded} EXP`}</span>
              </div>
              <div className="exp-bar-bg">
                <div className="exp-bar-fill" style={{ width: `${expPercentage}%` }}></div>
              </div>
            </div>

            <div className="stats-section">
              <h3>Stats</h3>
              <div className="stat-row">
                <span>HP</span>
                <span>{creature.currentHp} / {creature.stats.hp}</span>
              </div>
              <div className="stat-row">
                <span>Attack</span>
                <span>{creature.stats.atk}</span>
              </div>
              <div className="stat-row">
                <span>Defense</span>
                <span>{creature.stats.def}</span>
              </div>
              <div className="stat-row">
                <span>Speed</span>
                <span>{creature.stats.spd}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function getTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'fire': return '#ef4444';
    case 'water': return '#3b82f6';
    case 'plant': return '#22c55e';
    case 'electric': return '#eab308';
    case 'earth': return '#d97706';
    case 'air': return '#9ca3af';
    case 'ghost': return '#7c3aed';
    case 'legendary': return '#ec4899';
    default: return '#6b7280';
  }
}
