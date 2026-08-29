import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, View } from 'react-native';
import { COLORS } from './src/constants/theme';

import HomeScreen from './src/screens/HomeScreen';
import SoloGameScreen from './src/screens/SoloGameScreen';
import PassPlaySetupScreen from './src/screens/PassPlaySetupScreen';
import PassPlayGameScreen from './src/screens/PassPlayGameScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('HOME');
  const [gameConfig, setGameConfig] = useState({
    category: 'kenyan',
    difficulty: 'medium',
    totalRounds: 5,
    players: [],
    roundsPerPlayer: 3,
  });

  const handleStartSolo = (config) => {
    setGameConfig((prev) => ({
      ...prev,
      ...config,
    }));
    setCurrentScreen('SOLO');
  };

  const handleStartPassPlaySetup = (config) => {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        {currentScreen === 'HOME' && (
          <HomeScreen
            onStartSolo={handleStartSolo}
            onStartPassPlaySetup={handleStartPassPlaySetup}
            onOpenLeaderboard={() => setCurrentScreen('LEADERBOARD')}
          />
        )}

        {currentScreen === 'SOLO' && (
          <SoloGameScreen
            category={gameConfig.category}
            difficulty={gameConfig.difficulty}
            totalRounds={gameConfig.totalRounds}
            playerName={gameConfig.playerName || 'Player 1'}
            avatarEmoji={gameConfig.avatarEmoji || '🦁'}
            avatarColor={gameConfig.avatarColor || '#FF4B4B'}
            onExitGame={() => setCurrentScreen('HOME')}
            onOpenLeaderboard={() => setCurrentScreen('LEADERBOARD')}
          />
        )}

        {currentScreen === 'PASS_PLAY_SETUP' && (
          <PassPlaySetupScreen
            category={gameConfig.category}
            difficulty={gameConfig.difficulty}
            totalRounds={gameConfig.totalRounds}
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
            defaultPlayerName={gameConfig.playerName || 'Player 1'}
            onBack={() => setCurrentScreen('HOME')}
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
  },
});
