import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const USERS_FILE = path.resolve(__dirname, '../users.json');

interface User {
  username: string;
  passwordHash: string;
  salt: string;
  creaturedex: string[]; // List of unlocked speciesId + "_" + stage (e.g. "terravore_0", "terravore_1")
}

// In-memory session store (token -> username)
const sessions = new Map<string, string>();

// Helper to load users
function loadUsers(): Record<string, User> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users.json:', error);
  }
  return {};
}

// Helper to save users
function saveUsers(users: Record<string, User>): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving users.json:', error);
  }
}

// Helper to hash password
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function registerUser(username: string, password: string) {
  if (!username || !password) {
    return { success: false, message: 'Username and password are required.' };
  }
  
  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return { success: false, message: 'Username must be at least 3 characters long.' };
  }

  const users = loadUsers();
  if (users[cleanUsername]) {
    return { success: false, message: 'Username already exists.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  users[cleanUsername] = {
    username: cleanUsername,
    passwordHash,
    salt,
    creaturedex: [], // Starts empty
  };

  saveUsers(users);

  // Generate session token
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, cleanUsername);

  return { success: true, token, username: cleanUsername, message: 'Registration successful.' };
}

export function loginUser(username: string, password: string) {
  if (!username || !password) {
    return { success: false, message: 'Username and password are required.' };
  }

  const cleanUsername = username.trim().toLowerCase();
  const users = loadUsers();
  const user = users[cleanUsername];

  if (!user) {
    return { success: false, message: 'Invalid username or password.' };
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return { success: false, message: 'Invalid username or password.' };
  }

  // Generate session token
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, cleanUsername);

  return { success: true, token, username: cleanUsername, message: 'Login successful.' };
}

export function getUsernameFromToken(token: string): string | null {
  if (!token) return null;
  return sessions.get(token) || null;
}

export function getCreaturedexForUser(username: string): string[] {
  const users = loadUsers();
  const user = users[username.toLowerCase()];
  return user ? user.creaturedex : [];
}

export function unlockCreatureForUser(username: string, unlockKey: string): { success: boolean; creaturedex: string[] } {
  const cleanUsername = username.toLowerCase();
  const users = loadUsers();
  const user = users[cleanUsername];

  if (!user) {
    return { success: false, creaturedex: [] };
  }

  if (!user.creaturedex.includes(unlockKey)) {
    user.creaturedex.push(unlockKey);
    saveUsers(users);
  }

  return { success: true, creaturedex: user.creaturedex };
}

export function logoutUser(token: string): void {
  sessions.delete(token);
}
