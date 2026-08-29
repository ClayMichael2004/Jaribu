import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { getLeaderboard, getMyRecords, resetAllRecords } from '../config/api';
import { audioManager } from '../utils/audio';

export default function LeaderboardScreen({ onBack, defaultPlayerName = 'Player 1' }) {
  const [activeTab, setActiveTab] = useState('hall_of_fame'); // 'hall_of_fame' | 'my_records'
  const [entries, setEntries] = useState([]);
  const [myRecords, setMyRecords] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const categories = [
    { id: 'all', label: '🌟 All Highscores' },
    { id: 'general', label: '🎲 Random Mix' },
    { id: 'kenyan', label: '🇰🇪 Kenyan Hits' },
    { id: 'afrobeats', label: '🌍 Afrobeats' },
    { id: 'reggae', label: '🇯🇲 Reggae & Roots' },
    { id: 'dancehall', label: '🔊 Dancehall' },
    { id: 'gospel', label: '🙏 Gospel' },
    { id: 'hiphop', label: '🎤 Hip-Hop' },
    { id: 'pop', label: '✨ Billboard Pop' },
    { id: 'nineties_twothousands', label: '📼 90s/2000s' },
    { id: 'rock_classics', label: '🎸 Rock Anthems' },
  ];

  useEffect(() => {
    if (activeTab === 'hall_of_fame') {
      loadLeaderboard();
    } else {
      loadMyRecords();
    }
  }, [activeTab, selectedCategory]);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      const data = await getLeaderboard({
        category: selectedCategory === 'all' ? '' : selectedCategory,
        limit: 25,
      });
      setEntries(data);
    } catch (e) {
      console.warn('Leaderboard load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyRecords = async () => {
    try {
      setIsLoading(true);
      const data = await getMyRecords(defaultPlayerName);
      setMyRecords(data.records || []);
    } catch (e) {
      console.warn('My records load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRecords = async () => {
    audioManager.playClick();
    try {
      setIsLoading(true);
      await resetAllRecords();
      setEntries([]);
      setMyRecords([]);
      setShowConfirmReset(false);
      if (Platform.OS !== 'web') {
        Alert.alert('Reset Complete', 'All player records and leaderboards have been cleared.');
      }
      loadLeaderboard();
    } catch (e) {
      console.error('Reset error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>LEADERBOARD & RECORDS 🏆</Text>
        <Text style={styles.subtitle}>HIGH SCORES & PERSONAL STATS</Text>
      </View>

      {/* Main Mode Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'hall_of_fame' && styles.tabBtnActive]}
          onPress={() => {
            audioManager.playClick();
            setActiveTab('hall_of_fame');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'hall_of_fame' && styles.tabTextActive]}>
            🏆 HALL OF FAME
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'my_records' && styles.tabBtnActive]}
          onPress={() => {
            audioManager.playClick();
            setActiveTab('my_records');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'my_records' && styles.tabTextActive]}>
            📊 MY RECORDS ({myRecords.length || '•'})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reset Records Banner & Confirmation */}
      {showConfirmReset ? (
        <View style={styles.resetConfirmBox}>
          <Text style={styles.resetConfirmTitle}>⚠️ Reset All Scores & Records?</Text>
          <Text style={styles.resetConfirmSub}>
            This will permanently wipe your highscores and match history so you can start completely fresh.
          </Text>
          <View style={styles.resetBtnRow}>
            <TouchableOpacity style={styles.confirmResetBtn} onPress={handleResetRecords}>
              <Text style={styles.confirmResetText}>YES, CLEAR ALL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelResetBtn}
              onPress={() => setShowConfirmReset(false)}
            >
              <Text style={styles.cancelResetText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.resetActionBtn}
            onPress={() => {
              audioManager.playClick();
              setShowConfirmReset(true);
            }}
          >
            <Text style={styles.resetActionText}>🗑️ CLEAR / RESET MY RECORDS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HALL OF FAME TAB */}
      {activeTab === 'hall_of_fame' && (
        <>
          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => {
                    audioManager.playClick();
                    setSelectedCategory(cat.id);
                  }}
                >
                  <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Deduplicated Leaderboard Entries */}
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.accentAmber} style={{ marginTop: 30 }} />
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎧</Text>
              <Text style={styles.emptyText}>No highscores recorded yet!</Text>
              <Text style={styles.emptySub}>Play Solo Rush or Pass & Play to set the first score.</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {entries.map((entry, idx) => {
                const isTop3 = idx < 3;
                return (
                  <View
                    key={entry.id || idx}
                    style={[
                      styles.entryCard,
                      isTop3 && {
                        borderColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32',
                      },
                    ]}
                  >
                    {/* Rank Badge */}
                    <View style={styles.rankBox}>
                      <Text style={styles.rankEmoji}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </Text>
                    </View>

                    {/* Avatar */}
                    <View
                      style={[
                        styles.avatarBox,
                        { backgroundColor: entry.avatar_color || COLORS.primary },
                      ]}
                    >
                      <Text style={styles.avatarEmoji}>{entry.avatar_emoji || '🦁'}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {entry.player_name}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaBadge}>{entry.category.toUpperCase()}</Text>
                        <Text style={styles.metaBadge}>{entry.difficulty.toUpperCase()}</Text>
                        {entry.max_streak > 1 && (
                          <Text style={styles.metaStreak}>🔥 {entry.max_streak}x streak</Text>
                        )}
                      </View>
                    </View>

                    {/* Score */}
                    <View style={styles.scoreBox}>
                      <Text style={styles.scoreNumber}>{entry.score}</Text>
                      <Text style={styles.scoreLabel}>BEST SCORE</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* MY RECORDS & HISTORY TAB */}
      {activeTab === 'my_records' && (
        <View style={styles.myRecordsContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.accentMint} style={{ marginTop: 30 }} />
          ) : myRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>No game history recorded yet!</Text>
              <Text style={styles.emptySub}>Your individual game scores and stats will show up here.</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {myRecords.map((rec, idx) => (
                <View key={rec.id || idx} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordCatBadge}>
                      <Text style={styles.recordCatText}>{rec.category.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.recordDiff}>{rec.difficulty.toUpperCase()} • {rec.game_mode.toUpperCase()}</Text>
                    <Text style={styles.recordScore}>⭐ {rec.score} pts</Text>
                  </View>
                  <View style={styles.recordMeta}>
                    <Text style={styles.recordMetaText}>🔥 Max Streak: {rec.max_streak}x</Text>
                    <Text style={styles.recordMetaText}>🎯 Accuracy: {rec.accuracy_pct}%</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
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
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 4,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  backBtnText: {
    color: COLORS.textMuted,
    fontWeight: '800',
    fontSize: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.accentAmber,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: COLORS.cardHover,
    borderWidth: 1,
    borderColor: COLORS.accentAmber,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: COLORS.accentAmber,
  },
  topActionsRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  resetActionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accentRed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resetActionText: {
    color: COLORS.accentRed,
    fontSize: 11,
    fontWeight: '900',
  },
  resetConfirmBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: COLORS.accentRed,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  resetConfirmTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  resetConfirmSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  resetBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmResetBtn: {
    backgroundColor: COLORS.accentRed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmResetText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  cancelResetBtn: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelResetText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterPill: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 8,
  },
  filterPillActive: {
    borderColor: COLORS.accentAmber,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: COLORS.accentAmber,
  },
  listContainer: {
    gap: 8,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  rankBox: {
    width: 32,
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 16,
    fontWeight: '900',
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarEmoji: {
    fontSize: 18,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  metaBadge: {
    backgroundColor: COLORS.backgroundSecondary,
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  metaStreak: {
    color: COLORS.accentAmber,
    fontSize: 10,
    fontWeight: '800',
  },
  scoreBox: {
    alignItems: 'flex-end',
  },
  scoreNumber: {
    color: COLORS.accentAmber,
    fontSize: 17,
    fontWeight: '900',
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  recordCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recordCatBadge: {
    backgroundColor: 'rgba(255, 87, 34, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recordCatText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  recordDiff: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  recordScore: {
    color: COLORS.accentAmber,
    fontSize: 14,
    fontWeight: '900',
  },
  recordMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordMetaText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
