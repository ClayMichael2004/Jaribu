import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { COLORS, AVATAR_EMOJIS, AVATAR_COLORS } from '../constants/theme';
import { getMyRecords } from '../config/api';
import { audioManager } from '../utils/audio';
import TopHeader from '../components/TopHeader';
import { Icon } from '../components/Icons';

export default function ProfileScreen({
  playerName = 'Clay',
  avatarEmoji = '🎧',
  avatarColor = '#c0c1ff',
  onUpdateProfile,
  onBack,
  onOpenSettings,
  onStartSolo,
  onSelectTab,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [nameInput, setNameInput] = useState(playerName);
  const [selectedEmoji, setSelectedEmoji] = useState(avatarEmoji);
  const [selectedColor, setSelectedColor] = useState(avatarColor);
  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setNameInput(playerName);
    setSelectedEmoji(avatarEmoji);
    setSelectedColor(avatarColor);
    loadProfileData();
  }, [playerName, avatarEmoji, avatarColor]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const data = await getMyRecords(playerName);
      setRecords(data.records || []);
    } catch (e) {
      console.warn('Failed to load profile records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = () => {
    audioManager.playClick();
    const cleanName = nameInput.trim() || 'Clay';
    if (onUpdateProfile) {
      onUpdateProfile({
        playerName: cleanName,
        avatarEmoji: selectedEmoji,
        avatarColor: selectedColor,
      });
    }
    setIsEditing(false);
    setSaveMessage('Profile saved to database!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const totalGames = records.length;
  const totalScore = records.reduce((acc, r) => acc + (r.score || 0), 0);
  const winRate = records.length > 0
    ? Math.round((records.filter(r => (r.score || 0) > 0).length / records.length) * 100)
    : 0;
  const bestStreak = records.reduce((max, r) => Math.max(max, r.max_streak || 0), 0);
  const playerLevel = Math.max(1, Math.floor(totalScore / 500) + 1);

  return (
    <View style={styles.container}>
      <TopHeader
        title="JARIBU"
        showBack={!!onBack}
        onBack={onBack}
        rightAction="settings"
        onRightAction={onOpenSettings}
        activeTab="PROFILE"
        onTabSelect={onSelectTab}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Hero */}
        <View style={[styles.profileHero, isDesktop && styles.profileHeroDesktop]}>
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatarCircle,
                { borderColor: selectedColor, backgroundColor: 'rgba(192, 193, 255, 0.1)' },
              ]}
            >
              <Text style={{ fontSize: 42 }}>{selectedEmoji}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{playerLevel}</Text>
            </View>
          </View>

          <View style={[styles.profileInfo, isDesktop && styles.profileInfoDesktop]}>
            <Text style={styles.profileName}>{nameInput || playerName}</Text>
            <Text style={styles.profileSubtitle}>Level {playerLevel} Rhythm Master</Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                audioManager.playClick();
                setIsEditing(!isEditing);
              }}
              style={styles.editProfileBtn}
            >
              <Icon name="user" size={12} color={COLORS.primaryLight} style={{ marginRight: 6 }} />
              <Text style={styles.editProfileText}>
                {isEditing ? 'CANCEL EDIT' : 'EDIT NAME & AVATAR'}
              </Text>
            </TouchableOpacity>

            {saveMessage !== '' && (
              <Text style={styles.savedFeedbackText}>✓ {saveMessage}</Text>
            )}
          </View>
        </View>

        {/* Inline Edit Profile Card (When editing) */}
        {isEditing && (
          <View style={styles.editSectionCard}>
            <Text style={styles.editCardTitle}>CUSTOMIZE YOUR IDENTITY</Text>
            
            <Text style={styles.inputLabel}>PLAYER NAME</Text>
            <TextInput
              style={styles.nameTextInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your player name..."
              placeholderTextColor={COLORS.textMuted}
              maxLength={20}
            />

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>CHOOSE AVATAR EMOJI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.emojiPickerRow}>
                {AVATAR_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => {
                      audioManager.playClick();
                      setSelectedEmoji(emoji);
                    }}
                    style={[
                      styles.emojiPill,
                      selectedEmoji === emoji && styles.emojiPillActive,
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.inputLabel}>AVATAR BORDER COLOR</Text>
            <View style={styles.colorSwatchesRow}>
              {AVATAR_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    audioManager.playClick();
                    setSelectedColor(c);
                  }}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleSaveProfile}
              style={styles.saveProfileButton}
            >
              <Icon name="check" size={14} color={COLORS.onPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.saveProfileBtnText}>SAVE PROFILE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2x2 Bento Metric Cards (Matching Stitch UI) */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Points */}
          <View style={styles.statCard}>
            <Icon name="star" size={20} color={COLORS.primaryLight} style={{ marginBottom: 6 }} />
            <Text style={[styles.statValue, { color: COLORS.primaryLight }]}>
              {totalScore.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>TOTAL POINTS</Text>
          </View>

          {/* Card 2: Games Played */}
          <View style={styles.statCard}>
            <Icon name="disc" size={20} color={COLORS.secondary} style={{ marginBottom: 6 }} />
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>{totalGames}</Text>
            <Text style={styles.statLabel}>GAMES PLAYED</Text>
          </View>

          {/* Card 3: Win / Accuracy Rate */}
          <View style={styles.statCard}>
            <Icon name="zap" size={20} color={COLORS.tertiary} style={{ marginBottom: 6 }} />
            <Text style={[styles.statValue, { color: COLORS.tertiary }]}>{winRate}%</Text>
            <Text style={styles.statLabel}>ACCURACY RATE</Text>
          </View>

          {/* Card 4: Best Streak */}
          <View style={styles.statCard}>
            <Icon name="flame" size={20} color={COLORS.secondary} style={{ marginBottom: 6 }} />
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>{bestStreak}x</Text>
            <Text style={styles.statLabel}>BEST STREAK</Text>
          </View>
        </View>

        {/* Match History Breakdown */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeading}>RECENT MATCHES ({records.length})</Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : records.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <Icon name="music" size={32} color={COLORS.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyHistoryText}>NO MATCHES PLAYED YET</Text>
              <Text style={styles.emptyHistorySub}>Start a Solo Rush or Multiplayer game to log match history!</Text>
            </View>
          ) : (
            <View style={styles.recordsList}>
              {records.slice(0, 10).map((r, idx) => (
                <View key={r.id || idx} style={styles.recordItem}>
                  <View style={styles.recordLeft}>
                    <Text style={styles.recordCategory}>
                      {r.category ? r.category.replace('artist:', '🎤 ').toUpperCase() : 'GENERAL VIBES'}
                    </Text>
                    <Text style={styles.recordMeta}>
                      {r.game_mode === 'pass_and_play' ? '👥 MULTIPLAYER' : '⚡ SOLO RUSH'} • {(r.difficulty || 'MEDIUM').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.recordRight}>
                    <Text style={styles.recordScore}>{(r.score || 0).toLocaleString()} PTS</Text>
                    {r.max_streak > 0 && (
                      <Text style={styles.recordStreak}>{r.max_streak}x streak</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
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
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 16,
    marginBottom: 20,
  },
  profileHeroDesktop: {
    padding: 28,
    gap: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  levelBadgeText: {
    color: COLORS.onPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
  profileInfo: {
    flex: 1,
  },
  profileInfoDesktop: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  profileSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 193, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  savedFeedbackText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  editSectionCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: 20,
  },
  editCardTitle: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  nameTextInput: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiPill: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emojiPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(192, 193, 255, 0.25)',
  },
  colorSwatchesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorSwatchActive: {
    borderWidth: 2.5,
    borderColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
  saveProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  saveProfileBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  historySection: {
    marginBottom: 20,
  },
  sectionHeading: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emptyHistoryCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyHistoryText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyHistorySub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  recordsList: {
    gap: 8,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  recordLeft: {
    flex: 1,
  },
  recordCategory: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  recordMeta: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordScore: {
    color: COLORS.secondary,
    fontSize: 15,
    fontWeight: '900',
  },
  recordStreak: {
    color: COLORS.tertiary,
    fontSize: 10,
    fontWeight: '700',
  },
});
