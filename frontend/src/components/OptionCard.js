import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';
import { Icon } from './Icons';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function OptionCard({
  option,
  index = 0,
  isSelected = false,
  isCorrect = false,
  isWrong = false,
  pointsEarned = 0,
  isDisabled = false,
  onSelect,
}) {
  const letter = OPTION_LETTERS[index] || `${index + 1}`;

  const handlePress = () => {
    if (isDisabled || !onSelect) return;
    audioManager.playClick();
    onSelect(option);
  };

  // State styling classes
  const cardStyle = [
    styles.card,
    isSelected && styles.cardSelected,
    isCorrect && styles.cardCorrect,
    isWrong && styles.cardWrong,
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={handlePress}
      disabled={isDisabled}
      style={cardStyle}
    >
      {/* Ambient background glow on correct/wrong */}
      {isCorrect && <View style={styles.ambientGlowCorrect} />}
      {isWrong && <View style={styles.ambientGlowWrong} />}

      {/* Left: Letter Badge Indicator */}
      <View
        style={[
          styles.letterBadge,
          isSelected && styles.letterBadgeSelected,
          isCorrect && styles.letterBadgeCorrect,
          isWrong && styles.letterBadgeWrong,
        ]}
      >
        {isCorrect ? (
          <Icon name="check" size={14} color="#000" />
        ) : isWrong ? (
          <Icon name="close" size={14} color="#fff" />
        ) : (
          <Text
            style={[
              styles.letterText,
              isSelected && styles.letterTextSelected,
            ]}
          >
            {letter}
          </Text>
        )}
      </View>

      {/* Center: Track Title & Artist Info */}
      <View style={styles.trackInfo}>
        <Text
          style={[
            styles.trackTitle,
            isSelected && styles.trackTitleSelected,
            isCorrect && styles.trackTitleCorrect,
            isWrong && styles.trackTitleWrong,
          ]}
          numberOfLines={1}
        >
          {option.title || 'Untitled Track'}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {option.artist || 'Unknown Artist'}
        </Text>
      </View>

      {/* Right: Points Awarded or Miss Pill */}
      {isCorrect ? (
        <View style={styles.pointsBadge}>
          <Icon name="star" size={12} color="#000" style={{ marginRight: 4 }} />
          <Text style={styles.pointsBadgeText}>
            +{pointsEarned > 0 ? pointsEarned : 150} PTS
          </Text>
        </View>
      ) : isWrong ? (
        <View style={styles.missBadge}>
          <Text style={styles.missBadgeText}>MISS</Text>
        </View>
      ) : isSelected ? (
        <View style={styles.selectedPill}>
          <Text style={styles.selectedPillText}>CHOSEN</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
      },
    }),
  },
  cardSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(192, 193, 255, 0.12)',
    transform: [{ scale: 1.01 }],
  },
  cardCorrect: {
    borderColor: COLORS.secondary, // Neon cyber mint green #4edea3
    backgroundColor: 'rgba(78, 222, 163, 0.16)',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    transform: [{ scale: 1.02 }],
  },
  cardWrong: {
    borderColor: COLORS.error, // Neon red #ff5449
    backgroundColor: 'rgba(255, 84, 73, 0.16)',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  ambientGlowCorrect: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: COLORS.secondary,
  },
  ambientGlowWrong: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: COLORS.error,
  },
  letterBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  letterBadgeSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  letterBadgeCorrect: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  letterBadgeWrong: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  letterText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },
  letterTextSelected: {
    color: COLORS.onPrimary,
  },
  trackInfo: {
    flex: 1,
    paddingRight: 10,
  },
  trackTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  trackTitleSelected: {
    color: COLORS.primaryLight,
  },
  trackTitleCorrect: {
    color: '#6ffbbe',
    fontWeight: '900',
  },
  trackTitleWrong: {
    color: '#ffb4ab',
  },
  artistName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  pointsBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  missBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  missBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectedPill: {
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(192, 193, 255, 0.3)',
  },
  selectedPillText: {
    color: COLORS.primaryLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
