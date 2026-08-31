export const COLORS = {
  // Midnight Obsidian & Deep Charcoal Base (Exact match to Stitch UI)
  background: '#131313',
  backgroundSecondary: '#0e0e0e',
  surface: '#131313',
  surfaceDim: '#131313',
  surfaceBright: '#393939',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerHighest: '#353534',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainerLowest: '#0e0e0e',

  // Stitch Signature Neon Lavender / Indigo Palette
  primary: '#c0c1ff',          // Electric Lavender Accent
  primaryLight: '#e1dfff',     // Pure Bright Lavender
  primaryDark: '#494bd6',      // Deep Indigo
  primaryGlow: 'rgba(192, 193, 255, 0.35)',
  primaryContainer: '#c0c1ff',
  onPrimary: '#1000a9',
  onPrimaryContainer: '#4b4d83',

  // Stitch Signature Neon Cyber Mint / Emerald
  secondary: '#4edea3',        // Radiant Cyber Mint
  secondaryFixed: '#6ffbbe',   // Bright Mint
  secondaryContainer: '#00b47d', // Emerald Deep
  onSecondary: '#003824',
  secondaryGlow: 'rgba(78, 222, 163, 0.35)',

  // Stitch Warm Amber Gold Accent
  tertiary: '#ffb95f',         // Warm Amber
  tertiaryLight: '#ffddb8',    // Bright Amber
  tertiaryContainer: '#ffddb8',
  onTertiary: '#472a00',
  tertiaryGlow: 'rgba(255, 185, 95, 0.35)',

  // Error / Danger Accents
  error: '#ff5449',
  errorContainer: '#93000a',
  onError: '#690005',

  // Text Hierarchy
  text: '#e5e2e1',             // Crisp Off-White
  textSecondary: '#a2a7b8',    // Muted Lavender Slate
  textMuted: '#73788b',        // Dark Muted
  textInverse: '#131313',

  // Glassmorphism & UI Accents
  outline: '#918f9a',
  outlineVariant: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.1)',
  surfaceGlow: 'rgba(192, 193, 255, 0.05)',
  glassOverlay: 'rgba(19, 19, 19, 0.85)',
  activeSelection: 'rgba(192, 193, 255, 0.15)',
  turntablePulse: 'rgba(192, 193, 255, 0.25)',

  // Aliases for component backwards-compatibility
  card: '#201f1f',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardHover: '#2a2a2a',
  accentMint: '#4edea3',
  accentMintGlow: 'rgba(78, 222, 163, 0.3)',
  accentAmber: '#ffb95f',
  accentAmberGlow: 'rgba(255, 185, 95, 0.3)',
  accentRed: '#ff5449',
};

export const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'Easy',
    subtitle: '15s beat • 4 choices',
    iconName: 'disc',
    snippetSec: 15,
    color: '#4edea3',
    basePoints: 100,
  },
  {
    id: 'medium',
    name: 'Medium',
    subtitle: '8s beat • 4 choices',
    iconName: 'zap',
    snippetSec: 8,
    color: '#ffb95f',
    basePoints: 200,
  },
  {
    id: 'hard',
    name: 'Hard',
    subtitle: '4s beat • 6 choices',
    iconName: 'flame',
    snippetSec: 4,
    color: '#c0c1ff',
    basePoints: 350,
  },
];

export const AVATAR_EMOJIS = ['🎧', '⚡', '🔥', '⭐', '🚀', '💎', '🎤', '👑', '🦁', '🎵', '🎹', '🎸'];

export const AVATAR_COLORS = [
  '#c0c1ff', // Lavender
  '#4edea3', // Mint
  '#ffb95f', // Amber
  '#70d6ff', // Cyan
  '#ff70a6', // Pink
  '#a78bfa', // Purple
  '#60a5fa', // Royal Blue
  '#34d399', // Emerald
];

export const DEFAULT_PLAYERS = [
  { id: 'p1', name: 'DJ Nova', avatarEmoji: '🎧', avatarColor: '#c0c1ff' },
  { id: 'p2', name: 'NairobiVibes', avatarEmoji: '⚡', avatarColor: '#4edea3' },
  { id: 'p3', name: 'BeatMaster99', avatarEmoji: '🔥', avatarColor: '#ffb95f' },
  { id: 'p4', name: 'VinylQueen', avatarEmoji: '⭐', avatarColor: '#ff70a6' },
];

export const GENRE_METADATA = {
  kenyan: {
    name: 'Kenyan Hits',
    shortName: 'Kenyan',
    plays: '1.4M',
    tag: 'Trending',
    themeColor: '#4edea3',
    bgGradient: 'rgba(16, 59, 41, 0.45)',
    accent: '#4edea3',
    iconName: 'disc',
    description: 'Gengetone, Arbantone & Benga',
  },
  afrobeats: {
    name: 'Afrobeats & Amapiano',
    shortName: 'Afrobeats',
    plays: '2.9M',
    tag: 'Hot',
    themeColor: '#c0c1ff',
    bgGradient: 'rgba(43, 27, 84, 0.5)',
    accent: '#c0c1ff',
    iconName: 'flame',
    description: 'Burna Boy, Asake, Tyla & Rema',
  },
  reggae: {
    name: 'Reggae & Roots',
    shortName: 'Reggae',
    plays: '950K',
    tag: 'Roots',
    themeColor: '#ffb95f',
    bgGradient: 'rgba(74, 44, 10, 0.5)',
    accent: '#ffb95f',
    iconName: 'headphones',
    description: 'Bob Marley, Chronixx & Roots',
  },
  gospel: {
    name: 'Gospel & Worship',
    shortName: 'Gospel',
    plays: '2.2M',
    tag: 'Soulful',
    themeColor: '#70d6ff',
    bgGradient: 'rgba(10, 51, 74, 0.5)',
    accent: '#70d6ff',
    iconName: 'star',
    description: 'Mercy Chinwo, Sinach & Elevation',
  },
  hiphop: {
    name: 'Hip-Hop & Trap',
    shortName: 'Hip Hop',
    plays: '3.6M',
    tag: 'Top Chart',
    themeColor: '#ff5449',
    bgGradient: 'rgba(74, 10, 26, 0.5)',
    accent: '#ff5449',
    iconName: 'zap',
    description: 'Kendrick, Drake, Travis & 2Pac',
  },
  dancehall: {
    name: 'Dancehall & Riddims',
    shortName: 'Dancehall',
    plays: '980K',
    tag: 'Energy',
    themeColor: '#6ffbbe',
    bgGradient: 'rgba(14, 51, 40, 0.5)',
    accent: '#6ffbbe',
    iconName: 'mic',
    description: 'Vybz Kartel, Popcaan & Sean Paul',
  },
  pop: {
    name: 'Billboard Pop Hits',
    shortName: 'Pop',
    plays: '4.2M',
    tag: 'Global',
    themeColor: '#ff70a6',
    bgGradient: 'rgba(74, 10, 56, 0.5)',
    accent: '#ff70a6',
    iconName: 'star',
    description: 'The Weeknd, Dua Lipa & Bruno Mars',
  },
  nineties_twothousands: {
    name: '90s & 2000s Hits',
    shortName: 'Throwbacks',
    plays: '1.8M',
    tag: 'Nostalgia',
    themeColor: '#e1dfff',
    bgGradient: 'rgba(59, 7, 100, 0.5)',
    accent: '#e1dfff',
    iconName: 'disc',
    description: 'Usher, Beyonce, Akon & 50 Cent',
  },
  rock_classics: {
    name: 'Rock & Anthems',
    shortName: 'Rock',
    plays: '1.1M',
    tag: 'Legends',
    themeColor: '#e2e8f0',
    bgGradient: 'rgba(30, 41, 59, 0.5)',
    accent: '#e2e8f0',
    iconName: 'zap',
    description: 'Queen, Nirvana & Linkin Park',
  },
  general: {
    name: 'Random Mega Mix',
    shortName: 'Mega Mix',
    plays: '5.2M',
    tag: 'Shuffle',
    themeColor: '#c0c1ff',
    bgGradient: 'rgba(30, 27, 46, 0.5)',
    accent: '#c0c1ff',
    iconName: 'music',
    description: 'Surprise shuffle across all genres',
  },
};
