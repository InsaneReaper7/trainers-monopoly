import React from 'react';
import './MainMenu.css';

interface MainMenuProps {
  onStartSinglePlayer: () => void;
  onStartMultiplayer: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartSinglePlayer, onStartMultiplayer }) => {
  return (
    <div className="main-menu-container">
      <div className="main-menu glass-panel">
        <h1 className="heading text-gradient title-huge">TRAINER'S MONOPOLY</h1>
        <p className="subtitle">Capture. Battle. Dominate.</p>

        <div className="menu-buttons">
          <button className="btn-primary menu-btn" onClick={onStartSinglePlayer}>
            Single Player
          </button>
          <button className="btn-primary menu-btn" onClick={onStartMultiplayer}>
            Multiplayer
          </button>
          <button className="btn-primary menu-btn disabled" disabled>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};
