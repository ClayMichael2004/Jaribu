import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { COLORS, DIFFICULTIES } from '../constants/theme';
import { getCategories, searchArtists } from '../config/api';
import { audioManager } from '../utils/audio';

const POPULAR_ARTISTS = [
  { name: 'Wakadinali', flag: '🇰🇪', genre: 'Gengetone / Drill' },
  { name: 'Sauti Sol', flag: '🇰🇪', genre: 'Afropop' },
  { name: 'Nyashinski', flag: '🇰🇪', genre: 'Kenyan Hip-Hop' },
  { name: 'Bien', flag: '🇰🇪', genre: 'Afropop' },
  { name: 'Burna Boy', flag: '🌍', genre: 'Afrobeats' },
  { name: 'Wizkid', flag: '🌍', genre: 'Afrobeats' },
  { name: 'Bob Marley', flag: '🇯🇲', genre: 'Reggae' },
  { name: 'Chronixx', flag: '🇯🇲', genre: 'Roots Reggae' },
  { name: 'Vybz Kartel', flag: '🔊', genre: 'Dancehall' },
  { name: 'Popcaan', flag: '🔊', genre: 'Dancehall' },
  { name: 'Mercy Chinwo', flag: '🙏', genre: 'Gospel' },
  { name: 'Sinach', flag: '🙏', genre: 'Gospel Worship' },
  { name: 'Drake', flag: '🎤', genre: 'Hip-Hop' },
  { name: 'Kendrick Lamar', flag: '🎤', genre: 'Hip-Hop' },
  { name: 'The Weeknd', flag: '✨', genre: 'Pop / R&B' },
  { name: 'Taylor Swift', flag: '✨', genre: 'Pop' },
];

export default function HomeScreen({
  onStartSolo,
  onStartPassPlaySetup,
  onOpenLeaderboard,
}) {
  const [gameMode, setGameMode] = useState('solo'); // 'solo' | 'party'
  const [categoryTab, setCategoryTab] = useState('genres'); // 'genres' | 'artist_spotlight'
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedArtist, setSelectedArtist] = useState(null); // { name, picture, ... }
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [artistSearchResults, setArtistSearchResults] = useState([]);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [roundsPreset, setRoundsPreset] = useState(5); // 3, 5, 10, or 'custom'
  const [customRoundsInput, setCustomRoundsInput] = useState('7');
  const [playerName, setPlayerName] = useState('Player 1');
  const [playerEmoji, setPlayerEmoji] = useState('🦁');
  const [playerColor, setPlayerColor] = useState('#FF4B4B');
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const cats = await getCategories();
      setCategories(cats);
    } catch (e) {
      console.warn('Fallback categories loaded');
      setCategories([
        { id: 'general', name: 'Random Mega Mix', subtitle: 'Surprise shuffle across all genres', emoji: '🎲', isSpecial: true },
        { id: 'kenyan', name: 'Kenyan All-Stars', subtitle: 'Gengetone, Arbantone & Benga', emoji: '🇰🇪', isSpecial: true },
        { id: 'afrobeats', name: 'Afrobeats & Amapiano', subtitle: 'Burna, Asake, Tyla & Rema', emoji: '🌍' },
        { id: 'reggae', name: 'Reggae & Roots', subtitle: 'Bob Marley, Chronixx & Lucky Dube', emoji: '🇯🇲' },
        { id: 'dancehall', name: 'Dancehall & Riddims', subtitle: 'Vybz Kartel, Popcaan & Sean Paul', emoji: '🔊' },
        { id: 'gospel', name: 'Gospel & Worship', subtitle: 'Mercy Chinwo, Sinach & Kirk Franklin', emoji: '🙏' },
        { id: 'hiphop', name: 'Hip-Hop & Trap', subtitle: 'Kendrick, Drake, Travis & 2Pac', emoji: '🎤' },
        { id: 'pop', name: 'Billboard Pop Hits', subtitle: 'The Weeknd, Dua Lipa & Bruno', emoji: '🌟' },
        { id: 'nineties_twothousands', name: '90s & 2000s Throwbacks', subtitle: 'Usher, Beyonce, Akon & 50 Cent', emoji: '📼' },
        { id: 'rock_classics', name: 'Rock & Legendary Anthems', subtitle: 'Queen, Nirvana & Linkin Park', emoji: '🎸' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArtistSearch = (text) => {
    setArtistSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!text.trim()) {
      setArtistSearchResults([]);
      setIsSearchingArtist(false);
      return;
    }

    setIsSearchingArtist(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchArtists(text.trim());
        setArtistSearchResults(res.artists || []);
      } catch (err) {
        console.warn('Artist search error:', err);
      } finally {
        setIsSearchingArtist(false);
      }
    }, 350);
  };

  const handleSelectArtist = (artist) => {
    audioManager.unlockAudio();
    audioManager.playClick();
    setSelectedArtist(artist);
    setArtistSearchQuery('');
    setArtistSearchResults([]);
  };

  const getEffectiveTotalRounds = () => {
    if (roundsPreset === 'custom') {
      const parsed = parseInt(customRoundsInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
        return parsed;
      }
      return 7;
    }
    return roundsPreset;
  };

  const handleStartGame = () => {
    audioManager.unlockAudio();
    audioManager.playClick();

    let categoryToUse = selectedCategory;
    if (categoryTab === 'artist_spotlight' && selectedArtist) {
      categoryToUse = `artist:${selectedArtist.name}`;
    }

    const rounds = getEffectiveTotalRounds();

    if (gameMode === 'solo') {
      onStartSolo({
        category: categoryToUse,
        difficulty: selectedDifficulty,
        totalRounds: rounds,
        playerName: playerName.trim() || 'Player 1',
        avatarEmoji: playerEmoji,
        avatarColor: playerColor,
      });
    } else {
      onStartPassPlaySetup({
        category: categoryToUse,
        difficulty: selectedDifficulty,
        totalRounds: rounds,
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top App Header */}
      <View style={styles.topHeader}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>🎵</Text>
          </View>
          <View>
            <Text style={styles.appTitle}>Jaribu</Text>
            <Text style={styles.appSubtitle}>Song Snippet Quiz</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.recordsBtn}
          onPress={() => {
            audioManager.unlockAudio();
            audioManager.playClick();
            onOpenLeaderboard();
          }}
        >
          <Text style={styles.recordsIcon}>🏆</Text>
          <Text style={styles.recordsText}>Records</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 1: CHOOSE GAME MODE */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>1. CHOOSE GAME MODE</Text>
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, gameMode === 'solo' && styles.modeToggleBtnActive]}
            onPress={() => {
              audioManager.unlockAudio();
              audioManager.playClick();
              setGameMode('solo');
            }}
          >
            <Text style={styles.modeBtnEmoji}>⚡</Text>
            <View style={styles.modeBtnInfo}>
              <Text style={[styles.modeBtnTitle, gameMode === 'solo' && styles.modeBtnTitleActive]}>
                Solo Rush
              </Text>
              <Text style={styles.modeBtnSub}>Beat the clock & climb rankings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeToggleBtn, gameMode === 'party' && styles.modeToggleBtnActive]}
            onPress={() => {
              audioManager.unlockAudio();
              audioManager.playClick();
              setGameMode('party');
            }}
          >
            <Text style={styles.modeBtnEmoji}>👥</Text>
            <View style={styles.modeBtnInfo}>
              <Text style={[styles.modeBtnTitle, gameMode === 'party' && styles.modeBtnTitleActive]}>
                Pass & Play
              </Text>
              <Text style={styles.modeBtnSub}>Party multiplayer for 2-6 players</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Solo Player Profile Name */}
        {gameMode === 'solo' && (
          <View style={styles.soloProfileBox}>
            <Text style={styles.soloProfileLabel}>YOUR PLAYER NICKNAME:</Text>
            <View style={styles.soloInputRow}>
              <View style={[styles.avatarMini, { backgroundColor: playerColor }]}>
                <Text style={styles.avatarMiniEmoji}>{playerEmoji}</Text>
              </View>
              <TextInput
                style={styles.soloNameInput}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Enter your name..."
                placeholderTextColor={COLORS.textMuted}
                maxLength={16}
              />
            </View>
          </View>
        )}
      </View>

      {/* SECTION 2: CHOOSE CATEGORY OR ARTIST SPOTLIGHT */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>2. MUSIC SELECTION</Text>
          {categoryTab === 'artist_spotlight' && selectedArtist && (
            <View style={styles.specialBadge}>
              <Text style={styles.specialBadgeText}>🎤 ARTIST MATCH</Text>
            </View>
          )}
        </View>

        {/* Category Mode Switcher Tabs */}
        <View style={styles.categoryTabBar}>
          <TouchableOpacity
            style={[styles.catTabBtn, categoryTab === 'genres' && styles.catTabBtnActive]}
            onPress={() => {
              audioManager.unlockAudio();
              audioManager.playClick();
              setCategoryTab('genres');
            }}
          >
            <Text style={[styles.catTabText, categoryTab === 'genres' && styles.catTabTextActive]}>
              🔥 Explore Genres & Mixes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catTabBtn, categoryTab === 'artist_spotlight' && styles.catTabBtnActive]}
            onPress={() => {
              audioManager.unlockAudio();
              audioManager.playClick();
              setCategoryTab('artist_spotlight');
            }}
          >
            <Text style={[styles.catTabText, categoryTab === 'artist_spotlight' && styles.catTabTextActive]}>
              🎤 Artist Spotlight
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: GENRES & ALL-STAR MIXES */}
        {categoryTab === 'genres' && (
          <>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 18 }} />
            ) : (
              <View style={styles.genreList}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.genreCard,
                        isSelected && styles.genreCardSelected,
                        cat.isSpecial && styles.genreCardSpecial,
                      ]}
                      onPress={() => {
                        audioManager.unlockAudio();
                        audioManager.playClick();
                        setSelectedCategory(cat.id);
                      }}
                    >
                      <View style={[styles.genreIconWrap, { backgroundColor: cat.color ? `${cat.color}22` : 'rgba(255, 75, 75, 0.12)' }]}>
                        <Text style={styles.genreEmoji}>{cat.emoji}</Text>
                      </View>
                      <View style={styles.genreInfo}>
                        <View style={styles.genreHeaderRow}>
                          <Text style={[styles.genreName, isSelected && styles.genreNameSelected]}>
                            {cat.name}
                          </Text>
                          {cat.id === 'general' && (
                            <View style={styles.allGenreTag}>
                              <Text style={styles.allGenreTagText}>ALL GENRES</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.genreSub} numberOfLines={1}>
                          {cat.subtitle}
                        </Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* TAB 2: ARTIST SPOTLIGHT (SEARCH ANY ARTIST) */}
        {categoryTab === 'artist_spotlight' && (
          <View style={styles.artistSpotlightBox}>
            <Text style={styles.artistSpotlightSub}>
              Search and pick any artist. All game beats will be exclusively by or featuring them!
            </Text>

            {/* Currently Selected Artist Card */}
            {selectedArtist ? (
              <View style={styles.selectedArtistBanner}>
                {selectedArtist.picture ? (
                  <Image source={{ uri: selectedArtist.picture }} style={styles.selectedArtistImg} />
                ) : (
                  <View style={styles.selectedArtistAvatarFallback}>
                    <Text style={{ fontSize: 22 }}>🎤</Text>
                  </View>
                )}
                <View style={styles.selectedArtistInfo}>
                  <Text style={styles.selectedArtistLabel}>READY TO PLAY FOR:</Text>
                  <Text style={styles.selectedArtistName}>{selectedArtist.name}</Text>
                  <Text style={styles.selectedArtistMeta}>Solo hits, features & collaborations</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeArtistBtn}
                  onPress={() => {
                    audioManager.playClick();
                    setSelectedArtist(null);
                  }}
                >
                  <Text style={styles.changeArtistBtnText}>✕ CHANGE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Search Bar Input */}
                <View style={styles.searchBarWrap}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.artistSearchInput}
                    placeholder="Type artist name (e.g. Wakadinali, Drake, Sinach)..."
                    placeholderTextColor={COLORS.textMuted}
                    value={artistSearchQuery}
                    onChangeText={handleArtistSearch}
                    autoCapitalize="words"
                  />
                  {artistSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleArtistSearch('')}>
                      <Text style={styles.clearSearchText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Live Search Loading & Results */}
                {isSearchingArtist && (
                  <View style={styles.searchLoadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.searchLoadingText}>Searching artist catalog...</Text>
                  </View>
                )}

                {artistSearchResults.length > 0 && (
                  <View style={styles.searchResultsBox}>
                    <Text style={styles.searchSectionLabel}>SEARCH RESULTS:</Text>
                    {artistSearchResults.map((artist) => (
                      <TouchableOpacity
                        key={artist.id || artist.name}
                        style={styles.searchResultItem}
                        onPress={() => handleSelectArtist(artist)}
                      >
                        {artist.picture ? (
                          <Image source={{ uri: artist.picture }} style={styles.artistResultThumb} />
                        ) : (
                          <View style={styles.artistResultThumbFallback}>
                            <Text style={{ fontSize: 16 }}>🎤</Text>
                          </View>
                        )}
                        <View style={styles.artistResultInfo}>
                          <Text style={styles.artistResultName}>{artist.name}</Text>
                          {artist.nb_fans ? (
                            <Text style={styles.artistResultFans}>{artist.nb_fans.toLocaleString()} Fans</Text>
                          ) : null}
                        </View>
                        <View style={styles.selectArtistBadge}>
                          <Text style={styles.selectArtistBadgeText}>PLAY ▶</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Quick Select Popular Artists */}
                <Text style={styles.quickSelectHeader}>OR CHOOSE A POPULAR ARTIST:</Text>
                <View style={styles.popularGrid}>
                  {POPULAR_ARTISTS.map((item) => (
                    <TouchableOpacity
                      key={item.name}
                      style={styles.popularArtistChip}
                      onPress={() => handleSelectArtist({ name: item.name })}
                    >
                      <Text style={styles.popularFlag}>{item.flag}</Text>
                      <View>
                        <Text style={styles.popularName}>{item.name}</Text>
                        <Text style={styles.popularGenre}>{item.genre}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* SECTION 3: DIFFICULTY & CUSTOM ROUNDS */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>3. DIFFICULTY & ROUNDS</Text>

        {/* Difficulty Selector */}
        <View style={styles.diffSelectorRow}>
          {DIFFICULTIES.map((diff) => {
            const isSelected = selectedDifficulty === diff.id;
            return (
              <TouchableOpacity
                key={diff.id}
                style={[styles.diffBtn, isSelected && styles.diffBtnActive]}
                onPress={() => {
                  audioManager.unlockAudio();
                  audioManager.playClick();
                  setSelectedDifficulty(diff.id);
                }}
              >
                <Text style={styles.diffEmoji}>{diff.emoji}</Text>
                <Text style={[styles.diffName, isSelected && styles.diffNameActive]}>
                  {diff.name}
                </Text>
                <Text style={styles.diffSec}>{diff.snippetSec}s snippet</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rounds Selector with Presets & Custom Input */}
        <Text style={styles.roundsLabel}>SELECT NUMBER OF ROUNDS:</Text>
        <View style={styles.roundsRow}>
          {[3, 5, 10].map((num) => {
            const isSelected = roundsPreset === num;
            return (
              <TouchableOpacity
                key={num}
                style={[styles.roundPill, isSelected && styles.roundPillActive]}
                onPress={() => {
                  audioManager.unlockAudio();
                  audioManager.playClick();
                  setRoundsPreset(num);
                }}
              >
                <Text style={[styles.roundPillText, isSelected && styles.roundPillTextActive]}>
                  {num} Rounds
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.roundPill, roundsPreset === 'custom' && styles.roundPillActive]}
            onPress={() => {
              audioManager.unlockAudio();
              audioManager.playClick();
              setRoundsPreset('custom');
            }}
          >
            <Text style={[styles.roundPillText, roundsPreset === 'custom' && styles.roundPillTextActive]}>
              ✏️ Custom
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Rounds Stepper / Numerical Box */}
        {roundsPreset === 'custom' && (
          <View style={styles.customRoundsBox}>
            <Text style={styles.customRoundsPrompt}>Enter Custom Rounds (1-50):</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => {
                  audioManager.playClick();
                  const val = Math.max(1, (parseInt(customRoundsInput, 10) || 1) - 1);
                  setCustomRoundsInput(val.toString());
                }}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.customRoundsInput}
                keyboardType="number-pad"
                value={customRoundsInput}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setCustomRoundsInput(cleaned);
                }}
                maxLength={2}
              />

              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => {
                  audioManager.playClick();
                  const val = Math.min(50, (parseInt(customRoundsInput, 10) || 1) + 1);
                  setCustomRoundsInput(val.toString());
                }}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.roundsUnitText}>Rounds</Text>
            </View>
          </View>
        )}
      </View>

      {/* BIG PRIMARY START BUTTON */}
      <TouchableOpacity
        style={styles.mainStartBtn}
        onPress={handleStartGame}
      >
        <Text style={styles.mainStartBtnText}>
          {gameMode === 'solo'
            ? `START SOLO RUSH (${getEffectiveTotalRounds()} ROUNDS) 🚀`
            : `SETUP PASS & PLAY PARTY (${getEffectiveTotalRounds()} ROUNDS) 👥`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 550,
    width: '100%',
    alignSelf: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoEmoji: {
    fontSize: 22,
  },
  appTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  recordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  recordsIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  recordsText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  specialBadge: {
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  specialBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  modeToggleRow: {
    gap: 10,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  modeToggleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 75, 75, 0.12)',
  },
  modeBtnEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  modeBtnInfo: {
    flex: 1,
  },
  modeBtnTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  modeBtnTitleActive: {
    color: COLORS.primary,
  },
  modeBtnSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  soloProfileBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  soloProfileLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  soloInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarMiniEmoji: {
    fontSize: 16,
  },
  soloNameInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
  },
  categoryTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  catTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  catTabBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  catTabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  catTabTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
  genreList: {
    gap: 8,
  },
  genreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  genreCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  genreCardSpecial: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  genreIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  genreEmoji: {
    fontSize: 18,
  },
  genreInfo: {
    flex: 1,
  },
  genreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genreName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  genreNameSelected: {
    color: COLORS.primary,
  },
  allGenreTag: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#EC4899',
  },
  allGenreTagText: {
    color: '#EC4899',
    fontSize: 8,
    fontWeight: '900',
  },
  genreSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  artistSpotlightBox: {
    marginTop: 2,
  },
  artistSpotlightSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  selectedArtistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  selectedArtistImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  selectedArtistAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedArtistInfo: {
    flex: 1,
  },
  selectedArtistLabel: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectedArtistName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
  },
  selectedArtistMeta: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  changeArtistBtn: {
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  changeArtistBtnText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  artistSearchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    padding: 0,
  },
  clearSearchText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  searchLoadingText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  searchResultsBox: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 12,
    gap: 6,
  },
  searchSectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
    marginLeft: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  artistResultThumb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  artistResultThumbFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  artistResultInfo: {
    flex: 1,
  },
  artistResultName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  artistResultFans: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  selectArtistBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  selectArtistBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  quickSelectHeader: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  popularArtistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    width: '48.5%',
  },
  popularFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  popularName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  popularGenre: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  diffSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  diffBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  diffBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 75, 75, 0.12)',
  },
  diffEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  diffName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
  },
  diffNameActive: {
    color: COLORS.primary,
  },
  diffSec: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  roundsLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roundPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  roundPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 75, 75, 0.12)',
  },
  roundPillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  roundPillTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  customRoundsBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  customRoundsPrompt: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  stepperBtnText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  customRoundsInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    width: 55,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    padding: 0,
  },
  roundsUnitText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  mainStartBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  mainStartBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

