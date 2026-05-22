import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { CreaturedexModal } from './CreaturedexModal';
import './MainMenu.css';

interface MainMenuProps {
  onStartSinglePlayer: () => void;
  onStartMultiplayer: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartSinglePlayer, onStartMultiplayer }) => {
  const { user, login, register, logout, error, loading } = useAuthStore();
  const [isDexOpen, setIsDexOpen] = useState(false);
  
  // Auth widget states
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!usernameInput || !passwordInput) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (authMode === 'login') {
      const success = await login(usernameInput, passwordInput);
      if (success) {
        setShowAuthDropdown(false);
        setUsernameInput('');
        setPasswordInput('');
      }
    } else {
      if (passwordInput.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      const success = await register(usernameInput, passwordInput);
      if (success) {
        setShowAuthDropdown(false);
        setUsernameInput('');
        setPasswordInput('');
      }
    }
  };

  return (
    <div className="main-menu-container">
      {/* Auth Widget in Top Right Corner */}
      <div className="auth-widget-container">
        {user ? (
          <div className="auth-logged-in glass-panel">
            <span className="auth-user-avatar">👤</span>
            <div className="auth-user-info">
              <div className="auth-user-label">Trainer Profile</div>
              <div className="auth-user-name">{user.username}</div>
            </div>
            <button className="auth-logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="auth-logged-out">
            <button 
              className="btn-primary auth-toggle-btn"
              onClick={() => setShowAuthDropdown(!showAuthDropdown)}
            >
              🔑 Login / Register
            </button>

            {showAuthDropdown && (
              <div className="auth-dropdown glass-panel">
                <div className="auth-tabs">
                  <button 
                    className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                    onClick={() => { setAuthMode('login'); setLocalError(null); }}
                  >
                    Login
                  </button>
                  <button 
                    className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                    onClick={() => { setAuthMode('register'); setLocalError(null); }}
                  >
                    Register
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="auth-form">
                  <div className="auth-form-group">
                    <label>Username</label>
                    <input 
                      type="text" 
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter username"
                      disabled={loading}
                    />
                  </div>
                  <div className="auth-form-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter password"
                      disabled={loading}
                    />
                  </div>

                  {(error || localError) && (
                    <div className="auth-error-msg">
                      ⚠️ {localError || error}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn-primary auth-submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Sign Up'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Menu Box */}
      <div className="main-menu glass-panel">
        <h1 className="heading text-gradient title-huge">TRAINER'S MONOPOLY</h1>
        <p className="subtitle">Capture. Battle. Dominate.</p>

        <div className="menu-buttons">
          <button className="btn-primary menu-btn disabled campaign-btn" disabled>
            <span className="btn-icon">🗺️</span> Campaign (Coming Soon)
          </button>
          
          <button className="btn-primary menu-btn" onClick={onStartSinglePlayer}>
            <span className="btn-icon">👤</span> Single Player
          </button>
          
          <button className="btn-primary menu-btn" onClick={onStartMultiplayer}>
            <span className="btn-icon">👥</span> Multiplayer
          </button>

          <button className="btn-primary menu-btn dex-trigger-btn" onClick={() => setIsDexOpen(true)}>
            <span className="btn-icon">📖</span> Creaturedex
          </button>
          
          <button className="btn-primary menu-btn disabled" disabled style={{ opacity: 0.3 }}>
            Settings
          </button>
        </div>
      </div>

      {/* Creaturedex Modal */}
      <CreaturedexModal isOpen={isDexOpen} onClose={() => setIsDexOpen(false)} />
    </div>
  );
};
