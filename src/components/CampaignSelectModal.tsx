import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CAMPAIGN_CHAPTERS } from '../data/board';
import { useAuthStore } from '../store/authStore';
import './CampaignSelectModal.css';

interface CampaignSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCampaignGame: (chapter: number) => void;
}

export const CampaignSelectModal: React.FC<CampaignSelectModalProps> = ({ isOpen, onClose, onStartCampaignGame }) => {
  const { campaignUnlockedChapters } = useGameStore();
  const { user } = useAuthStore();
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [trainerName, setTrainerName] = useState<string>(user?.username || 'Red');

  if (!isOpen) return null;

  const currentChapterConfig = CAMPAIGN_CHAPTERS.find(c => c.chapter === selectedChapter) || CAMPAIGN_CHAPTERS[0];

  const handleStartGame = () => {
    // Save trainer name to local storage just in case
    localStorage.setItem('trainers_monopoly_trainer_name', trainerName);
    onStartCampaignGame(selectedChapter);
    onClose();
  };

  return (
    <div className="campaign-overlay" onClick={onClose}>
      <div className="campaign-modal glass-panel" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="campaign-header">
          <div className="campaign-title-row">
            <h1 className="heading text-gradient">Campaign Mode</h1>
            <span className="campaign-subtitle">Embark on a story of capture, battle, and dominance</span>
          </div>
          <button className="campaign-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Content Grid */}
        <div className="campaign-content-grid">
          
          {/* Left Side: Chapters List */}
          <div className="chapters-list">
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Select Chapter</div>
            
            {CAMPAIGN_CHAPTERS.map(ch => {
              const isUnlocked = campaignUnlockedChapters.includes(ch.chapter);
              const isSelected = selectedChapter === ch.chapter;
              const isCompleted = campaignUnlockedChapters.includes(ch.chapter + 1);

              return (
                <div
                  key={ch.chapter}
                  className={`chapter-card ${isSelected ? 'active-selection' : ''} ${!isUnlocked ? 'locked' : ''}`}
                  onClick={() => isUnlocked && setSelectedChapter(ch.chapter)}
                >
                  <div className="chapter-number-badge">
                    {ch.chapter}
                  </div>
                  
                  <div className="chapter-card-details">
                    <div className="chapter-card-title">{ch.title}</div>
                    <div className="chapter-card-status">
                      {isCompleted ? (
                        <span className="status-completed">✓ Completed</span>
                      ) : isUnlocked ? (
                        <span className="status-unlocked">● Unlocked</span>
                      ) : (
                        <span className="status-locked">🔒 Locked</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side: Chapter Details Preview */}
          <div className="chapter-preview-panel">
            <div className="chapter-preview-header">
              <span className="preview-chapter-label">Chapter {currentChapterConfig.chapter} Overview</span>
              <h2 className="preview-title text-gradient">{currentChapterConfig.title.split(': ')[1]}</h2>
            </div>

            <p className="preview-description">{currentChapterConfig.description}</p>

            <div className="preview-info-block">
              <span className="preview-info-label">Win Condition</span>
              <span className="preview-info-value goal-highlight">🎯 {currentChapterConfig.goal}</span>
            </div>

            <div className="preview-info-block">
              <span className="preview-info-label">Rivals</span>
              <div className="rivals-list">
                {currentChapterConfig.opponents.map((opp, idx) => (
                  <span key={idx} className="rival-tag">
                    <span className="rival-color-indicator" style={{ backgroundColor: opp.color }} />
                    {opp.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Trainer Name Input */}
            <div className="preview-info-block" style={{ marginTop: '0.5rem' }}>
              <span className="preview-info-label">Your Trainer Name</span>
              <input
                type="text"
                value={trainerName}
                onChange={e => setTrainerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={12}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none',
                  marginTop: '0.25rem',
                  width: '100%'
                }}
              />
            </div>

            <button
              className="start-chapter-btn"
              onClick={handleStartGame}
              disabled={!campaignUnlockedChapters.includes(selectedChapter)}
            >
              Start Chapter {selectedChapter}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
