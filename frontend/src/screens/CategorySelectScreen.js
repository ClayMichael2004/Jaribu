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
import { COLORS, DIFFICULTIES, GENRE_METADATA } from '../constants/theme';
import { getCategories, searchArtists } from '../config/api';
import { audioManager } from '../utils/audio';
import TopHeader from '../components/TopHeader';
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

const PRESET_ROUNDS = [3, 5, 10, 15, 20];

export default function CategorySelectScreen({
  initialCategory = 'kenyan',
  initialDifficulty = 'medium',
  initialRounds = 5,
  initialGameMode = 'solo',
  onStartGame,
  onStartPassPlaySetup,
  onBack,
  onOpenSettings,
  onSelectTab,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedDifficulty, setSelectedDifficulty] = useState(initialDifficulty);
  const [selectedRounds, setSelectedRounds] = useState(initialRounds);
  const [selectedGameMode, setSelectedGameMode] = useState(initialGameMode); // 'solo' | 'multiplayer'
  const [activeModeTab, setActiveModeTab] = useState('genres'); // 'genres' | 'artists'
  
  // Artist Spotlight state
  const [selectedArtist, setSelectedArtist] = useState({ name: 'Wakadinali', genre: 'Gengetone' });
  const [artistQuery, setArtistQuery] = useState('');
  const [artistResults, setArtistResults] = useState([]);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const searchTimerRef = useRef(null);

  useEffect(() => {
    loadCategoryData();
  }, []);

  const DEFAULT_GENRES = [
    { id: 'kenyan', name: 'Kenyan Hits', subtitle: 'Gengetone & Benga' },
    { id: 'afrobeats', name: 'Afrobeats & Amapiano', subtitle: 'Burna, Asake, Tyla' },
    { id: 'reggae', name: 'Reggae & Roots', subtitle: 'Bob Marley, Chronixx' },
    { id: 'gospel', name: 'Gospel & Worship', subtitle: 'Mercy Chinwo, Sinach' },
    { id: 'hiphop', name: 'Hip-Hop & Trap', subtitle: 'Kendrick, Drake, Travis' },
    { id: 'dancehall', name: 'Dancehall & Riddims', subtitle: 'Vybz Kartel, Popcaan' },
    { id: 'pop', name: 'Billboard Pop Hits', subtitle: 'The Weeknd, Dua Lipa' },
    { id: 'nineties_twothousands', name: '90s & 2000s Hits', subtitle: 'Usher, Beyonce, Akon' },
    { id: 'rock_classics', name: 'Rock & Anthems', subtitle: 'Queen, Nirvana' },
    { id: 'general', name: 'Random Mega Mix', subtitle: 'Surprise shuffle' },
  ];

  const loadCategoryData = async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      const list = Array.isArray(data) ? data : (data?.categories || []);
      if (Array.isArray(list) && list.length > 0) {
        setCategories(list);
      } else {
        setCategories(DEFAULT_GENRES);
      }
    } catch (e) {
      setCategories(DEFAULT_GENRES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArtistSearch = (text) => {
    setArtistQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text.trim()) {
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
    setSelectedRounds((prev) => Math.min(50, prev + 1));
  };

  const handleDecrementRounds = () => {
    audioManager.playClick();
    setSelectedRounds((prev) => Math.max(1, prev - 1));
  };

  const handleLaunch = () => {
    audioManager.playClick();
    let finalCategory = selectedCategory;

    if (activeModeTab === 'artists') {
      const artistToUse = selectedArtist?.name || artistQuery.trim() || 'Wakadinali';
      finalCategory = `artist:${artistToUse}`;
    }

    if (selectedGameMode === 'multiplayer' && onStartPassPlaySetup) {
      onStartPassPlaySetup({
        category: finalCategory,
        difficulty: selectedDifficulty,
        totalRounds: selectedRounds,
      });
    } else if (onStartGame) {
      onStartGame({
        category: finalCategory,
        difficulty: selectedDifficulty,
        totalRounds: selectedRounds,
      });
    }
  };

  return (
    <View style={styles.container}>
      <TopHeader
        title="JARIBU"
        showBack={!!onBack}
        onBack={onBack}
        rightAction="settings"
        onRightAction={onOpenSettings}
        activeTab="CATEGORIES"
        onTabSelect={onSelectTab}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title Section (Matching Stitch UI) */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Choose Your Vibe</Text>
          <Text style={styles.headerSubtitle}>Select a genre or spotlight your favorite artist.</Text>

          {/* Genres / Artist Spotlight Mode Switch */}
          <View style={styles.tabSwitchContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                audioManager.playClick();
                setActiveModeTab('genres');
              }}
              style={[
                styles.modeTabButton,
                activeModeTab === 'genres' && styles.modeTabButtonActive,
              ]}
            >
              <Icon
                name="disc"
                size={14}
                color={activeModeTab === 'genres' ? COLORS.primaryLight : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeTabText, activeModeTab === 'genres' && styles.modeTabTextActive]}>
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
                styles.modeTabButton,
                activeModeTab === 'artists' && styles.modeTabButtonActive,
              ]}
            >
              <Icon
                name="mic"
                size={14}
                color={activeModeTab === 'artists' ? COLORS.secondary : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeTabText, activeModeTab === 'artists' && styles.modeTabTextActive]}>
                ARTIST SPOTLIGHT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeModeTab === 'genres' ? (
          /* Luxury Color-Coded Genre Cards Grid */
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Select Genre</Text>
            
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
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
                          {meta.description || cat.subtitle}
                        </Text>
                      </View>

                      {/* Selected Dot */}
                      {isSelected && (
                        <View style={[styles.selectedMarker, { backgroundColor: meta.themeColor }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* Artist Spotlight Search Section */
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Artist Spotlight Mode</Text>
            
            <View style={styles.artistSearchBox}>
              <Icon name="search" size={18} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.artistSearchInput}
                placeholder="Search any artist (e.g. Wakadinali, Sauti Sol, Burna Boy)..."
                placeholderTextColor={COLORS.textMuted}
                value={artistQuery}
                onChangeText={handleArtistSearch}
              />
              {isSearchingArtist && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>

            {/* Selected Artist Confirmation Card */}
            {selectedArtist && (
              <View style={styles.selectedArtistBanner}>
                <View style={styles.selectedArtistLeft}>
                  {selectedArtist.picture ? (
                    <Image
                      source={{ uri: selectedArtist.picture }}
                      style={styles.artistAvatarImage}
                    />
                  ) : (
                    <View style={styles.artistAvatarCircle}>
                      <Icon name="mic" size={20} color={COLORS.secondary} />
                    </View>
                  )}
                  <View>
                    <Text style={styles.selectedArtistName}>{selectedArtist.name}</Text>
                    <Text style={styles.selectedArtistTag}>
                      {selectedArtist.nb_fans ? `${Number(selectedArtist.nb_fans).toLocaleString()} Listeners • ` : ''}
                      Ready for Spotlight Quiz
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleLaunch}
                  style={styles.quickLaunchBtn}
                >
                  <Text style={styles.quickLaunchText}>PLAY SPOTLIGHT ▶</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search Results */}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {artist.picture ? (
                        <Image source={{ uri: artist.picture }} style={styles.resultAvatarImage} />
                      ) : (
                        <View style={styles.resultAvatarCircle}>
                          <Icon name="mic" size={14} color={COLORS.text} />
                        </View>
                      )}
                      <View>
                        <Text style={styles.artistResultName}>{artist.name}</Text>
                        {artist.nb_fans ? (
                          <Text style={styles.artistFansText}>
                            {Number(artist.nb_fans).toLocaleString()} listeners
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.selectPill}>
                      <Text style={styles.artistSelectLabel}>SELECT</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Popular Artists Grid */}
            <Text style={[styles.subHeading, { marginTop: 22 }]}>TRENDING ARTISTS</Text>
            <View style={styles.artistChipsRow}>
              {POPULAR_ARTISTS.map((artist) => {
                const isPicked = selectedArtist?.name === artist.name;
                return (
                  <TouchableOpacity
                    key={artist.name}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedArtist(artist);
                    }}
                    style={[
                      styles.artistChip,
                      isPicked && styles.artistChipActive,
                    ]}
                  >
                    <Icon
                      name="mic"
                      size={12}
                      color={isPicked ? COLORS.secondary : COLORS.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.artistChipName, isPicked && styles.artistChipNameActive]}>
                      {artist.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Difficulty & Customizable Rounds Section */}
        <View style={styles.controlsSection}>
          {/* Difficulty Selection */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlGroupTitle}>SELECT DIFFICULTY</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <TouchableOpacity
                    key={diff.id}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedDifficulty(diff.id);
                    }}
                    style={[
                      styles.diffCard,
                      isSelected && { borderColor: diff.color, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    ]}
                  >
                    <Icon
                      name={diff.iconName || 'disc'}
                      size={20}
                      color={diff.color}
                      style={{ marginBottom: 6 }}
                    />
                    <Text style={[styles.diffName, isSelected && { color: diff.color }]}>
                      {diff.name}
                    </Text>
                    <Text style={styles.diffSnippet}>{diff.snippetSec}s snippet</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Fully Customizable Rounds Selection with Stepper + Quick Presets */}
          <View style={styles.controlGroup}>
            <View style={styles.roundsHeaderRow}>
              <Text style={styles.controlGroupTitle}>NUMBER OF ROUNDS</Text>
              <Text style={styles.customRoundsCountBadge}>
                {selectedRounds} {selectedRounds === 1 ? 'ROUND' : 'ROUNDS'}
              </Text>
            </View>

            {/* Stepper Control for Precise Customization (1 to 50 rounds) */}
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleDecrementRounds}
                style={styles.stepperButton}
                accessibilityLabel="Decrease Rounds"
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>

              <View style={styles.stepperDisplay}>
                <Text style={styles.stepperNumberText}>{selectedRounds}</Text>
                <Text style={styles.stepperLabelText}>TOTAL ROUNDS</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleIncrementRounds}
                style={styles.stepperButton}
                accessibilityLabel="Increase Rounds"
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Preset Pills */}
            <View style={styles.roundsRow}>
              {PRESET_ROUNDS.map((num) => {
                const isSelected = selectedRounds === num;
                return (
                  <TouchableOpacity
                    key={num}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedRounds(num);
                    }}
                    style={[
                      styles.roundPill,
                      isSelected && styles.roundPillActive,
                    ]}
                  >
                    <Text style={[styles.roundText, isSelected && styles.roundTextActive]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Game Mode Selector: SOLO RUSH vs MULTIPLAYER PASS & PLAY */}
        <View style={styles.gameModeSelectContainer}>
          <Text style={styles.controlGroupTitle}>SELECT GAME MODE</Text>
          <View style={styles.gameModeRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                audioManager.playClick();
                setSelectedGameMode('solo');
              }}
              style={[
                styles.gameModeBtn,
                selectedGameMode === 'solo' && styles.gameModeBtnActive,
              ]}
            >
              <Icon
                name="zap"
                size={14}
                color={selectedGameMode === 'solo' ? COLORS.primaryLight : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.gameModeText,
                  selectedGameMode === 'solo' && styles.gameModeTextActive,
                ]}
              >
                SOLO RUSH
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                audioManager.playClick();
                setSelectedGameMode('multiplayer');
              }}
              style={[
                styles.gameModeBtn,
                selectedGameMode === 'multiplayer' && styles.gameModeBtnActiveMulti,
              ]}
            >
              <Icon
                name="users"
                size={14}
                color={selectedGameMode === 'multiplayer' ? COLORS.secondary : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.gameModeText,
                  selectedGameMode === 'multiplayer' && styles.gameModeTextActiveMulti,
                ]}
              >
                MULTIPLAYER (PASS & PLAY)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Launch Game Button (Matching Stitch UI) */}
        <View style={styles.launchButtonContainer}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleLaunch}
            style={[
              styles.launchButton,
              selectedGameMode === 'multiplayer' && styles.launchButtonMultiplayer,
            ]}
          >
            <Icon
              name={selectedGameMode === 'multiplayer' ? 'users' : 'play'}
              size={16}
              color={selectedGameMode === 'multiplayer' ? COLORS.secondary : COLORS.primaryLight}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.launchButtonText,
                selectedGameMode === 'multiplayer' && { color: COLORS.secondary },
              ]}
            >
              {selectedGameMode === 'multiplayer'
                ? `SETUP MULTIPLAYER (${selectedRounds} ROUNDS)`
                : activeModeTab === 'artists'
                ? `START SPOTLIGHT: ${selectedArtist?.name || 'WAKADINALI'}`
                : `START SOLO (${selectedRounds} ROUNDS)`}
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: 40,
    paddingTop: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 9999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    maxWidth: 440,
  },
  modeTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
  },
  modeTabButtonActive: {
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.3)',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
  section: {
    marginBottom: 28,
  },
  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
    marginBottom: 16,
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
  selectedMarker: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  artistSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  artistSearchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedArtistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(192, 193, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  selectedArtistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  artistAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  artistAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedArtistName: {
    color: COLORS.primaryLight,
    fontSize: 16,
    fontWeight: '900',
  },
  selectedArtistTag: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  quickLaunchBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  quickLaunchText: {
    color: COLORS.onSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  artistResultsList: {
    marginTop: 16,
    gap: 8,
  },
  artistResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  artistResultItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(192, 193, 255, 0.12)',
  },
  resultAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  resultAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistResultName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  artistFansText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  selectPill: {
    backgroundColor: 'rgba(192, 193, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.3)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  artistSelectLabel: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '900',
  },
  subHeading: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  artistChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  artistChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
  controlsSection: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 28,
  },
  controlGroup: {
    marginBottom: 20,
  },
  roundsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  controlGroupTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
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
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
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
    letterSpacing: 1,
  },
  stepperLabelText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
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
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  gameModeSelectContainer: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  gameModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  gameModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  gameModeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
  },
  gameModeBtnActiveMulti: {
    borderColor: COLORS.secondary,
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
  },
  gameModeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gameModeTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '900',
  },
  gameModeTextActiveMulti: {
    color: COLORS.secondary,
    fontWeight: '900',
  },
  launchButtonContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  launchButton: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  launchButtonMultiplayer: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    borderColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
  },
  launchButtonText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
