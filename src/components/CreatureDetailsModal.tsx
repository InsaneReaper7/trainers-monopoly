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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', alignItems: 'center' }}>
              <div className="type-badge" style={{ backgroundColor: getTypeColor(form.type), textAlign: 'center', width: '100%' }}>
                {form.type}
              </div>
              {form.secondaryType && (
                <div className="type-badge" style={{ backgroundColor: getTypeColor(form.secondaryType), textAlign: 'center', width: '100%' }}>
                  {form.secondaryType}
                </div>
              )}
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

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD'
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] || '#6b7280';
}
