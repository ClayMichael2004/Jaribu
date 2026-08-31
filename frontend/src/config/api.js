/**
 * API configuration and client calls for Jaribu Beats Engine
 */

export const API_BASE = 'http://127.0.0.1:8080/api';

/**
 * Safe JSON/Text response parser that will never crash on non-JSON error pages
 */
async function parseSafe(res, fallbackError = 'Request failed') {
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // Non-JSON response (e.g. 404 text or 500 html)
    if (!res.ok) {
      throw new Error(text.slice(0, 100) || `${fallbackError} (${res.status})`);
    }
  }
  if (!res.ok) {
    throw new Error(json?.error || text.slice(0, 100) || `${fallbackError} (${res.status})`);
  }
  return json;
}

/**
 * Fetch persistent player profile from SQLite
 */
export async function getProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`);
    const data = await parseSafe(res, 'Failed to fetch profile');
    return data.profile || { playerName: 'Clay', avatarEmoji: '🎧', avatarColor: '#c0c1ff' };
  } catch (e) {
    console.warn('Profile fetch warning, using fallback:', e.message);
    return { playerName: 'Clay', avatarEmoji: '🎧', avatarColor: '#c0c1ff' };
  }
}

/**
 * Save player profile permanently to SQLite
 */
export async function saveProfile({ playerName, avatarEmoji, avatarColor }) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player_name: playerName || 'Clay',
      avatar_emoji: avatarEmoji || '🎧',
      avatar_color: avatarColor || '#c0c1ff',
    }),
  });
  return parseSafe(res, 'Failed to save profile');
}

/**
 * Fetch available music categories
 */
export async function getCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return parseSafe(res, 'Failed to fetch categories');
}

/**
 * Search Deezer catalog by artist name for Spotlight mode
 */
export async function searchArtists(query) {
  const res = await fetch(`${API_BASE}/artists/search?q=${encodeURIComponent(query)}`);
  return parseSafe(res, 'Failed to search artists');
}

/**
 * Start a Solo Rush Game Session
 */
export async function startSoloGame({ category, difficulty, totalRounds, playerName, avatarEmoji, avatarColor }) {
  const res = await fetch(`${API_BASE}/game/solo/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: category || 'kenyan',
      difficulty: difficulty || 'medium',
      total_rounds: totalRounds || 5,
      player: {
        name: playerName || 'Clay',
        avatar_emoji: avatarEmoji || '🎧',
        avatar_color: avatarColor || '#c0c1ff',
      },
    }),
  });
  return parseSafe(res, 'Failed to start Solo game');
}

/**
 * Submit answer for Solo Rush round
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
  return parseSafe(res, 'Failed to submit answer');
}

/**
 * Start a Pass & Play local multiplayer match
 */
export async function startPassPlayGame({ players, category, difficulty, roundsPerPlayer }) {
  const formattedPlayers = (players || []).map((p, idx) => ({
    id: p.id || `p_${idx + 1}`,
    name: p.name ? p.name.trim() : `Player ${idx + 1}`,
    avatar_emoji: p.avatarEmoji || p.avatar_emoji || '🎧',
    avatar_color: p.avatarColor || p.avatar_color || '#c0c1ff',
  }));

  const res = await fetch(`${API_BASE}/game/pass-play/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      players: formattedPlayers,
      category: category || 'kenyan',
      difficulty: difficulty || 'medium',
      rounds_per_player: roundsPerPlayer || 3,
    }),
  });
  return parseSafe(res, 'Failed to start Pass & Play match');
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
  return parseSafe(res, 'Failed to submit multiplayer turn');
}

/**
 * Fetch all Solo games played from SQLite with category filter
 */
export async function getSoloGames({ category = 'all', limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  params.append('limit', limit.toString());

  const res = await fetch(`${API_BASE}/games/solo?${params.toString()}`);
  const data = await parseSafe(res, 'Failed to fetch solo games');
  return data.games || [];
}

/**
 * Fetch all Multiplayer matches played from SQLite with category filter
 */
export async function getMultiplayerGames({ category = 'all', limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  params.append('limit', limit.toString());

  const res = await fetch(`${API_BASE}/games/multiplayer?${params.toString()}`);
  const data = await parseSafe(res, 'Failed to fetch multiplayer games');
  return data.matches || [];
}

/**
 * Fetch player personal match history and calculated all-time high score / accumulated points
 */
export async function getMyRecords(playerName = 'Clay') {
  const res = await fetch(`${API_BASE}/records/my?player_name=${encodeURIComponent(playerName)}`);
  return parseSafe(res, 'Failed to fetch player records');
}

/**
 * Submit high score to leaderboard table
 */
export async function submitLeaderboard(entry) {
  const res = await fetch(`${API_BASE}/leaderboard/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return parseSafe(res, 'Failed to submit leaderboard');
}

/**
 * Clear / reset all records and history
 */
export async function resetAllRecords(playerName = '') {
  const res = await fetch(`${API_BASE}/records/reset?player_name=${encodeURIComponent(playerName)}`, {
    method: 'POST',
  });
  return parseSafe(res, 'Failed to reset records');
}
