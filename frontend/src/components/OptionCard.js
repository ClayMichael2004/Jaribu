import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';

const BADGE_CONFIG = [
  { letter: 'A', color: '#FF5722', bevel: '#C83B18' },
  { letter: 'B', color: '#00E5FF', bevel: '#00A8A2' },
  { letter: 'C', color: '#8B5CF6', bevel: '#591B99' },
  { letter: 'D', color: '#EC4899', bevel: '#A81C65' },
  { letter: 'E', color: '#FFB300', bevel: '#C78F00' },
  { letter: 'F', color: '#10B981', bevel: '#057A55' },
];

export default function OptionCard({
  option,
  index = 0,
  isSelected = false,
  isCorrect = false,
  isWrong = false,
  isDisabled = false,
  onSelect,
}) {
  const [isPressed, setIsPressed] = useState(false);
  const cfg = BADGE_CONFIG[index % BADGE_CONFIG.length];

  const handlePress = () => {
    if (isDisabled) return;
    audioManager.playClick();
    if (onSelect) {
      onSelect(option);
    }
  };

  let cardStyle = styles.card;
  let bevelColor = COLORS.bevelDark;
  let badgeColor = cfg.color;
  let badgeText = cfg.letter;

  if (isCorrect) {
    cardStyle = [styles.card, styles.cardCorrect];
    bevelColor = COLORS.bevelMint;
    badgeColor = COLORS.accentMint;
    badgeText = '✓';
  } else if (isWrong) {
    cardStyle = [styles.card, styles.cardWrong];
    bevelColor = COLORS.bevelRed;
    badgeColor = COLORS.accentRed;
    badgeText = '✗';
  } else if (isSelected) {
    cardStyle = [styles.card, styles.cardSelected];
    bevelColor = COLORS.bevelPrimary;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        cardStyle,
        { borderBottomColor: bevelColor },
        isPressed && styles.cardPressed,
        isDisabled && styles.cardDisabled,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
    >
      {/* 3D Option Badge */}
      <View style={[styles.badge, { backgroundColor: badgeColor, borderBottomColor: cfg.bevel }]}>
        <Text style={styles.badgeText}>{badgeText}</Text>
      </View>

      {/* Song & Artist Info */}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            isCorrect && styles.textCorrect,
            isWrong && styles.textWrong,
          ]}
          numberOfLines={1}
        >
          {option.title}
        </Text>
        <Text
          style={[
            styles.artist,
            isCorrect && styles.artistCorrect,
          ]}
          numberOfLines={1}
        >
          {option.artist}
        </Text>
      </View>

      {/* Right Status Indicator */}
      {isCorrect && (
        <View style={styles.correctIndicator}>
          <Text style={styles.indicatorText}>+PTS</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.bevelDark,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.1s ease, border-color 0.15s ease',
      },
    }),
  },
  cardPressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 87, 34, 0.12)',
  },
  cardCorrect: {
    borderColor: COLORS.accentMint,
    backgroundColor: 'rgba(0, 230, 118, 0.18)',
    shadowColor: COLORS.accentMint,
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  cardWrong: {
    borderColor: COLORS.accentRed,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
  cardDisabled: {
    opacity: 0.75,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderBottomWidth: 2.5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  artist: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  textCorrect: {
    color: COLORS.accentMint,
  },
  artistCorrect: {
    color: '#D1FAE5',
  },
  textWrong: {
    color: '#FCA5A5',
  },
  correctIndicator: {
    backgroundColor: COLORS.accentMint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  indicatorText: {
    color: '#080B11',
    fontSize: 10,
    fontWeight: '900',
  },
});
