import Constants from 'expo-constants';
import { Platform } from 'react-native';

// API client configuration
const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8080/api`;
    }
  }

  // Detect host IP when running on physical Android device via Expo / Metro
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:8080/api`;
    }
  }

  // Android Emulator default loopback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api';
  }

  return 'http://127.0.0.1:8080/api';
};

export const API_BASE = getBaseUrl();

/**
 * Fetch available music categories
 */
export async function getCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  const data = await res.json();
  return data.categories;
}

/**
 * Search songs by artist or title
 */
export async function searchSongs(query) {
  const res = await fetch(`${API_BASE}/songs/search?q=${encodeURIComponent(query)}&limit=20`);
  if (!res.ok) throw new Error('Failed to search songs');
  return res.json();
}

/**
 * Search artists with photos & metadata for Artist Spotlight mode
 */
export async function searchArtists(query) {
  const res = await fetch(`${API_BASE}/artists/search?q=${encodeURIComponent(query)}&limit=15`);
  if (!res.ok) throw new Error('Failed to search artists');
  return res.json();
}

/**
 * Start a Solo Rush game session
 */
export async function startSoloGame({ playerName, avatarEmoji, avatarColor, category, difficulty, totalRounds }) {
  const res = await fetch(`${API_BASE}/game/solo/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player_name: playerName || 'Player 1',
      avatar_emoji: avatarEmoji || '🎧',
      avatar_color: avatarColor || '#FF5722',
      category: category || 'kenyan',
      difficulty: difficulty || 'medium',
      total_rounds: totalRounds || 5,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to start game');
  }
  return res.json();
}

/**
 * Submit answer for solo game
 */
export async function submitSoloAnswer({ sessionId, selectedOptionId, timeTakenMs }) {
  const res = await fetch(`${API_BASE}/game/solo/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      selected_option_id: selectedOptionId,
      time_taken_ms: timeTakenMs || 1000,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit answer');
  }
  return res.json();
}

/**
 * Start a Pass & Play local multiplayer match
 */
export async function startPassPlayGame({ players, category, difficulty, roundsPerPlayer }) {
  const res = await fetch(`${API_BASE}/game/pass-play/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      players,
      category: category || 'kenyan',
      difficulty: difficulty || 'medium',
      rounds_per_player: roundsPerPlayer || 3,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to start Pass & Play');
  }
  return res.json();
}

/**
 * Submit Pass & Play answer for current player's turn
 */
export async function submitPassPlayAnswer({ sessionId, selectedOptionId, timeTakenMs }) {
  const res = await fetch(`${API_BASE}/game/pass-play/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      selected_option_id: selectedOptionId,
      time_taken_ms: timeTakenMs || 1000,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit Pass & Play turn');
  }
  return res.json();
}

/**
 * Fetch leaderboard rankings (Deduplicated single best per player)
 */
export async function getLeaderboard({ category = 'all', difficulty = 'all', mode = 'all', limit = 25 } = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (difficulty && difficulty !== 'all') params.append('difficulty', difficulty);
  if (mode && mode !== 'all') params.append('mode', mode);
  params.append('limit', limit.toString());

  const res = await fetch(`${API_BASE}/leaderboard?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const data = await res.json();
  return data.leaderboard || [];
}

/**
 * Fetch player personal match history and records
 */
export async function getMyRecords(playerName = 'Player 1') {
  const res = await fetch(`${API_BASE}/records/my?player_name=${encodeURIComponent(playerName)}`);
  if (!res.ok) throw new Error('Failed to fetch player records');
  return res.json();
}

/**
 * Clear / reset all records and history
 */
export async function resetAllRecords(playerName = '') {
  const url = playerName ? `${API_BASE}/records/reset?player_name=${encodeURIComponent(playerName)}` : `${API_BASE}/records/reset`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset records');
  return res.json();
}
