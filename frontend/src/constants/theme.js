export const COLORS = {
  // Midnight Slate Backgrounds (Exact match to img.png)
  background: '#12141C',
  backgroundSecondary: '#161924',
  surface: '#1A1D29',
  surfaceCard: '#222736',
  surfaceBorder: '#2C3246',
  surfaceHover: '#2A3042',

  // Theme Aliases
  card: '#222736',
  cardBorder: '#2C3246',
  cardHover: '#2A3042',

  // Signature Coral Red & White Accent System (from img.png)
  primary: '#FF4B4B',        // Signature Coral Red
  primaryHover: '#FF3333',
  primaryDark: '#D93838',
  primaryGlow: 'rgba(255, 75, 75, 0.35)',

  secondary: '#FFFFFF',      // Pure Crisp White Button
  secondaryText: '#12141C',

  // Subtle Status Tints
  accentMint: '#00E676',
  accentMintGlow: 'rgba(0, 230, 118, 0.25)',
  accentAmber: '#FFB300',
  accentAmberGlow: 'rgba(255, 179, 0, 0.25)',
  accentCyan: '#00E5FF',
  accentRed: '#FF4B4B',

  // Clean User-Friendly Typography
  text: '#FFFFFF',
  textSecondary: '#A2A7B8',
  textMuted: '#73788B',
  textInverse: '#12141C',
};

export const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'Easy',
    subtitle: '15s beat • 4 choices',
    emoji: '🟢',
    snippetSec: 15,
    color: '#00E676',
    basePoints: 100,
  },
  {
    id: 'medium',
    name: 'Medium',
    subtitle: '8s beat • 4 choices',
    emoji: '🟡',
    snippetSec: 8,
    color: '#FFB300',
    basePoints: 200,
  },
  {
    id: 'hard',
    name: 'Hard',
    subtitle: '4s beat • 6 choices',
    emoji: '🔥',
    snippetSec: 4,
    color: '#FF4B4B',
    basePoints: 350,
  },
];

export const AVATAR_EMOJIS = ['🦁', '👑', '🎧', '⚡', '🔥', '⭐', '🚀', '💎', '🎤', '🦊', '🐯', '🎸'];

export const AVATAR_COLORS = [
  '#FF4B4B', // Coral Red
  '#00E676', // Mint
  '#00E5FF', // Cyan
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFB300', // Amber
  '#3B82F6', // Royal Blue
  '#10B981', // Emerald
];

export const DEFAULT_PLAYERS = [
  { id: 'p1', name: 'Player 1', avatarEmoji: '🦁', avatarColor: '#FF4B4B' },
  { id: 'p2', name: 'Player 2', avatarEmoji: '⚡', avatarColor: '#00E5FF' },
  { id: 'p3', name: 'Player 3', avatarEmoji: '👑', avatarColor: '#EC4899' },
  { id: 'p4', name: 'Player 4', avatarEmoji: '🎧', avatarColor: '#8B5CF6' },
];
