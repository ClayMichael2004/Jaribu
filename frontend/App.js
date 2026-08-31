import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from './src/constants/theme';
import { getProfile, saveProfile } from './src/config/api';

import HomeScreen from './src/screens/HomeScreen';
import CategorySelectScreen from './src/screens/CategorySelectScreen';
import SoloGameScreen from './src/screens/SoloGameScreen';
import PassPlaySetupScreen from './src/screens/PassPlaySetupScreen';
import PassPlayGameScreen from './src/screens/PassPlayGameScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsModal from './src/components/SettingsModal';
import BottomNavBar from './src/components/BottomNavBar';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('HOME');
  const [activeTab, setActiveTab] = useState('HOME');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Persistent User Profile from SQLite
  const [userProfile, setUserProfile] = useState({
    playerName: 'Clay',
    avatarEmoji: '🎧',
    avatarColor: '#c0c1ff',
  });

  // Game configuration
  const [gameConfig, setGameConfig] = useState({
    category: 'kenyan',
    difficulty: 'medium',
    totalRounds: 5,
    players: [],
    roundsPerPlayer: 3,
  });

  // Load persistent profile from SQLite on startup
  useEffect(() => {
    async function loadSavedProfile() {
      try {
        const profile = await getProfile();
        if (profile && profile.playerName) {
          setUserProfile(profile);
        }
      } catch (err) {
        console.warn('Failed to load profile on boot, using defaults:', err);
      } finally {
        setIsProfileLoading(false);
      }
    }
    loadSavedProfile();
  }, []);

  const handleUpdateProfile = async (updated) => {
    setUserProfile((prev) => ({
      ...prev,
      ...updated,
    }));
    try {
      await saveProfile({
        playerName: updated.playerName || userProfile.playerName,
        avatarEmoji: updated.avatarEmoji || userProfile.avatarEmoji,
        avatarColor: updated.avatarColor || userProfile.avatarColor,
      });
    } catch (err) {
      console.warn('Could not save profile to SQLite:', err);
    }
  };

  const handleStartSolo = (config = {}) => {
    setGameConfig((prev) => ({
      ...prev,
      ...config,
      category: config.category || prev.category || 'kenyan',
      difficulty: config.difficulty || prev.difficulty || 'medium',
      totalRounds: config.totalRounds || prev.totalRounds || 5,
    }));
    setCurrentScreen('SOLO');
  };

  const handleStartPassPlaySetup = (config = {}) => {
    setGameConfig((prev) => ({
      ...prev,
      ...config,
    }));
    setCurrentScreen('PASS_PLAY_SETUP');
  };

  const handleStartPassPlayGame = ({ players, category, difficulty, roundsPerPlayer }) => {
    setGameConfig((prev) => ({
      ...prev,
      players,
      category,
      difficulty,
      roundsPerPlayer,
    }));
    setCurrentScreen('PASS_PLAY_GAME');
  };

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    if (tab === 'HOME') setCurrentScreen('HOME');
    else if (tab === 'CATEGORIES') setCurrentScreen('CATEGORIES');
    else if (tab === 'PASS_PLAY') setCurrentScreen('PASS_PLAY_SETUP');
    else if (tab === 'LEADERBOARD') setCurrentScreen('LEADERBOARD');
    else if (tab === 'PROFILE') setCurrentScreen('PROFILE');
  };

  // Determine if bottom navigation should be visible
  const showBottomNav =
    currentScreen === 'HOME' ||
    currentScreen === 'CATEGORIES' ||
    currentScreen === 'LEADERBOARD' ||
    currentScreen === 'PROFILE';

  if (isProfileLoading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        {currentScreen === 'HOME' && (
          <HomeScreen
            playerName={userProfile.playerName}
            avatarEmoji={userProfile.avatarEmoji}
            avatarColor={userProfile.avatarColor}
            onStartSolo={handleStartSolo}
            onOpenCategorySelect={() => setCurrentScreen('CATEGORIES')}
            onStartPassPlaySetup={handleStartPassPlaySetup}
            onOpenLeaderboard={() => setCurrentScreen('LEADERBOARD')}
            onOpenProfile={() => setCurrentScreen('PROFILE')}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectTab={handleTabSelect}
          />
        )}

        {currentScreen === 'CATEGORIES' && (
          <CategorySelectScreen
            initialCategory={gameConfig.category}
            initialDifficulty={gameConfig.difficulty}
            initialRounds={gameConfig.totalRounds}
            onStartGame={handleStartSolo}
            onStartPassPlaySetup={handleStartPassPlaySetup}
            onBack={() => setCurrentScreen('HOME')}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectTab={handleTabSelect}
          />
        )}

        {currentScreen === 'SOLO' && (
          <SoloGameScreen
            category={gameConfig.category}
            difficulty={gameConfig.difficulty}
            totalRounds={gameConfig.totalRounds}
            playerName={userProfile.playerName}
            avatarEmoji={userProfile.avatarEmoji}
            avatarColor={userProfile.avatarColor}
            onExitGame={() => setCurrentScreen('HOME')}
            onOpenLeaderboard={() => setCurrentScreen('LEADERBOARD')}
          />
        )}

        {currentScreen === 'PASS_PLAY_SETUP' && (
          <PassPlaySetupScreen
            initialCategory={gameConfig.category}
            initialDifficulty={gameConfig.difficulty}
            initialRounds={gameConfig.roundsPerPlayer || 3}
            playerName={userProfile.playerName}
            avatarEmoji={userProfile.avatarEmoji}
            avatarColor={userProfile.avatarColor}
            onStartGame={handleStartPassPlayGame}
            onBack={() => setCurrentScreen('HOME')}
          />
        )}

        {currentScreen === 'PASS_PLAY_GAME' && (
          <PassPlayGameScreen
            players={gameConfig.players}
            category={gameConfig.category}
            difficulty={gameConfig.difficulty}
            roundsPerPlayer={gameConfig.roundsPerPlayer}
            onExitGame={() => setCurrentScreen('HOME')}
          />
        )}

        {currentScreen === 'LEADERBOARD' && (
          <LeaderboardScreen
            defaultPlayerName={userProfile.playerName}
            onBack={() => setCurrentScreen('HOME')}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectTab={handleTabSelect}
          />
        )}

        {currentScreen === 'PROFILE' && (
          <ProfileScreen
            playerName={userProfile.playerName}
            avatarEmoji={userProfile.avatarEmoji}
            avatarColor={userProfile.avatarColor}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => setCurrentScreen('HOME')}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onStartSolo={handleStartSolo}
            onSelectTab={handleTabSelect}
          />
        )}

        {/* Global Settings Modal */}
        <SettingsModal
          visible={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          playerName={userProfile.playerName}
          avatarEmoji={userProfile.avatarEmoji}
          avatarColor={userProfile.avatarColor}
          onUpdateProfile={handleUpdateProfile}
        />

        {/* Bottom Tab Navigation Bar (Persistent across main views) */}
        {showBottomNav && (
          <BottomNavBar
            activeTab={
              currentScreen === 'CATEGORIES'
                ? 'CATEGORIES'
                : currentScreen === 'LEADERBOARD'
                ? 'LEADERBOARD'
                : currentScreen === 'PROFILE'
                ? 'PROFILE'
                : 'HOME'
            }
            onSelectTab={handleTabSelect}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: 'relative',
    ...Platform.select({
      web: {
        minHeight: '100vh',
      },
    }),
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
