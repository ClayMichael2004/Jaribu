import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { getSoloGames, getMultiplayerGames, getMyRecords } from '../config/api';
import { audioManager } from '../utils/audio';
import TopHeader from '../components/TopHeader';
import { Icon } from '../components/Icons';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Vibes', iconName: 'music' },
  { id: 'kenyan', label: 'Kenyan Hits', iconName: 'disc' },
  { id: 'afrobeats', label: 'Afrobeats', iconName: 'flame' },
  { id: 'reggae', label: 'Reggae', iconName: 'headphones' },
  { id: 'gospel', label: 'Gospel', iconName: 'star' },
  { id: 'hiphop', label: 'Hip-Hop', iconName: 'zap' },
  { id: 'dancehall', label: 'Dancehall', iconName: 'mic' },
  { id: 'pop', label: 'Pop Hits', iconName: 'star' },
];

export default function LeaderboardScreen({
  defaultPlayerName = 'Clay',
  onBack,
  onOpenSettings,
  onSelectTab,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // View Mode: 'SOLO' | 'MULTIPLAYER'
  const [activeTab, setActiveTab] = useState('SOLO');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [soloGames, setSoloGames] = useState([]);
  const [multiplayerGames, setMultiplayerGames] = useState([]);
  const [userStats, setUserStats] = useState({
    highestScore: 0,
    totalAccumulatedScore: 0,
    totalGames: 0,
    bestStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGamesAndStats();
  }, [activeTab, selectedCategory, defaultPlayerName]);

  const loadGamesAndStats = async () => {
    try {
      setIsLoading(true);
      const catParam = selectedCategory === 'all' ? '' : selectedCategory;

      // 1. Fetch user's all-time stats & highest record from SQLite
      try {
        const stats = await getMyRecords(defaultPlayerName);
        setUserStats({
          highestScore: stats.highest_score || 0,
          totalAccumulatedScore: stats.total_accumulated_score || 0,
          totalGames: stats.total_games || 0,
          bestStreak: stats.best_streak || 0,
        });
      } catch (err) {
        console.warn('Personal stats error:', err);
      }

      // 2. Fetch all games for the selected mode
      if (activeTab === 'SOLO') {
        const games = await getSoloGames({ category: catParam, limit: 50 });
        setSoloGames(Array.isArray(games) ? games : []);
      } else {
        const matches = await getMultiplayerGames({ category: catParam, limit: 50 });
        setMultiplayerGames(Array.isArray(matches) ? matches : []);
      }
    } catch (e) {
      console.warn('Social records fetch error:', e);
      setSoloGames([]);
      setMultiplayerGames([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatRecordDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
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
        activeTab="LEADERBOARD"
        onTabSelect={onSelectTab}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Socials & Game Records</Text>
          <Text style={styles.headerSubtitle}>
            Live match archives, high scores, and multiplayer battle histories from SQLite.
          </Text>

          {/* 2 Main Game Mode Tabs: SOLO GAMES vs MULTIPLAYER MATCHES */}
          <View style={styles.modeTabsNav}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                audioManager.playClick();
                setActiveTab('SOLO');
              }}
              style={[
                styles.modeTabBtn,
                activeTab === 'SOLO' && styles.modeTabBtnActive,
              ]}
            >
              <Icon
                name="zap"
                size={14}
                color={activeTab === 'SOLO' ? COLORS.primaryLight : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeTab === 'SOLO' && styles.modeTabTextActive,
                ]}
              >
                SOLO GAMES
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                audioManager.playClick();
                setActiveTab('MULTIPLAYER');
              }}
              style={[
                styles.modeTabBtn,
                activeTab === 'MULTIPLAYER' && styles.modeTabBtnActiveMulti,
              ]}
            >
              <Icon
                name="users"
                size={14}
                color={activeTab === 'MULTIPLAYER' ? COLORS.secondary : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeTabText,
                  activeTab === 'MULTIPLAYER' && styles.modeTabTextActiveMulti,
                ]}
              >
                MULTIPLAYER MATCHES
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category Chips Filter: All Vibes, Kenyan Hits, Afrobeats, etc. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <View style={styles.categoryChipsRow}>
              {CATEGORY_FILTERS.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedCategory(cat.id);
                    }}
                    style={[
                      styles.catChip,
                      isSelected && styles.catChipActive,
                    ]}
                  >
                    <Icon
                      name={cat.iconName || 'music'}
                      size={12}
                      color={isSelected ? COLORS.secondary : COLORS.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
        ) : activeTab === 'SOLO' ? (
          /* SOLO GAMES LIST */
          <View style={styles.listContainer}>
            {soloGames.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="zap" size={44} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>NO SOLO GAMES RECORDED</Text>
                <Text style={styles.emptySubtitle}>
                  Play a Solo Rush game in {selectedCategory !== 'all' ? selectedCategory.toUpperCase() : 'ANY VIBE'} to see your scores recorded here!
                </Text>
              </View>
            ) : (
              <View style={styles.gamesList}>
                {soloGames.map((game, idx) => {
                  const isUser = game.player_name?.toLowerCase() === defaultPlayerName.toLowerCase();
                  return (
                    <View
                      key={game.id || idx}
                      style={[
                        styles.gameCard,
                        isUser && styles.gameCardUser,
                      ]}
                    >
                      <View style={styles.gameCardLeft}>
                        <View style={styles.playerTagRow}>
                          <View style={styles.avatarMiniCircle}>
                            <Text style={{ fontSize: 13 }}>{game.avatar_emoji || '🎧'}</Text>
                          </View>
                          <Text style={[styles.gamePlayerName, isUser && { color: COLORS.secondary }]}>
                            {game.player_name} {isUser ? '(YOU)' : ''}
                          </Text>
                        </View>

                        <Text style={styles.gameGenreTitle}>
                          {game.category ? game.category.replace('artist:', '🎤 ').toUpperCase() : 'GENERAL VIBES'}
                        </Text>
                        <Text style={styles.gameMetaText}>
                          {(game.difficulty || 'MEDIUM').toUpperCase()} • {formatRecordDate(game.created_at || game.CreatedAt)}
                        </Text>
                      </View>

                      <View style={styles.gameCardRight}>
                        {game.max_streak > 0 && (
                          <View style={styles.streakBadge}>
                            <Text style={styles.streakBadgeText}>{game.max_streak}X STREAK</Text>
                          </View>
                        )}
                        <View style={styles.scoreBox}>
                          <Text style={styles.scoreNumber}>{(game.score || 0).toLocaleString()}</Text>
                          <Text style={styles.scorePtsText}>PTS</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* MULTIPLAYER MATCHES LIST */
          <View style={styles.listContainer}>
            {multiplayerGames.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="users" size={44} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>NO MULTIPLAYER MATCHES RECORDED</Text>
                <Text style={styles.emptySubtitle}>
                  Play a Pass & Play multiplayer game with friends in {selectedCategory !== 'all' ? selectedCategory.toUpperCase() : 'ANY VIBE'} to view match results here!
                </Text>
              </View>
            ) : (
              <View style={styles.gamesList}>
                {multiplayerGames.map((match, idx) => (
                  <View key={match.id || idx} style={styles.multiplayerMatchCard}>
                    <View style={styles.mpHeaderRow}>
                      <View style={styles.winnerPill}>
                        <Text style={{ fontSize: 14, marginRight: 4 }}>👑</Text>
                        <Text style={styles.winnerText}>
                          WINNER: <Text style={{ color: '#FFD700', fontWeight: '900' }}>{match.match_winner || match.player_name}</Text>
                        </Text>
                      </View>
                      <Text style={styles.mpDateText}>{formatRecordDate(match.created_at || match.CreatedAt)}</Text>
                    </View>

                    <Text style={styles.mpGenreSub}>
                      {match.category ? match.category.replace('artist:', '🎤 ').toUpperCase() : 'GENERAL VIBES'} • {(match.difficulty || 'MEDIUM').toUpperCase()}
                    </Text>

                    {/* Breakdown of player scores */}
                    <View style={styles.breakdownBox}>
                      <Text style={styles.breakdownText}>
                        {match.opponents || `Player: ${match.player_name} • Score: ${match.score} PTS`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Real-Time High Score & Total Accumulated Points Badge */}
      <View style={styles.stickyUserRankBar}>
        <View style={styles.stickyUserInner}>
          <View style={styles.stickyRankBadge}>
            <Text style={styles.stickyRankNum}>MAX</Text>
          </View>

          <View style={styles.stickyUserInfo}>
            <Text style={styles.stickyUserName}>
              {defaultPlayerName} • HIGHEST SCORE:{' '}
              <Text style={{ color: COLORS.secondary }}>
                {(userStats.highestScore || 0).toLocaleString()} PTS
              </Text>
            </Text>
            <Text style={styles.stickyUserSub}>
              {(userStats.totalAccumulatedScore || 0).toLocaleString()} TOTAL ACCUMULATED POINTS • {userStats.totalGames} GAMES PLAYED
            </Text>
          </View>

          <View style={styles.stickyUserScore}>
            <Text style={styles.stickyScoreVal}>
              {(userStats.highestScore || 0).toLocaleString()}
            </Text>
            <Text style={styles.stickyPtsLabel}>BEST PTS</Text>
          </View>
        </View>
      </View>
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
    paddingBottom: 150,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  modeTabsNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 9999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    maxWidth: 420,
    marginBottom: 14,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
  },
  modeTabBtnActive: {
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.3)',
  },
  modeTabBtnActiveMulti: {
    backgroundColor: 'rgba(78, 222, 163, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.3)',
  },
  modeTabText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeTabTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '900',
  },
  modeTabTextActiveMulti: {
    color: COLORS.secondary,
    fontWeight: '900',
  },
  categoryScroll: {
    width: '100%',
  },
  categoryChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catChipActive: {
    borderColor: COLORS.secondary,
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
  },
  catChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  catChipTextActive: {
    color: COLORS.secondary,
    fontWeight: '800',
  },
  listContainer: {
    width: '100%',
  },
  gamesList: {
    gap: 12,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
  },
  gameCardUser: {
    borderColor: 'rgba(78, 222, 163, 0.3)',
    backgroundColor: 'rgba(78, 222, 163, 0.04)',
  },
  gameCardLeft: {
    flex: 1,
  },
  playerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  avatarMiniCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamePlayerName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  gameGenreTitle: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  gameMetaText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  gameCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 185, 95, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.tertiary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  streakBadgeText: {
    color: COLORS.tertiary,
    fontSize: 9,
    fontWeight: '900',
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  scoreNumber: {
    color: COLORS.secondary,
    fontSize: 20,
    fontWeight: '900',
  },
  scorePtsText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  multiplayerMatchCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  mpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  winnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  winnerText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },
  mpDateText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  mpGenreSub: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  breakdownBox: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  breakdownText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 380,
  },
  stickyUserRankBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 76 : 60,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 90,
  },
  stickyUserInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(32, 31, 31, 0.96)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 750,
    alignSelf: 'center',
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    gap: 12,
  },
  stickyRankBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stickyRankNum: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  stickyUserInfo: {
    flex: 1,
  },
  stickyUserName: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '900',
  },
  stickyUserSub: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  stickyUserScore: {
    alignItems: 'flex-end',
  },
  stickyScoreVal: {
    color: COLORS.secondary,
    fontSize: 15,
    fontWeight: '900',
  },
  stickyPtsLabel: {
    color: COLORS.textSecondary,
    fontSize: 8,
    fontWeight: '800',
  },
});
