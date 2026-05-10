import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CREATURES } from '../data/creatures';
import './StorageModal.css';

export const StorageModal: React.FC = () => {
  const { players, currentPlayerIndex, storageModalOpen, toggleStorageModal, swapStorageCreature } = useGameStore();
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);

  if (!storageModalOpen || players.length === 0) return null;

  const currentPlayer = players[currentPlayerIndex];

  const handleSwap = () => {
    if (selectedPartyId && selectedStorageId) {
      swapStorageCreature(selectedPartyId, selectedStorageId);
      setSelectedPartyId(null);
      setSelectedStorageId(null);
    }
  };

  const renderCreature = (c: any, isSelected: boolean, onSelect: () => void) => {
    const species = CREATURES[c.speciesId];
    const form = c.currentStage === 0 ? species.baseForm : c.currentStage === 1 ? species.stage1Form : (species.stage2Form || species.stage1Form);
    
    return (
      <div 
        key={c.id} 
        className={`storage-creature ${isSelected ? 'selected' : ''}`}
        onClick={onSelect}
      >
        <img src={`/assets/creatures/${c.speciesId}.png`} alt={form!.name} />
        <div className="creature-info">
          <div className="creature-name">{form!.name}</div>
          <div className="creature-stats">Lvl {c.level} | {c.currentHp}/{c.stats.hp} HP</div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="storage-modal glass-panel">
        <h2 className="text-gradient">PC Storage System</h2>
        
        <div className="storage-container">
          <div className="storage-section">
            <h3>Active Party ({currentPlayer.party.length}/6)</h3>
            <div className="storage-grid">
              {currentPlayer.party.map(c => renderCreature(c, c.id === selectedPartyId, () => setSelectedPartyId(c.id)))}
              {currentPlayer.party.length === 0 && <div className="empty-text">Party is empty.</div>}
            </div>
          </div>
          
          <div className="storage-section">
            <h3>Storage ({currentPlayer.storage.length})</h3>
            <div className="storage-grid">
              {currentPlayer.storage.map(c => renderCreature(c, c.id === selectedStorageId, () => setSelectedStorageId(c.id)))}
              {currentPlayer.storage.length === 0 && <div className="empty-text">Storage is empty.</div>}
            </div>
          </div>
        </div>

        <div className="storage-actions">
          <button 
            className="btn-primary" 
            onClick={handleSwap}
            disabled={!selectedPartyId || !selectedStorageId}
          >
            Swap Selected
          </button>
          <button className="btn-primary cancel-btn" onClick={toggleStorageModal}>Close</button>
        </div>
      </div>
    </div>
  );
};
