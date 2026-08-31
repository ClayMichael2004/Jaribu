import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { COLORS, GENRE_METADATA } from '../constants/theme';
import { audioManager } from '../utils/audio';
import TopHeader from '../components/TopHeader';
import TurntableVisualizer from '../components/TurntableVisualizer';
import { Icon } from '../components/Icons';

export default function HomeScreen({
  playerName = 'DJ Nova',
  avatarEmoji = '🎧',
  avatarColor = '#c0c1ff',
  onStartSolo,
  onOpenCategorySelect,
  onStartPassPlaySetup,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenSettings,
  onSelectTab,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  const handlePlaySolo = () => {
    audioManager.playClick();
    if (onOpenCategorySelect) {
      onOpenCategorySelect();
    } else if (onStartSolo) {
      onStartSolo({ category: 'kenyan', difficulty: 'medium', totalRounds: 5 });
    }
  };

  const handleMultiplayer = () => {
    audioManager.playClick();
    if (onStartPassPlaySetup) {
      onStartPassPlaySetup({ category: 'kenyan', difficulty: 'medium', totalRounds: 5 });
    }
  };

  const handleQuickGenre = (genreId) => {
    audioManager.playClick();
    if (onStartSolo) {
      onStartSolo({ category: genreId, difficulty: 'medium', totalRounds: 5 });
    }
  };

  return (
    <View style={styles.container}>
      <TopHeader
        title="JARIBU"
        showBack={false}
        rightAction="settings"
        onRightAction={onOpenSettings}
        activeTab="HOME"
        onTabSelect={onSelectTab}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome & Turntable Hero Section (Matching Stitch UI) */}
        <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>
          {/* Left Column: Greeting & Action Buttons */}
          <View style={[styles.heroLeft, isDesktop && styles.heroLeftDesktop]}>
            <View style={styles.greetingBox}>
              <Text style={styles.greetingTitle}>
                Welcome back,{' '}
                <Text style={styles.playerNameHighlight}>{playerName}</Text>
              </Text>
              <Text style={styles.greetingSubtitle}>Ready for your next session?</Text>
            </View>

            <View style={[styles.actionsRow, isDesktop && styles.actionsRowDesktop]}>
              {/* Play Solo Glowing Pill Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePlaySolo}
                style={styles.playSoloButton}
              >
                <Icon name="play" size={14} color={COLORS.primaryLight} />
                <Text style={styles.playSoloText}>PLAY SOLO</Text>
              </TouchableOpacity>

              {/* Multiplayer / Pass & Play Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleMultiplayer}
                style={styles.multiplayerButton}
              >
                <Icon name="users" size={16} color={COLORS.text} />
                <Text style={styles.multiplayerText}>MULTIPLAYER</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Column: Vinyl Turntable Visualizer Centerpiece */}
          <View style={styles.heroRight}>
            <TurntableVisualizer
              isPlaying={isPlayingDemo}
              categoryEmoji={avatarEmoji}
              durationSec={8}
              size={isDesktop ? 'hero' : 'normal'}
              onTogglePlay={() => setIsPlayingDemo(!isPlayingDemo)}
            />
          </View>
        </View>

        {/* Bento Grid: Daily Challenge & Current Rank (Matching Stitch UI) */}
        <View style={[styles.bentoGrid, isDesktop && styles.bentoGridDesktop]}>
          {/* Card 1: Daily Challenge Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleQuickGenre('afrobeats')}
            style={[styles.dailyChallengeCard, isDesktop && styles.dailyChallengeCardDesktop]}
          >
            <View style={styles.dailyGlowAmbient} />
            <View style={styles.dailyCardContent}>
              <View style={styles.dailyCardHeader}>
                <View>
                  <View style={styles.dailyBadge}>
                    <Icon name="flame" size={12} color={COLORS.tertiary} style={{ marginRight: 4 }} />
                    <Text style={styles.dailyBadgeText}>DAILY CHALLENGE</Text>
                  </View>
                  <Text style={styles.dailyTitle}>Afrobeats Mastery</Text>
                  <Text style={styles.dailySubtitle}>
                    Identify 10 tracks perfectly to earn double XP.
                  </Text>
                </View>
                <View style={styles.fireBadgeCircle}>
                  <Icon name="flame" size={24} color={COLORS.tertiary} />
                </View>
              </View>

              <View style={styles.dailyProgressContainer}>
                <View style={styles.dailyProgressLabelRow}>
                  <Text style={styles.dailyProgressLabel}>Progress</Text>
                  <Text style={styles.dailyProgressCount}>4/10</Text>
                </View>
                <View style={styles.dailyProgressTrack}>
                  <View style={styles.dailyProgressBar} />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: Current Rank & Stats Overview Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onOpenProfile}
            style={[styles.rankCard, isDesktop && styles.rankCardDesktop]}
          >
            <Icon name="award" size={32} color={COLORS.secondary} style={{ marginBottom: 6 }} />
            <Text style={styles.rankHeaderLabel}>CURRENT RANK</Text>
            <Text style={styles.rankValue}>Silver III</Text>

            <View style={styles.rankStatsDivider} />

            <View style={styles.rankStatsRow}>
              <View style={styles.rankStatCol}>
                <Text style={styles.rankStatLabel}>Win Rate</Text>
                <Text style={styles.rankStatValue}>68%</Text>
              </View>
              <View style={styles.rankStatCol}>
                <Text style={styles.rankStatLabel}>Streak</Text>
                <Text style={styles.rankStatValue}>3</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Vibe / Featured Genres Section */}
        <View style={styles.quickVibeSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeadingTitle}>POPULAR VIBES</Text>
            <TouchableOpacity
              onPress={() => {
                audioManager.playClick();
                if (onOpenCategorySelect) onOpenCategorySelect();
              }}
            >
              <Text style={styles.seeAllText}>VIEW ALL →</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.quickGenresGrid, isDesktop && styles.quickGenresGridDesktop]}>
            {['kenyan', 'afrobeats', 'reggae', 'gospel'].map((genreId) => {
              const meta = GENRE_METADATA[genreId];
              if (!meta) return null;

              return (
                <TouchableOpacity
                  key={genreId}
                  activeOpacity={0.85}
                  onPress={() => handleQuickGenre(genreId)}
                  style={styles.quickGenreCard}
                >
                  <View style={styles.quickGenreArt}>
                    <Text style={styles.quickGenreEmoji}>{meta.icon}</Text>
                    <View style={styles.quickGenreBadge}>
                      <Icon name="play" size={8} color={COLORS.primaryLight} style={{ marginRight: 3 }} />
                      <Text style={styles.quickGenreBadgeText}>{meta.plays}</Text>
                    </View>
                  </View>
                  <Text style={styles.quickGenreName}>{meta.shortName}</Text>
                  <Text style={styles.quickGenreDesc} numberOfLines={1}>{meta.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    paddingTop: 16,
    paddingBottom: 110,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: 40,
    paddingTop: 28,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroSectionDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  heroLeft: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLeftDesktop: {
    flex: 1,
    alignItems: 'flex-start',
    marginBottom: 0,
    paddingRight: 24,
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  playerNameHighlight: {
    color: COLORS.secondary,
  },
  greetingSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'column',
    width: '100%',
    maxWidth: 380,
    gap: 10,
  },
  actionsRowDesktop: {
    flexDirection: 'row',
    maxWidth: 420,
  },
  playSoloButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(192, 193, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    gap: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  playSoloText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  multiplayerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    gap: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  multiplayerText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  bentoGrid: {
    flexDirection: 'column',
    gap: 14,
    marginBottom: 28,
  },
  bentoGridDesktop: {
    flexDirection: 'row',
    gap: 18,
  },
  dailyChallengeCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  dailyChallengeCardDesktop: {
    flex: 2,
  },
  dailyGlowAmbient: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 140,
    backgroundColor: 'rgba(255, 185, 95, 0.08)',
    borderRadius: 70,
  },
  dailyCardContent: {
    position: 'relative',
    zIndex: 2,
    justifyContent: 'space-between',
    height: '100%',
  },
  dailyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 185, 95, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 185, 95, 0.3)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  dailyBadgeText: {
    color: COLORS.tertiary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dailyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  dailySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  fireBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 185, 95, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyProgressContainer: {
    marginTop: 4,
  },
  dailyProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dailyProgressLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  dailyProgressCount: {
    color: COLORS.tertiary,
    fontSize: 11,
    fontWeight: '900',
  },
  dailyProgressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  dailyProgressBar: {
    width: '40%',
    height: '100%',
    backgroundColor: COLORS.tertiary,
    borderRadius: 9999,
    shadowColor: COLORS.tertiary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  rankCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  rankCardDesktop: {
    flex: 1,
  },
  rankHeaderLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  rankValue: {
    color: COLORS.secondary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rankStatsDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  rankStatsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  rankStatCol: {
    alignItems: 'center',
  },
  rankStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  rankStatValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  quickVibeSection: {
    marginBottom: 20,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeadingTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  seeAllText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  quickGenresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickGenresGridDesktop: {
    gap: 16,
  },
  quickGenreCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  quickGenreArt: {
    width: '100%',
    aspectRatio: 1.3,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  quickGenreEmoji: {
    fontSize: 28,
  },
  quickGenreBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 19, 19, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quickGenreBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 9,
    fontWeight: '900',
  },
  quickGenreName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  quickGenreDesc: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
});
