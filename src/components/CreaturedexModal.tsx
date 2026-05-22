import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { CREATURES } from '../data/creatures';
import type { CreatureForm } from '../types';
import './CreaturedexModal.css';

interface CreaturedexModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  Normal: '#A8A77A',
  Fire: '#EE8130',
  Water: '#6390F0',
  Electric: '#F7D02C',
  Grass: '#7AC74C',
  Ice: '#96D9D6',
  Fighting: '#C22E28',
  Poison: '#A33EA1',
  Ground: '#E2BF65',
  Flying: '#A98FF3',
  Psychic: '#F95587',
  Bug: '#A6B91A',
  Rock: '#B6A136',
  Ghost: '#735797',
  Dragon: '#6F35FC',
  Dark: '#705746',
  Steel: '#B7B7CE',
  Fairy: '#D685AD'
};

const TYPES_LIST = Object.keys(TYPE_COLORS);

export const CreaturedexModal: React.FC<CreaturedexModalProps> = ({ isOpen, onClose }) => {
  const { creaturedex } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Unlocked' | 'Locked'>('All');
  
  // Selection state: tracks [speciesId, stage]
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>(Object.keys(CREATURES)[0]);
  const [selectedStage, setSelectedStage] = useState<0 | 1 | 2>(0);

  const statsMeta = useMemo(() => {
    let totalStages = 0;
    let unlockedStages = 0;

    Object.values(CREATURES).forEach((c) => {
      totalStages++;
      if (creaturedex.includes(`${c.id}_0`)) unlockedStages++;

      if (c.stage1Form) {
        totalStages++;
        if (creaturedex.includes(`${c.id}_1`)) unlockedStages++;
      }
      if (c.stage2Form) {
        totalStages++;
        if (creaturedex.includes(`${c.id}_2`)) unlockedStages++;
      }
    });

    return { totalStages, unlockedStages, percent: totalStages > 0 ? Math.round((unlockedStages / totalStages) * 100) : 0 };
  }, [creaturedex]);

  const selectedSpecies = useMemo(() => CREATURES[selectedSpeciesId], [selectedSpeciesId]);
  
  const selectedForm = useMemo((): CreatureForm | null => {
    if (!selectedSpecies) return null;
    if (selectedStage === 0) return selectedSpecies.baseForm;
    if (selectedStage === 1) return selectedSpecies.stage1Form || null;
    if (selectedStage === 2) return selectedSpecies.stage2Form || null;
    return null;
  }, [selectedSpecies, selectedStage]);

  const isSelectedUnlocked = useMemo(() => {
    return creaturedex.includes(`${selectedSpeciesId}_${selectedStage}`);
  }, [creaturedex, selectedSpeciesId, selectedStage]);

  // Check if a species is unlocked at any stage
  const isAnyStageUnlocked = (speciesId: string) => {
    return (
      creaturedex.includes(`${speciesId}_0`) ||
      creaturedex.includes(`${speciesId}_1`) ||
      creaturedex.includes(`${speciesId}_2`)
    );
  };

  const filteredSpecies = useMemo(() => {
    return Object.values(CREATURES).filter((c) => {
      // 1. Search term check
      const searchLower = search.toLowerCase();
      const matchName =
        c.baseForm.name.toLowerCase().includes(searchLower) ||
        c.stage1Form?.name.toLowerCase().includes(searchLower) ||
        c.stage2Form?.name.toLowerCase().includes(searchLower);

      if (search && !matchName) return false;

      // 2. Type check
      if (selectedTypeId) {
        const hasType =
          c.baseForm.type === selectedTypeId || c.baseForm.secondaryType === selectedTypeId ||
          c.stage1Form?.type === selectedTypeId || c.stage1Form?.secondaryType === selectedTypeId ||
          c.stage2Form?.type === selectedTypeId || c.stage2Form?.secondaryType === selectedTypeId;
        if (!hasType) return false;
      }

      // 3. Status filter check
      if (filterStatus === 'Unlocked') {
        return isAnyStageUnlocked(c.id);
      } else if (filterStatus === 'Locked') {
        const allLocked =
          !creaturedex.includes(`${c.id}_0`) &&
          (!c.stage1Form || !creaturedex.includes(`${c.id}_1`)) &&
          (!c.stage2Form || !creaturedex.includes(`${c.id}_2`));
        return allLocked;
      }

      return true;
    });
  }, [search, selectedTypeId, filterStatus, creaturedex]);

  if (!isOpen) return null;

  const maxStat = 120; // for normalization in progress bars

  return (
    <div className="creaturedex-overlay" onClick={onClose}>
      <div className="creaturedex-container glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="creaturedex-close" onClick={onClose}>&times;</button>
        
        {/* Header */}
        <div className="creaturedex-header">
          <div>
            <h1 className="heading text-gradient dex-title">CREATUREDEX</h1>
            <p className="dex-subtitle">Track your captures and evolutions across the region</p>
          </div>
          <div className="dex-progress-section">
            <div className="dex-progress-text">
              <span>UNLOCKED: <strong>{statsMeta.unlockedStages}</strong> / {statsMeta.totalStages}</span>
              <span className="dex-percentage">{statsMeta.percent}%</span>
            </div>
            <div className="dex-progress-bar-track">
              <div className="dex-progress-bar-fill" style={{ width: `${statsMeta.percent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="creaturedex-filters">
          <div className="dex-filters-row">
            <input
              type="text"
              className="dex-search-input"
              placeholder="Search by creature name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="dex-status-toggle">
              {(['All', 'Unlocked', 'Locked'] as const).map((status) => (
                <button
                  key={status}
                  className={`dex-status-btn ${filterStatus === status ? 'active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="dex-types-list">
            <button
              className={`dex-type-chip all-types ${selectedTypeId === null ? 'active' : ''}`}
              onClick={() => setSelectedTypeId(null)}
            >
              All Types
            </button>
            {TYPES_LIST.map((type) => (
              <button
                key={type}
                className={`dex-type-chip ${selectedTypeId === type ? 'active' : ''}`}
                style={{
                  '--type-color': TYPE_COLORS[type],
                  backgroundColor: selectedTypeId === type ? TYPE_COLORS[type] : 'rgba(255,255,255,0.05)',
                  borderColor: TYPE_COLORS[type]
                } as React.CSSProperties}
                onClick={() => setSelectedTypeId(selectedTypeId === type ? null : type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="creaturedex-body">
          {/* List Area */}
          <div className="creaturedex-list-pane">
            {filteredSpecies.length === 0 ? (
              <div className="dex-empty-state">
                <p>No creatures match your filters.</p>
              </div>
            ) : (
              <div className="creaturedex-grid">
                {filteredSpecies.map((species) => {
                  const unlockedStage0 = creaturedex.includes(`${species.id}_0`);
                  const unlockedStage1 = species.stage1Form && creaturedex.includes(`${species.id}_1`);
                  const unlockedStage2 = species.stage2Form && creaturedex.includes(`${species.id}_2`);
                  const hasAnyUnlock = unlockedStage0 || unlockedStage1 || unlockedStage2;

                  const cardClass = `dex-card ${selectedSpeciesId === species.id ? 'selected' : ''} ${hasAnyUnlock ? '' : 'locked'}`;

                  return (
                    <div
                      key={species.id}
                      className={cardClass}
                      onClick={() => {
                        setSelectedSpeciesId(species.id);
                        // Default to the first unlocked stage, or stage 0 if all locked
                        if (unlockedStage0) setSelectedStage(0);
                        else if (unlockedStage1) setSelectedStage(1);
                        else if (unlockedStage2) setSelectedStage(2);
                        else setSelectedStage(0);
                      }}
                    >
                      <div className="dex-card-id">#{species.captureCost} TP</div>
                      <div className="dex-card-name">
                        {hasAnyUnlock ? species.baseForm.name : '???'}
                      </div>
                      
                      <div className="dex-card-type-row">
                        {hasAnyUnlock ? (
                          <>
                            <span
                              className="dex-mini-badge"
                              style={{ backgroundColor: TYPE_COLORS[species.baseForm.type] }}
                            >
                              {species.baseForm.type}
                            </span>
                            {species.baseForm.secondaryType && (
                              <span
                                className="dex-mini-badge"
                                style={{ backgroundColor: TYPE_COLORS[species.baseForm.secondaryType] }}
                              >
                                {species.baseForm.secondaryType}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="dex-mini-badge locked">???</span>
                        )}
                      </div>

                      <div className="dex-card-stages-row">
                        <span className={`dex-stage-dot ${unlockedStage0 ? 'unlocked' : 'locked'} ${selectedSpeciesId === species.id && selectedStage === 0 ? 'active' : ''}`}>I</span>
                        {species.stage1Form && (
                          <span className={`dex-stage-dot ${unlockedStage1 ? 'unlocked' : 'locked'} ${selectedSpeciesId === species.id && selectedStage === 1 ? 'active' : ''}`}>II</span>
                        )}
                        {species.stage2Form && (
                          <span className={`dex-stage-dot ${unlockedStage2 ? 'unlocked' : 'locked'} ${selectedSpeciesId === species.id && selectedStage === 2 ? 'active' : ''}`}>III</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inspector Area */}
          <div className="creaturedex-inspector-pane">
            {selectedSpecies && selectedForm ? (
              <div className="dex-inspector-content">
                <div className="dex-inspector-card glass-panel">
                  {isSelectedUnlocked ? (
                    <>
                      <div className="dex-inspector-header">
                        <div className="dex-inspector-tier" style={{
                          color: selectedSpecies.tier === 'Legendary' ? '#fbbf24' :
                                 selectedSpecies.tier === 'Rare' ? '#a855f7' :
                                 selectedSpecies.tier === 'Uncommon' ? '#60a5fa' : '#94a3b8'
                        }}>
                          {selectedSpecies.tier.toUpperCase()} CREATURE
                        </div>
                        <h2 className="heading dex-inspector-name">{selectedForm.name}</h2>
                        
                        <div className="dex-inspector-types">
                          <span className="type-chip" style={{ backgroundColor: TYPE_COLORS[selectedForm.type] }}>
                            {selectedForm.type}
                          </span>
                          {selectedForm.secondaryType && (
                            <span className="type-chip" style={{ backgroundColor: TYPE_COLORS[selectedForm.secondaryType] }}>
                              {selectedForm.secondaryType}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="dex-inspector-avatar-box">
                        <div className="dex-avatar-silhouette-wrapper unlocked">
                          <span className="dex-avatar-emoji" style={{
                            textShadow: `0 0 20px ${TYPE_COLORS[selectedForm.type]}`
                          }}>
                            {selectedForm.type === 'Fire' ? '🔥' :
                             selectedForm.type === 'Water' ? '💧' :
                             selectedForm.type === 'Grass' ? '🍃' :
                             selectedForm.type === 'Electric' ? '⚡' :
                             selectedForm.type === 'Psychic' ? '🔮' :
                             selectedForm.type === 'Dark' ? '🌑' :
                             selectedForm.type === 'Dragon' ? '🐉' :
                             selectedForm.type === 'Steel' ? '⚙️' :
                             selectedForm.type === 'Normal' ? '🐹' :
                             selectedForm.type === 'Ground' ? '🏜️' :
                             selectedForm.type === 'Ice' ? '❄️' :
                             selectedForm.type === 'Bug' ? '🐛' :
                             selectedForm.type === 'Ghost' ? '👻' :
                             selectedForm.type === 'Fairy' ? '✨' :
                             selectedForm.type === 'Fighting' ? '🥊' :
                             selectedForm.type === 'Poison' ? '☣️' :
                             selectedForm.type === 'Rock' ? '🪨' : '🦅'}
                          </span>
                        </div>
                      </div>

                      <div className="dex-inspector-stats">
                        <h3 className="dex-stats-title heading">BASE STATS</h3>
                        <div className="dex-stat-row">
                          <span className="dex-stat-label">HP</span>
                          <span className="dex-stat-val">{selectedForm.stats.hp}</span>
                          <div className="dex-stat-bar-track">
                            <div className="dex-stat-bar-fill hp" style={{ width: `${(selectedForm.stats.hp / maxStat) * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="dex-stat-row">
                          <span className="dex-stat-label">ATK</span>
                          <span className="dex-stat-val">{selectedForm.stats.atk}</span>
                          <div className="dex-stat-bar-track">
                            <div className="dex-stat-bar-fill atk" style={{ width: `${(selectedForm.stats.atk / 50) * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="dex-stat-row">
                          <span className="dex-stat-label">DEF</span>
                          <span className="dex-stat-val">{selectedForm.stats.def}</span>
                          <div className="dex-stat-bar-track">
                            <div className="dex-stat-bar-fill def" style={{ width: `${(selectedForm.stats.def / 50) * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="dex-stat-row">
                          <span className="dex-stat-label">SPD</span>
                          <span className="dex-stat-val">{selectedForm.stats.spd}</span>
                          <div className="dex-stat-bar-track">
                            <div className="dex-stat-bar-fill spd" style={{ width: `${(selectedForm.stats.spd / 50) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="dex-inspector-meta">
                        <div>
                          <div className="dex-meta-label">Capture Cost</div>
                          <div className="dex-meta-value">{selectedSpecies.captureCost} TP</div>
                        </div>
                        {selectedSpecies.baseRent > 0 && (
                          <div>
                            <div className="dex-meta-label">Base Rent</div>
                            <div className="dex-meta-value">{selectedSpecies.baseRent} TP</div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="dex-inspector-locked">
                      <div className="dex-lock-icon">🔒</div>
                      <h2 className="heading locked-title">LOCKED STAGE</h2>
                      <p className="locked-desc">
                        Capture this creature or evolve it during gameplay to unlock its details in the Creaturedex!
                      </p>
                      <div className="dex-inspector-avatar-box">
                        <div className="dex-avatar-silhouette-wrapper locked">
                          <span className="dex-avatar-emoji">❓</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Evolutions tabs inside inspector */}
                  <div className="dex-evolution-navigation">
                    <button
                      className={`dex-evo-btn ${selectedStage === 0 ? 'selected' : ''}`}
                      onClick={() => setSelectedStage(0)}
                    >
                      Stage I
                    </button>
                    {selectedSpecies.stage1Form && (
                      <button
                        className={`dex-evo-btn ${selectedStage === 1 ? 'selected' : ''}`}
                        onClick={() => setSelectedStage(1)}
                      >
                        Stage II
                      </button>
                    )}
                    {selectedSpecies.stage2Form && (
                      <button
                        className={`dex-evo-btn ${selectedStage === 2 ? 'selected' : ''}`}
                        onClick={() => setSelectedStage(2)}
                      >
                        Stage III
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="dex-empty-state">
                <p>Select a creature from the grid to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
