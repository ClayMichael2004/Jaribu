import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { COLORS, DIFFICULTIES, GENRE_METADATA, AVATAR_EMOJIS, AVATAR_COLORS } from '../constants/theme';
import { getCategories, searchArtists } from '../config/api';
import { audioManager } from '../utils/audio';
import { Icon } from '../components/Icons';

const POPULAR_ARTISTS = [
  { name: 'Wakadinali', genre: 'Gengetone / Drill', color: '#4edea3' },
  { name: 'Sauti Sol', genre: 'Afropop', color: '#ffb95f' },
  { name: 'Nyashinski', genre: 'Kenyan Hip-Hop', color: '#c0c1ff' },
  { name: 'Bien', genre: 'Afropop', color: '#70d6ff' },
  { name: 'Burna Boy', genre: 'Afrobeats', color: '#ffb95f' },
  { name: 'Wizkid', genre: 'Afrobeats', color: '#e1dfff' },
  { name: 'Bob Marley', genre: 'Reggae', color: '#4edea3' },
  { name: 'Chronixx', genre: 'Roots Reggae', color: '#ffb95f' },
  { name: 'Vybz Kartel', genre: 'Dancehall', color: '#6ffbbe' },
  { name: 'Mercy Chinwo', genre: 'Gospel', color: '#70d6ff' },
  { name: 'Drake', genre: 'Hip-Hop', color: '#ff5449' },
  { name: 'The Weeknd', genre: 'Pop / R&B', color: '#ff70a6' },
];

const PRESET_ROUNDS = [2, 3, 5, 10, 15, 20];

export default function PassPlaySetupScreen({
  initialCategory = 'kenyan',
  initialDifficulty = 'medium',
  initialRounds = 3,
  playerName = 'Clay',
  avatarEmoji = '🎧',
  avatarColor = '#c0c1ff',
  onStartGame,
  onBack,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Categories & Search
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedDifficulty, setSelectedDifficulty] = useState(initialDifficulty);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(initialRounds);
  const [activeModeTab, setActiveModeTab] = useState('genres'); // 'genres' | 'artists'

  // Artist Spotlight
  const [selectedArtist, setSelectedArtist] = useState({ name: 'Wakadinali', genre: 'Gengetone' });
  const [artistQuery, setArtistQuery] = useState('');
  const [artistResults, setArtistResults] = useState([]);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const searchTimerRef = useRef(null);

  // Players State (Defaults Player 1 to user's saved profile name)
  const [players, setPlayers] = useState([
    {
      id: 'p1',
      name: playerName || 'Clay',
      avatarEmoji: avatarEmoji || '🎧',
      avatarColor: avatarColor || '#c0c1ff',
      isHost: true,
    },
    {
      id: 'p2',
      name: 'Player 2',
      avatarEmoji: '⚡',
      avatarColor: '#ffb95f',
      isHost: false,
    },
  ]);

  useEffect(() => {
    loadCategoryData();
  }, []);

  // Sync Player 1 if profile prop updates
  useEffect(() => {
    setPlayers((prev) => {
      const updated = [...prev];
      if (updated[0]) {
        updated[0] = {
          ...updated[0],
          name: playerName || updated[0].name || 'Clay',
          avatarEmoji: avatarEmoji || updated[0].avatarEmoji || '🎧',
          avatarColor: avatarColor || updated[0].avatarColor || '#c0c1ff',
        };
      }
      return updated;
    });
  }, [playerName, avatarEmoji, avatarColor]);

  const loadCategoryData = async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      const list = data.categories || [];
      if (list.length > 0) {
        setCategories(list);
      } else {
        const fallbacks = Object.keys(GENRE_METADATA).map((k) => ({
          id: k,
          name: GENRE_METADATA[k].name,
          subtitle: GENRE_METADATA[k].subtitle,
          sample_artists: GENRE_METADATA[k].sampleArtists,
          color: GENRE_METADATA[k].color,
        }));
        setCategories(fallbacks);
      }
    } catch (e) {
      console.warn('Failed to load categories for multiplayer setup:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArtistSearch = (text) => {
    setArtistQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text || text.trim().length < 2) {
      setArtistResults([]);
      setIsSearchingArtist(false);
      return;
    }
    setIsSearchingArtist(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchArtists(text.trim());
        setArtistResults(res.artists || []);
      } catch (err) {
        setArtistResults([]);
      } finally {
        setIsSearchingArtist(false);
      }
    }, 300);
  };

  const handleIncrementRounds = () => {
    audioManager.playClick();
    setRoundsPerPlayer((prev) => Math.min(50, prev + 1));
  };

  const handleDecrementRounds = () => {
    audioManager.playClick();
    setRoundsPerPlayer((prev) => Math.max(1, prev - 1));
  };

  const addPlayer = () => {
    if (players.length >= 8) return;
    audioManager.playClick();
    const nextNum = players.length + 1;
    const defaultColor = AVATAR_COLORS[(nextNum - 1) % AVATAR_COLORS.length];
    const defaultEmoji = AVATAR_EMOJIS[(nextNum - 1) % AVATAR_EMOJIS.length];

    setPlayers([
      ...players,
      {
        id: Date.now().toString(),
        name: `Player ${nextNum}`,
        avatarEmoji: defaultEmoji,
        avatarColor: defaultColor,
        isHost: false,
      },
    ]);
  };

  const removePlayer = (index) => {
    if (players.length <= 2) return;
    audioManager.playClick();
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayerName = (index, newName) => {
    setPlayers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: newName };
      return copy;
    });
  };

  const updatePlayerEmoji = (index, emoji) => {
    audioManager.playClick();
    setPlayers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], avatarEmoji: emoji };
      return copy;
    });
  };

  const updatePlayerColor = (index, color) => {
    audioManager.playClick();
    setPlayers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], avatarColor: color };
      return copy;
    });
  };

  const handleStartMatch = () => {
    audioManager.playClick();
    let finalCategory = selectedCategory;
    if (activeModeTab === 'artists') {
      const artistToUse = selectedArtist?.name || artistQuery.trim() || 'Wakadinali';
      finalCategory = `artist:${artistToUse}`;
    }

    if (onStartGame) {
      onStartGame({
        players,
        category: finalCategory,
        difficulty: selectedDifficulty,
        roundsPerPlayer,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>PASS & PLAY MULTIPLAYER</Text>
          <Text style={styles.headerSubtitle}>
            {players.length} Players • {roundsPerPlayer} Rounds/Player • {players.length * roundsPerPlayer} Total Turns
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Switcher Tabs: BROWSE GENRES vs ARTIST SPOTLIGHT */}
        <View style={styles.modeTabsWrapper}>
          <View style={styles.modeTabsContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                audioManager.playClick();
                setActiveModeTab('genres');
              }}
              style={[
                styles.modeTab,
                activeModeTab === 'genres' && styles.modeTabActive,
              ]}
            >
              <Icon
                name="disc"
                size={14}
                color={activeModeTab === 'genres' ? COLORS.primaryLight : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeModeTab === 'genres' && styles.modeTabTextActive,
                ]}
              >
                BROWSE GENRES
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                audioManager.playClick();
                setActiveModeTab('artists');
              }}
              style={[
                styles.modeTab,
                activeModeTab === 'artists' && styles.modeTabActive,
              ]}
            >
              <Icon
                name="mic"
                size={14}
                color={activeModeTab === 'artists' ? COLORS.secondary : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeModeTab === 'artists' && styles.modeTabTextActiveSecondary,
                ]}
              >
                ARTIST SPOTLIGHT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab 1: Browse Genres Grid */}
        {activeModeTab === 'genres' && (
          <View style={styles.genresSection}>
            <Text style={styles.subHeading}>SELECT MULTIPLAYER VIBE</Text>
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
            ) : (
              <View style={[styles.genreGrid, isDesktop && styles.genreGridDesktop]}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const meta = GENRE_METADATA[cat.id] || {
                    plays: '1.2M',
                    accent: COLORS.primary,
                    themeColor: COLORS.primary,
                    bgGradient: 'rgba(32, 31, 31, 0.6)',
                    iconName: 'music',
                    description: cat.subtitle,
                  };

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.85}
                      onPress={() => {
                        audioManager.playClick();
                        setSelectedCategory(cat.id);
                      }}
                      style={[
                        styles.categoryCard,
                        { borderColor: isSelected ? meta.themeColor : 'rgba(255, 255, 255, 0.08)' },
                        isSelected && {
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          shadowColor: meta.themeColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.35,
                          shadowRadius: 16,
                          transform: [{ scale: 1.02 }],
                        },
                      ]}
                    >
                      {/* Luxury Visual Art Box (No dumb emojis - sleek vinyl tile) */}
                      <View
                        style={[
                          styles.categoryArtBox,
                          { backgroundColor: meta.bgGradient },
                        ]}
                      >
                        {/* Concentric subtle groove */}
                        <View style={[styles.artGrooveOuter, { borderColor: `${meta.themeColor}33` }]}>
                          <View style={[styles.artGrooveCenter, { backgroundColor: `${meta.themeColor}22` }]}>
                            <Icon name={meta.iconName || 'disc'} size={28} color={meta.themeColor} />
                          </View>
                        </View>

                        {/* Top Right Tag */}
                        {meta.tag && (
                          <View style={[styles.genreTagPill, { backgroundColor: `${meta.themeColor}25`, borderColor: `${meta.themeColor}55` }]}>
                            <Text style={[styles.genreTagText, { color: meta.themeColor }]}>{meta.tag}</Text>
                          </View>
                        )}
                        
                        {/* Play Count Badge */}
                        <View style={styles.playBadge}>
                          <Icon name="play" size={8} color={COLORS.text} style={{ marginRight: 4 }} />
                          <Text style={styles.playBadgeText}>{meta.plays}</Text>
                        </View>
                      </View>

                      {/* Title & Info */}
                      <View style={styles.categoryInfo}>
                        <Text
                          style={[
                            styles.categoryName,
                            isSelected && { color: meta.themeColor },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                        <Text style={styles.categorySub} numberOfLines={1}>
                          {cat.subtitle || meta.description || 'Top Hits'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Tab 2: Artist Spotlight Search */}
        {activeModeTab === 'artists' && (
          <View style={styles.artistSection}>
            <Text style={styles.subHeading}>SEARCH SPOTLIGHT ARTIST</Text>
            <View style={styles.searchBarWrapper}>
              <Icon name="search" size={18} color={COLORS.textSecondary} style={{ marginLeft: 14 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Type artist name (e.g. Wakadinali, Burna Boy, Sauti Sol)..."
                placeholderTextColor={COLORS.textMuted}
                value={artistQuery}
                onChangeText={handleArtistSearch}
              />
              {isSearchingArtist && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 14 }} />}
            </View>

            {selectedArtist && (
              <View style={styles.selectedArtistBanner}>
                <View style={styles.selectedArtistLeft}>
                  {selectedArtist.picture ? (
                    <Image source={{ uri: selectedArtist.picture }} style={styles.artistAvatarImage} />
                  ) : (
                    <View style={styles.artistAvatarCircle}>
                      <Icon name="mic" size={20} color={COLORS.secondary} />
                    </View>
                  )}
                  <View>
                    <Text style={styles.selectedArtistName}>{selectedArtist.name}</Text>
                    <Text style={styles.selectedArtistTag}>Spotlight Battle Artist</Text>
                  </View>
                </View>
              </View>
            )}

            {artistResults.length > 0 && (
              <View style={styles.artistResultsList}>
                <Text style={styles.subHeading}>SEARCH CANDIDATES</Text>
                {artistResults.map((artist) => (
                  <TouchableOpacity
                    key={artist.id || artist.name}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedArtist(artist);
                    }}
                    style={[
                      styles.artistResultItem,
                      selectedArtist?.name === artist.name && styles.artistResultItemActive,
                    ]}
                  >
                    <Text style={styles.artistResultName}>{artist.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.subHeading, { marginTop: 16 }]}>TRENDING ARTISTS</Text>
            <View style={styles.artistChipsRow}>
              {POPULAR_ARTISTS.map((artist) => {
                const isSelected = selectedArtist?.name === artist.name;
                return (
                  <TouchableOpacity
                    key={artist.name}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedArtist(artist);
                    }}
                    style={[styles.artistChip, isSelected && styles.artistChipActive]}
                  >
                    <Text style={[styles.artistChipName, isSelected && styles.artistChipNameActive]}>
                      {artist.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Controls Section: Difficulty & Number of Rounds Stepper */}
        <View style={styles.controlsSection}>
          {/* Difficulty Selector */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlGroupTitle}>SELECT DIFFICULTY</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <TouchableOpacity
                    key={diff.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedDifficulty(diff.id);
                    }}
                    style={[
                      styles.diffCard,
                      isSelected && { borderColor: diff.color, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    ]}
                  >
                    <Icon name={diff.iconName || 'disc'} size={20} color={diff.color} style={{ marginBottom: 6 }} />
                    <Text style={[styles.diffName, isSelected && { color: diff.color }]}>{diff.name}</Text>
                    <Text style={styles.diffSnippet}>{diff.snippetSec}s snippet</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Number of Rounds Stepper + Presets */}
          <View style={styles.controlGroup}>
            <View style={styles.roundsHeaderRow}>
              <Text style={styles.controlGroupTitle}>NUMBER OF ROUNDS PER PLAYER</Text>
              <Text style={styles.customRoundsCountBadge}>
                {roundsPerPlayer} {roundsPerPlayer === 1 ? 'ROUND' : 'ROUNDS'} / PLAYER
              </Text>
            </View>

            <View style={styles.stepperContainer}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleDecrementRounds}
                style={styles.stepperButton}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>

              <View style={styles.stepperDisplay}>
                <Text style={styles.stepperNumberText}>{roundsPerPlayer}</Text>
                <Text style={styles.stepperLabelText}>
                  {players.length * roundsPerPlayer} TOTAL TURNS
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleIncrementRounds}
                style={styles.stepperButton}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.roundsRow}>
              {PRESET_ROUNDS.map((r) => {
                const isActive = roundsPerPlayer === r;
                return (
                  <TouchableOpacity
                    key={r}
                    activeOpacity={0.8}
                    onPress={() => {
                      audioManager.playClick();
                      setRoundsPerPlayer(r);
                    }}
                    style={[styles.roundPill, isActive && styles.roundPillActive]}
                  >
                    <Text style={[styles.roundText, isActive && styles.roundTextActive]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Players In Match Section */}
        <View style={styles.playersSection}>
          <View style={styles.playersSectionHeader}>
            <Text style={styles.controlGroupTitle}>PLAYERS IN MATCH ({players.length}/8)</Text>
            {players.length < 8 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={addPlayer}
                style={styles.addPlayerMiniBtn}
              >
                <Icon name="plus" size={12} color={COLORS.secondary} style={{ marginRight: 4 }} />
                <Text style={styles.addPlayerMiniText}>ADD PLAYER</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.playersList}>
            {players.map((player, index) => (
              <View key={player.id || index} style={styles.playerCard}>
                <View style={styles.playerCardTop}>
                  <View style={[styles.playerAvatarCircle, { borderColor: player.avatarColor }]}>
                    <Text style={styles.playerAvatarEmoji}>{player.avatarEmoji}</Text>
                  </View>

                  <View style={styles.playerInputWrapper}>
                    <Text style={styles.playerLabel}>
                      {player.isHost ? 'HOST / PLAYER 1' : `PLAYER ${index + 1}`}
                    </Text>
                    <TextInput
                      style={styles.playerNameInput}
                      value={player.name}
                      onChangeText={(val) => updatePlayerName(index, val)}
                      placeholder={`Player ${index + 1}`}
                      placeholderTextColor={COLORS.textMuted}
                      maxLength={18}
                    />
                  </View>

                  {players.length > 2 && !player.isHost && (
                    <TouchableOpacity
                      onPress={() => removePlayer(index)}
                      style={styles.removePlayerBtn}
                    >
                      <Icon name="trash" size={14} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Emoji Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiPickerScroll}>
                  <View style={styles.emojiPickerRow}>
                    {AVATAR_EMOJIS.map((emoji) => {
                      const isEmojiActive = player.avatarEmoji === emoji;
                      return (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => updatePlayerEmoji(index, emoji)}
                          style={[styles.emojiPill, isEmojiActive && styles.emojiPillActive]}
                        >
                          <Text style={{ fontSize: 14 }}>{emoji}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Color Swatches */}
                <View style={styles.colorSwatchesRow}>
                  {AVATAR_COLORS.map((color) => {
                    const isColorActive = player.avatarColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        onPress={() => updatePlayerColor(index, color)}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: color },
                          isColorActive && styles.colorSwatchActive,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Floating Launch Button */}
        <View style={styles.launchButtonContainer}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleStartMatch}
            style={styles.launchButton}
          >
            <Icon name="users" size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
            <Text style={styles.launchButtonText}>
              START MULTIPLAYER ({players.length} PLAYERS • {roundsPerPlayer * players.length} TURNS)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.primaryLight,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: 40,
    paddingTop: 28,
  },
  modeTabsWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modeTabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 9999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    maxWidth: 440,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
  },
  modeTabActive: {
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.3)',
  },
  modeTabText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modeTabTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '900',
  },
  modeTabTextActiveSecondary: {
    color: COLORS.secondary,
    fontWeight: '900',
  },
  genresSection: {
    marginBottom: 24,
  },
  subHeading: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  genreGridDesktop: {
    gap: 18,
  },
  categoryCard: {
    flex: 1,
    minWidth: '46%',
    maxWidth: '48.5%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 12,
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
    }),
  },
  categoryArtBox: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  artGrooveOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artGrooveCenter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreTagPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  genreTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  playBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 19, 19, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  playBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },
  categoryInfo: {
    paddingHorizontal: 2,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  categorySub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  artistSection: {
    marginBottom: 24,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  selectedArtistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    padding: 14,
    marginBottom: 14,
  },
  selectedArtistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  artistAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  artistAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedArtistName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  selectedArtistTag: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  artistChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  artistChip: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  artistChipActive: {
    borderColor: COLORS.secondary,
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
  },
  artistChipName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  artistChipNameActive: {
    color: COLORS.secondary,
    fontWeight: '800',
  },
  artistResultsList: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  artistResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  artistResultItemActive: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
  },
  artistResultName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  controlsSection: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  controlGroup: {
    marginBottom: 18,
  },
  controlGroupTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  diffCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  diffName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  diffSnippet: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  roundsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customRoundsCountBadge: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 193, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: COLORS.primaryLight,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  stepperDisplay: {
    alignItems: 'center',
  },
  stepperNumberText: {
    color: COLORS.secondary,
    fontSize: 28,
    fontWeight: '900',
  },
  stepperLabelText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roundPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  roundPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
  },
  roundText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  roundTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '900',
  },
  playersSection: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  playersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addPlayerMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addPlayerMiniText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  playersList: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  playerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  playerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  playerAvatarEmoji: {
    fontSize: 20,
  },
  playerInputWrapper: {
    flex: 1,
  },
  playerLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  playerNameInput: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  removePlayerBtn: {
    padding: 8,
  },
  emojiPickerScroll: {
    marginBottom: 8,
  },
  emojiPickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  emojiPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  emojiPillActive: {
    backgroundColor: 'rgba(192, 193, 255, 0.25)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  colorSwatchesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorSwatchActive: {
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ scale: 1.15 }],
  },
  launchButtonContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  launchButton: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  launchButtonText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
