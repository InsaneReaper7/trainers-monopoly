import { create } from 'zustand';

interface User {
  username: string;
  token: string;
}

interface AuthState {
  user: User | null;
  creaturedex: string[]; // array of "speciesId_stage" (e.g., "terravore_0")
  error: string | null;
  loading: boolean;
  
  initialize: () => Promise<void>;
  register: (username: string, password: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  unlockCreature: (speciesId: string, stage: 0 | 1 | 2) => Promise<void>;
}

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? 'http://localhost:3001'
  : window.location.origin;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  creaturedex: [],
  error: null,
  loading: false,

  initialize: async () => {
    const savedUser = localStorage.getItem('trainers_monopoly_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        set({ user, loading: true });
        
        // Fetch Creaturedex from server
        const res = await fetch(`${API_BASE}/api/creaturedex`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          set({ creaturedex: data.creaturedex, loading: false });
          return;
        }
      } catch (err) {
        console.error('Failed to initialize auth session:', err);
      }
    }
    
    // Fallback to guest mode
    const guestDex = localStorage.getItem('trainers_monopoly_guest_dex');
    set({
      user: null,
      creaturedex: guestDex ? JSON.parse(guestDex) : [],
      loading: false,
      error: null
    });
  },

  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      if (data.success) {
        const user = { username: data.username, token: data.token };
        localStorage.setItem('trainers_monopoly_user', JSON.stringify(user));
        set({ user, error: null, loading: false });
        
        // Merge guest dex to server if any exists
        const guestDexStr = localStorage.getItem('trainers_monopoly_guest_dex');
        if (guestDexStr) {
          const guestDex = JSON.parse(guestDexStr) as string[];
          for (const key of guestDex) {
            await fetch(`${API_BASE}/api/creaturedex/unlock`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`,
              },
              body: JSON.stringify({ unlockKey: key }),
            });
          }
        }
        
        // Refetch merged dex
        const dexRes = await fetch(`${API_BASE}/api/creaturedex`, {
          headers: { 'Authorization': `Bearer ${user.token}` },
        });
        if (dexRes.ok) {
          const dexData = await dexRes.json();
          set({ creaturedex: dexData.creaturedex });
        }
        
        return true;
      } else {
        set({ error: data.message, loading: false });
        return false;
      }
    } catch (err) {
      set({ error: 'Server connection error.', loading: false });
      return false;
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      if (data.success) {
        const user = { username: data.username, token: data.token };
        localStorage.setItem('trainers_monopoly_user', JSON.stringify(user));
        
        // Fetch Pokedex from server
        const dexRes = await fetch(`${API_BASE}/api/creaturedex`, {
          headers: { 'Authorization': `Bearer ${user.token}` },
        });
        
        let serverDex: string[] = [];
        if (dexRes.ok) {
          const dexData = await dexRes.json();
          serverDex = dexData.creaturedex;
        }

        // Merge guest dex to server
        const guestDexStr = localStorage.getItem('trainers_monopoly_guest_dex');
        if (guestDexStr) {
          const guestDex = JSON.parse(guestDexStr) as string[];
          let updated = false;
          for (const key of guestDex) {
            if (!serverDex.includes(key)) {
              updated = true;
              await fetch(`${API_BASE}/api/creaturedex/unlock`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user.token}`,
                },
                body: JSON.stringify({ unlockKey: key }),
              });
            }
          }
          if (updated) {
            const dexRes2 = await fetch(`${API_BASE}/api/creaturedex`, {
              headers: { 'Authorization': `Bearer ${user.token}` },
            });
            if (dexRes2.ok) {
              const dexData2 = await dexRes2.json();
              serverDex = dexData2.creaturedex;
            }
          }
        }

        set({ user, creaturedex: serverDex, error: null, loading: false });
        return true;
      } else {
        set({ error: data.message, loading: false });
        return false;
      }
    } catch (err) {
      set({ error: 'Server connection error.', loading: false });
      return false;
    }
  },

  logout: async () => {
    const { user } = get();
    if (user) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user.token}` },
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    localStorage.removeItem('trainers_monopoly_user');
    
    // Re-initialize guest dex
    const guestDex = localStorage.getItem('trainers_monopoly_guest_dex');
    set({
      user: null,
      creaturedex: guestDex ? JSON.parse(guestDex) : [],
      error: null,
      loading: false
    });
  },

  unlockCreature: async (speciesId, stage) => {
    const { user, creaturedex } = get();
    const key = `${speciesId}_${stage}`;
    
    if (creaturedex.includes(key)) return; // already unlocked
    
    const newDex = [...creaturedex, key];
    set({ creaturedex: newDex });

    if (user) {
      try {
        await fetch(`${API_BASE}/api/creaturedex/unlock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
          body: JSON.stringify({ unlockKey: key }),
        });
      } catch (err) {
        console.error('Failed to sync creature unlock with server:', err);
      }
    } else {
      localStorage.setItem('trainers_monopoly_guest_dex', JSON.stringify(newDex));
    }
  }
}));
