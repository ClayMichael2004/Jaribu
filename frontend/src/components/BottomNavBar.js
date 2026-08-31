import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { audioManager } from '../utils/audio';
import { Icon } from './Icons';

const TABS = [
  { id: 'HOME', label: 'Home', icon: 'home' },
  { id: 'CATEGORIES', label: 'Genres', icon: 'music' },
  { id: 'LEADERBOARD', label: 'Social', icon: 'trophy' },
  { id: 'PROFILE', label: 'Profile', icon: 'user' },
  { id: 'SETTINGS', label: 'Settings', icon: 'settings' },
];

export default function BottomNavBar({
  activeTab = 'HOME',
  onSelectTab,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  if (isDesktop) {
    return null;
  }

  const handleSelect = (tabId) => {
    audioManager.playClick();
    if (onSelectTab) {
      onSelectTab(tabId);
    }
  };

  return (
    <View style={styles.navWrapper}>
      <View style={styles.navBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const iconColor = isActive ? COLORS.primaryLight : COLORS.textSecondary;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              onPress={() => handleSelect(tab.id)}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
              ]}
              accessibilityLabel={tab.label}
            >
              <Icon name={tab.icon} size={20} color={iconColor} style={{ marginBottom: 4 }} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(19, 19, 19, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    zIndex: 99,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 12,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    minWidth: 58,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  tabButtonActive: {
    backgroundColor: 'rgba(192, 193, 255, 0.15)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: COLORS.primaryLight,
    fontWeight: '900',
  },
});
