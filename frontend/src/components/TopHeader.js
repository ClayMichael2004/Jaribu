import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';
import { Icon } from './Icons';

export default function TopHeader({
  title = 'JARIBU',
  showBack = false,
  onBack,
  rightAction = 'settings', // 'settings' | 'exit' | 'profile' | 'close' | 'none'
  onRightAction,
  activeTab = 'HOME',
  onTabSelect,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleBack = () => {
    audioManager.playClick();
    if (onBack) onBack();
  };

  const handleRight = () => {
    audioManager.playClick();
    if (onRightAction) onRightAction();
  };

  return (
    <View style={styles.headerOuter}>
      <View style={[styles.headerInner, isDesktop && styles.headerDesktop]}>
        {/* Left Section: Back button or Brand Pulse */}
        <View style={styles.leftSection}>
          {showBack ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleBack}
              style={styles.iconButton}
              accessibilityLabel="Back"
            >
              <Icon name="arrow-left" size={18} color={COLORS.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.brandIconDot} />
          )}
        </View>

        {/* Center Section: JARIBU Brand Display */}
        <View style={styles.centerSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (onTabSelect) onTabSelect('HOME');
            }}
          >
            <Text style={styles.brandTitle}>{title}</Text>
          </TouchableOpacity>
        </View>

        {/* Desktop Navigation Links (Visible on Tablet/PC) */}
        {isDesktop && onTabSelect && (
          <View style={styles.desktopNav}>
            <TouchableOpacity
              onPress={() => onTabSelect('HOME')}
              style={[styles.desktopNavLink, activeTab === 'HOME' && styles.desktopNavLinkActive]}
            >
              <Text style={[styles.desktopNavText, activeTab === 'HOME' && styles.desktopNavTextActive]}>
                HOME
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onTabSelect('CATEGORIES')}
              style={[styles.desktopNavLink, activeTab === 'CATEGORIES' && styles.desktopNavLinkActive]}
            >
              <Text style={[styles.desktopNavText, activeTab === 'CATEGORIES' && styles.desktopNavTextActive]}>
                GENRES
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onTabSelect('LEADERBOARD')}
              style={[styles.desktopNavLink, activeTab === 'LEADERBOARD' && styles.desktopNavLinkActive]}
            >
              <Text style={[styles.desktopNavText, activeTab === 'LEADERBOARD' && styles.desktopNavTextActive]}>
                SOCIAL
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onTabSelect('PROFILE')}
              style={[styles.desktopNavLink, activeTab === 'PROFILE' && styles.desktopNavLinkActive]}
            >
              <Text style={[styles.desktopNavText, activeTab === 'PROFILE' && styles.desktopNavTextActive]}>
                PROFILE
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Right Section: Action Button */}
        <View style={styles.rightSection}>
          {rightAction === 'settings' && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRight}
              style={styles.iconButton}
              accessibilityLabel="Settings"
            >
              <Icon name="settings" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          {rightAction === 'exit' && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRight}
              style={styles.exitPill}
              accessibilityLabel="Exit Game"
            >
              <Text style={styles.exitText}>EXIT</Text>
            </TouchableOpacity>
          )}
          {rightAction === 'close' && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRight}
              style={styles.iconButton}
              accessibilityLabel="Close"
            >
              <Icon name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerOuter: {
    width: '100%',
    backgroundColor: 'rgba(19, 19, 19, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 100,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  headerDesktop: {
    height: 72,
    paddingHorizontal: 40,
  },
  leftSection: {
    width: 60,
    alignItems: 'flex-start',
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    width: 60,
    alignItems: 'flex-end',
  },
  brandIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  brandTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  exitPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  exitText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  desktopNavLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  desktopNavLinkActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  desktopNavText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  desktopNavTextActive: {
    color: COLORS.primaryLight,
  },
});
