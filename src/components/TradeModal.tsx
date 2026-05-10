import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useMultiplayerStore } from '../multiplayer/multiplayerStore';
import { CREATURES } from '../data/creatures';
import './TradeModal.css';

export const TradeModal: React.FC = () => {
  const { players, tradeState, updateTradeOffer, proposeTrade, negotiateTrade, acceptTrade, declineTrade, cancelTrade } = useGameStore();
  const { myPlayerId, mpPhase } = useMultiplayerStore();

  if (!tradeState) return null;

  const initiator = players.find(p => p.id === tradeState.initiatorId);
  const target    = players.find(p => p.id === tradeState.targetId);
  if (!initiator || !target) return null;

  // In multiplayer, use the socket identity. In single-player, use the current player.
  const isOnline  = mpPhase === 'PLAYING';
  const viewerId  = isOnline ? myPlayerId : players[useGameStore.getState().currentPlayerIndex]?.id;

  // Who is currently allowed to edit/respond?
  const isInitiator = viewerId === tradeState.initiatorId;
  const isTarget    = viewerId === tradeState.targetId;
  const isResponder = viewerId === tradeState.responderId;
  const isDrafter   = tradeState.status === 'DRAFTING'  && isInitiator
                    || tradeState.status === 'COUNTER'   && isResponder;
  const isViewer    = !isInitiator && !isTarget; // spectator (not in the trade)

  const handleToggleOfferedCreature = (creatureId: string) => {
    if (!isDrafter) return;
    const isSelected = tradeState.offeredCreatureIds.includes(creatureId);
    updateTradeOffer({ offeredCreatureIds: isSelected
      ? tradeState.offeredCreatureIds.filter(id => id !== creatureId)
      : [...tradeState.offeredCreatureIds, creatureId] });
  };

  const handleToggleRequestedCreature = (creatureId: string) => {
    if (!isDrafter) return;
    const isSelected = tradeState.requestedCreatureIds.includes(creatureId);
    updateTradeOffer({ requestedCreatureIds: isSelected
      ? tradeState.requestedCreatureIds.filter(id => id !== creatureId)
      : [...tradeState.requestedCreatureIds, creatureId] });
  };

  const handleTpChange = (field: 'offeredTp' | 'requestedTp', delta: number) => {
    if (!isDrafter) return;
    const player    = field === 'offeredTp' ? initiator : target;
    const currentVal = tradeState[field];
    let newVal = Math.max(0, Math.min(player.tp, currentVal + delta));
    updateTradeOffer({ [field]: newVal });
  };

  const renderCreatureCard = (c: any, selectedIds: string[], toggleFn: (id: string) => void, canInteract: boolean) => {
    const isSelected = selectedIds.includes(c.id);
    const s = CREATURES[c.speciesId];
    const stageName = c.currentStage === 0 ? s.baseForm.name
      : c.currentStage === 1 ? (s.stage1Form?.name ?? s.baseForm.name)
      : (s.stage2Form?.name ?? s.stage1Form?.name ?? s.baseForm.name);
    return (
      <div
        key={c.id}
        className={`trade-creature-card ${isSelected ? 'selected' : ''} ${!canInteract ? 'readonly' : ''}`}
        onClick={() => canInteract && toggleFn(c.id)}
        style={{ cursor: canInteract ? 'pointer' : 'default' }}
      >
        <img src={`/assets/creatures/${c.speciesId}.png`} alt={c.speciesId} />
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
          {stageName}{c.currentStage > 0 && <span style={{ color: '#fbbf24' }}>{'★'.repeat(c.currentStage)}</span>}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#ccc' }}>Lv.{c.level}</div>
        <div style={{ fontSize: '0.7rem', color: '#aaa' }}>ATK:{c.stats.atk} DEF:{c.stats.def}</div>
      </div>
    );
  };

  const renderCreatureSelect = (
    party: any[], storage: any[], selectedIds: string[],
    toggleFn: (id: string) => void, canInteract: boolean
  ) => (
    <div>
      {party.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Party</div>
          <div className="trade-creature-grid">
            {party.map(c => renderCreatureCard(c, selectedIds, toggleFn, canInteract))}
          </div>
        </>
      )}
      {storage.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.5rem 0 0.25rem' }}>Storage</div>
          <div className="trade-creature-grid">
            {storage.map(c => renderCreatureCard(c, selectedIds, toggleFn, canInteract))}
          </div>
        </>
      )}
    </div>
  );

  const statusLabel = () => {
    if (tradeState.status === 'DRAFTING') return `Trade with ${target.name}`;
    if (tradeState.status === 'COUNTER') return `Counter-Offer — ${tradeState.responderId === tradeState.targetId ? target.name : initiator.name} is editing`;
    return `Trade Offer from ${initiator.name}`;
  };

  const renderActionPanel = () => {
    if (isViewer) return (
      <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
        Waiting for {initiator.name} &amp; {target.name} to resolve this trade…
      </div>
    );

    // DRAFTING: initiator is composing
    if (tradeState.status === 'DRAFTING') {
      if (isInitiator) return (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={proposeTrade}>📤 Propose Trade</button>
          <button className="btn-secondary" onClick={cancelTrade} style={{ background: '#ef4444' }}>Cancel</button>
        </div>
      );
      // Target sees a waiting screen
      return (
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          ⏳ {initiator.name} is preparing a trade offer for you…
        </div>
      );
    }

    // PROPOSED: target must respond
    if (tradeState.status === 'PROPOSED') {
      if (isTarget) return (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <p style={{ marginBottom: '0.75rem', color: '#fbbf24' }}>{initiator.name} sent you a trade offer!</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={acceptTrade} style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>✅ Accept</button>
            <button className="btn-primary" onClick={negotiateTrade} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>🔄 Counter-Offer</button>
            <button className="btn-secondary" onClick={declineTrade} style={{ background: '#ef4444' }}>❌ Decline</button>
          </div>
        </div>
      );
      // Initiator sees waiting screen
      return (
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          ⏳ Waiting for {target.name} to respond…
          <br/>
          <button className="btn-secondary" onClick={cancelTrade} style={{ marginTop: '0.75rem', background: '#6b7280' }}>Withdraw Offer</button>
        </div>
      );
    }

    // COUNTER: the current responder edits and re-sends
    if (tradeState.status === 'COUNTER') {
      if (isResponder) return (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={negotiateTrade}>📤 Send Counter-Offer</button>
          <button className="btn-secondary" onClick={declineTrade} style={{ background: '#ef4444' }}>❌ Decline</button>
        </div>
      );
      // The other party waits
      const editor = tradeState.responderId === tradeState.targetId ? target.name : initiator.name;
      return (
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          ⏳ Waiting for {editor} to send their counter-offer…
        </div>
      );
    }

    return null;
  };

  return (
    <div className="trade-modal-overlay">
      <div className="trade-modal-content glass-panel">
        <h2 className="heading text-gradient" style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
          {statusLabel()}
        </h2>
        {tradeState.status === 'COUNTER' && (
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#a78bfa', marginBottom: '1rem' }}>
            Counter-offer in progress — terms can be adjusted by the active editor
          </div>
        )}

        <div className="trade-columns">
          {/* INITIATOR COLUMN */}
          <div className="trade-column">
            <h3 style={{ color: '#fbbf24' }}>{initiator.name} Offers</h3>
            <div className="tp-adjuster">
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tradeState.offeredTp} TP</span>
              {isDrafter && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => handleTpChange('offeredTp', -50)}>-50</button>
                  <button className="btn-secondary" onClick={() => handleTpChange('offeredTp', +50)}>+50</button>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h4>Deeds ({tradeState.offeredCreatureIds.length})</h4>
              {renderCreatureSelect(initiator.party, initiator.storage, tradeState.offeredCreatureIds, handleToggleOfferedCreature, isDrafter)}
            </div>
          </div>

          {/* TARGET COLUMN */}
          <div className="trade-column">
            <h3 style={{ color: '#22c55e' }}>{target.name} Offers</h3>
            <div className="tp-adjuster">
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tradeState.requestedTp} TP</span>
              {isDrafter && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => handleTpChange('requestedTp', -50)}>-50</button>
                  <button className="btn-secondary" onClick={() => handleTpChange('requestedTp', +50)}>+50</button>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h4>Deeds ({tradeState.requestedCreatureIds.length})</h4>
              {renderCreatureSelect(target.party, target.storage, tradeState.requestedCreatureIds, handleToggleRequestedCreature, isDrafter)}
            </div>
          </div>
        </div>

        <div className="trade-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {renderActionPanel()}
        </div>
      </div>
    </div>
  );
};
