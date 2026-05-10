import React from 'react';
import { useGameStore } from '../store/gameStore';
import { CREATURES } from '../data/creatures';
import './TradeModal.css';

export const TradeModal: React.FC = () => {
  const { players, tradeState, updateTradeOffer, proposeTrade, acceptTrade, declineTrade, cancelTrade } = useGameStore();

  if (!tradeState) return null;

  const initiator = players.find(p => p.id === tradeState.initiatorId);
  const target = players.find(p => p.id === tradeState.targetId);

  if (!initiator || !target) return null;

  const handleToggleOfferedCreature = (creatureId: string) => {
    if (tradeState.status !== 'DRAFTING') return;
    const isSelected = tradeState.offeredCreatureIds.includes(creatureId);
    if (isSelected) {
      updateTradeOffer({ offeredCreatureIds: tradeState.offeredCreatureIds.filter(id => id !== creatureId) });
    } else {
      updateTradeOffer({ offeredCreatureIds: [...tradeState.offeredCreatureIds, creatureId] });
    }
  };

  const handleToggleRequestedCreature = (creatureId: string) => {
    if (tradeState.status !== 'DRAFTING') return;
    const isSelected = tradeState.requestedCreatureIds.includes(creatureId);
    if (isSelected) {
      updateTradeOffer({ requestedCreatureIds: tradeState.requestedCreatureIds.filter(id => id !== creatureId) });
    } else {
      updateTradeOffer({ requestedCreatureIds: [...tradeState.requestedCreatureIds, creatureId] });
    }
  };

  const handleTpChange = (field: 'offeredTp' | 'requestedTp', delta: number) => {
    if (tradeState.status !== 'DRAFTING') return;
    const currentVal = tradeState[field];
    const playerTp = field === 'offeredTp' ? initiator.tp : target.tp;
    
    let newVal = currentVal + delta;
    if (newVal < 0) newVal = 0;
    if (newVal > playerTp) newVal = playerTp;
    
    updateTradeOffer({ [field]: newVal });
  };

  const renderCreatureCard = (c: any, selectedIds: string[], toggleFn: (id: string) => void) => {
    const isSelected = selectedIds.includes(c.id);
    const speciesData = CREATURES[c.speciesId];
    const stageName = c.currentStage === 0
      ? speciesData.baseForm.name
      : c.currentStage === 1
      ? (speciesData.stage1Form?.name ?? speciesData.baseForm.name)
      : (speciesData.stage2Form?.name ?? speciesData.stage1Form?.name ?? speciesData.baseForm.name);
    return (
      <div
        key={c.id}
        className={`trade-creature-card ${isSelected ? 'selected' : ''}`}
        onClick={() => toggleFn(c.id)}
      >
        <img src={`/assets/creatures/${c.speciesId}.png`} alt={c.speciesId} />
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
          {stageName} {c.currentStage > 0 && <span style={{ color: '#fbbf24' }}>{'★'.repeat(c.currentStage)}</span>}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#ccc' }}>Lv.{c.level}</div>
        <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
          HP:{c.stats.hp} ATK:{c.stats.atk} DEF:{c.stats.def}
        </div>
      </div>
    );
  };

  const renderCreatureSelect = (party: any[], storage: any[], selectedIds: string[], toggleFn: (id: string) => void) => {
    return (
      <div>
        {party.length > 0 && (
          <>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Party</div>
            <div className="trade-creature-grid">
              {party.map(c => renderCreatureCard(c, selectedIds, toggleFn))}
            </div>
          </>
        )}
        {storage.length > 0 && (
          <>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.5rem 0 0.25rem' }}>Storage</div>
            <div className="trade-creature-grid">
              {storage.map(c => renderCreatureCard(c, selectedIds, toggleFn))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="trade-modal-overlay">
      <div className="trade-modal-content glass-panel">
        <h2 className="heading text-gradient" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          {tradeState.status === 'DRAFTING' ? `Trade with ${target.name}` : `Trade Offer from ${initiator.name}`}
        </h2>

        <div className="trade-columns">
          {/* YOU OFFER COLUMN */}
          <div className="trade-column">
            <h3 style={{ color: '#fbbf24' }}>{initiator.name} Offers</h3>
            
            <div className="tp-adjuster">
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tradeState.offeredTp} TP</span>
              {tradeState.status === 'DRAFTING' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => handleTpChange('offeredTp', -50)}>-50</button>
                  <button className="btn-secondary" onClick={() => handleTpChange('offeredTp', +50)}>+50</button>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem' }}>
              <h4>Deeds ({tradeState.offeredCreatureIds.length})</h4>
              {renderCreatureSelect(initiator.party, initiator.storage, tradeState.offeredCreatureIds, handleToggleOfferedCreature)}
            </div>
          </div>

          {/* TARGET OFFERS COLUMN */}
          <div className="trade-column">
            <h3 style={{ color: '#22c55e' }}>{target.name} Offers</h3>
            
            <div className="tp-adjuster">
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tradeState.requestedTp} TP</span>
              {tradeState.status === 'DRAFTING' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => handleTpChange('requestedTp', -50)}>-50</button>
                  <button className="btn-secondary" onClick={() => handleTpChange('requestedTp', +50)}>+50</button>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem' }}>
              <h4>Deeds ({tradeState.requestedCreatureIds.length})</h4>
              {renderCreatureSelect(target.party, target.storage, tradeState.requestedCreatureIds, handleToggleRequestedCreature)}
            </div>
          </div>
        </div>

        <div className="trade-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {tradeState.status === 'DRAFTING' ? (
            <>
              <button className="btn-primary" onClick={proposeTrade}>Propose Trade</button>
              <button className="btn-secondary" onClick={cancelTrade} style={{ background: '#ef4444' }}>Cancel</button>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', width: '100%' }}>
                <p style={{ marginBottom: '1rem' }}>{target.name}, do you accept this trade?</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="btn-primary" onClick={acceptTrade}>Accept Trade</button>
                  <button className="btn-secondary" onClick={declineTrade} style={{ background: '#ef4444' }}>Decline</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
